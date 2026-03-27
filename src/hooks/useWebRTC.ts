/**
 * useWebRTC — peer-to-peer audio via WebRTC, signaled over Socket.IO.
 *
 * Features:
 *  - Automatic reconnection on ICE disconnect / failure (initiator side)
 *  - Network quality indicator via `networkStatus`
 *  - Local mute / unmute via `isMuted` + `toggleMute()`
 *  - Teacher can force-mute a participant via `muteParticipant(targetUserId)`
 *  - Remote audio rendered through a stable `srcObject` ref (no spurious re-renders)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

export type NetworkStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface UseWebRTCReturn {
  remoteStream: MediaStream | null;
  isVoiceActive: boolean;
  networkStatus: NetworkStatus;
  isMuted: boolean;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  toggleMute: () => void;
  /** Teacher: force-mute a remote participant by their socket user ID */
  muteParticipant: (targetUserId: string) => void;
}

export function useWebRTC(socket: Socket | null, roomId: string | null): UseWebRTCReturn {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Track who initiated the call so reconnect can re-send the offer
  const isInitiatorRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref so async callbacks always see the latest roomId
  const roomIdRef = useRef(roomId);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);

  // ─── ICE state → networkStatus mapping ──────────────────────────────────
  const mapIceState = (state: RTCIceConnectionState): NetworkStatus => {
    switch (state) {
      case 'checking':
        return 'connecting';
      case 'connected':
      case 'completed':
        return 'connected';
      case 'disconnected':
        return 'reconnecting';
      case 'failed':
      case 'closed':
        return 'failed';
      default:
        return 'idle';
    }
  };

  /** Schedule a reconnect attempt (initiator side only). */
  const scheduleReconnect = useCallback(() => {
    if (!isInitiatorRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setNetworkStatus('failed');
      return;
    }

    reconnectTimerRef.current = setTimeout(async () => {
      if (!socket || !roomIdRef.current) return;

      console.log(`[WebRTC] Reconnect attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}`);
      reconnectAttemptsRef.current += 1;
      setNetworkStatus('reconnecting');

      // Tear down the old connection cleanly
      peerRef.current?.close();
      peerRef.current = null;

      // Re-use existing local stream to avoid re-prompting for mic permission
      const stream = localStreamRef.current;
      if (!stream) return;

      const pc = buildPeer();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { roomId: roomIdRef.current, offer });
    }, RECONNECT_DELAY_MS);
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Build a new RTCPeerConnection wired to ICE/track callbacks. */
  const buildPeer = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket && roomIdRef.current) {
        socket.emit('webrtc:ice-candidate', { roomId: roomIdRef.current, candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0] ?? null);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setNetworkStatus(mapIceState(state));

      if (state === 'disconnected' || state === 'failed') {
        scheduleReconnect();
      }

      if (state === 'connected' || state === 'completed') {
        // Successful (re)connect: reset the counter
        reconnectAttemptsRef.current = 0;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      }
    };

    return pc;
  }, [socket, scheduleReconnect]);

  /** Acquire mic, create offer, emit it through the signaling server. */
  const startVoice = useCallback(async () => {
    if (!socket || !roomIdRef.current) return;
    try {
      setNetworkStatus('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      isInitiatorRef.current = true;
      reconnectAttemptsRef.current = 0;

      const pc = buildPeer();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', { roomId: roomIdRef.current, offer });
      setIsVoiceActive(true);
    } catch (err) {
      console.error('[WebRTC] startVoice error:', err);
      setNetworkStatus('failed');
    }
  }, [socket, buildPeer]);

  /** Stop all media and tear down the peer connection. */
  const stopVoice = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current = null;
    isInitiatorRef.current = false;
    reconnectAttemptsRef.current = 0;
    setRemoteStream(null);
    setIsVoiceActive(false);
    setNetworkStatus('idle');
    setIsMuted(false);
  }, []);

  /** Toggle local microphone mute state. */
  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }, []);

  /** Teacher: send a force-mute command to a specific participant. */
  const muteParticipant = useCallback(
    (targetUserId: string) => {
      if (!socket || !roomIdRef.current) return;
      socket.emit('webrtc:force-mute', { roomId: roomIdRef.current, targetUserId });
    },
    [socket],
  );

  // ─── Incoming signaling events ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onOffer = async ({
      offer,
    }: {
      fromUserId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        setNetworkStatus('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        isInitiatorRef.current = false;
        reconnectAttemptsRef.current = 0;

        const pc = buildPeer();
        peerRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (roomIdRef.current) {
          socket.emit('webrtc:answer', { roomId: roomIdRef.current, answer });
        }
        setIsVoiceActive(true);
      } catch (err) {
        console.error('[WebRTC] onOffer error:', err);
        setNetworkStatus('failed');
      }
    };

    const onAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('[WebRTC] onAnswer error:', err);
      }
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC] addIceCandidate error:', err);
      }
    };

    // Force-mute from teacher: mute own mic
    const onForceMute = () => {
      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack && audioTrack.enabled) {
        audioTrack.enabled = false;
        setIsMuted(true);
      }
    };

    socket.on('webrtc:offer', onOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIceCandidate);
    socket.on('webrtc:force-mute', onForceMute);

    return () => {
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIceCandidate);
      socket.off('webrtc:force-mute', onForceMute);
    };
  }, [socket, buildPeer]);

  // Cleanup on unmount
  useEffect(() => () => stopVoice(), [stopVoice]);

  return {
    remoteStream,
    isVoiceActive,
    networkStatus,
    isMuted,
    startVoice,
    stopVoice,
    toggleMute,
    muteParticipant,
  };
}

/**
 * useWebRTC — peer-to-peer audio via WebRTC, signaled over Socket.IO.
 *
 * Caller side:  startVoice() → creates offer → server relays → remote answers
 * Receiver side: auto-handles incoming offer → creates answer → audio flows
 *
 * ICE negotiation uses Google STUN servers (no TURN needed for LAN / tunnels).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface UseWebRTCReturn {
  remoteStream: MediaStream | null;
  isVoiceActive: boolean;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
}

export function useWebRTC(socket: Socket | null, roomId: string | null): UseWebRTCReturn {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep a ref so async callbacks always see the latest roomId
  const roomIdRef = useRef(roomId);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

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

    return pc;
  }, [socket]);

  /** Acquire mic, create offer, emit it through the signaling server. */
  const startVoice = useCallback(async () => {
    if (!socket || !roomIdRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = buildPeer();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', { roomId: roomIdRef.current, offer });
      setIsVoiceActive(true);
    } catch (err) {
      console.error('[WebRTC] startVoice error:', err);
    }
  }, [socket, buildPeer]);

  /** Stop all media and tear down the peer connection. */
  const stopVoice = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current = null;
    setRemoteStream(null);
    setIsVoiceActive(false);
  }, []);

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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

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

    socket.on('webrtc:offer', onOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIceCandidate);

    return () => {
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIceCandidate);
    };
  }, [socket, buildPeer]);

  // Cleanup on unmount
  useEffect(() => () => stopVoice(), [stopVoice]);

  return { remoteStream, isVoiceActive, startVoice, stopVoice };
}

/**
 * useDmCall — direct person-to-person audio call via WebRTC, signaled over Socket.IO.
 *
 * Flow:
 *  Caller:  startCall(targetUserId) → emit call:offer → wait for call:accepted
 *  Callee:  receive call:incoming   → acceptCall() / declineCall()
 *  Either:  hangUp() → emit call:end → both sides cleaned up
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type DmCallState = 'idle' | 'calling' | 'incoming' | 'active';

export interface IncomingCallInfo {
  fromUserId: string;
  fromName: string;
  fromAvatarUrl?: string | null;
  offer: RTCSessionDescriptionInit;
}

export interface UseDmCallReturn {
  callState: DmCallState;
  incomingCall: IncomingCallInfo | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  callDuration: number;
  remoteUserId: string | null;
  isUnavailable: boolean;
  startCall: (targetUserId: string, callerName: string, callerAvatarUrl?: string | null) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
}

export function useDmCall(socket: Socket | null): UseDmCallReturn {
  const [callState, setCallState] = useState<DmCallState>('idle');
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const callStateRef = useRef<DmCallState>('idle');
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync with state for use inside socket callbacks
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const cleanup = useCallback(() => {
    stopDurationTimer();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current = null;
    remoteUserIdRef.current = null;
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    setIsMuted(false);
    setCallDuration(0);
    setRemoteUserId(null);
    setIsUnavailable(false);
  }, [stopDurationTimer]);

  const buildPeer = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket && remoteUserIdRef.current) {
        socket.emit('call:ice-candidate', { targetUserId: remoteUserIdRef.current, candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0] ?? null);
    };

    return pc;
  }, [socket]);

  /** Caller: initiate a call to another user. */
  const startCall = useCallback(async (targetUserId: string, callerName: string, callerAvatarUrl?: string | null) => {
    if (!socket || callStateRef.current !== 'idle') return;

    setIsUnavailable(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      remoteUserIdRef.current = targetUserId;
      setRemoteUserId(targetUserId);
      setCallState('calling');

      const pc = buildPeer();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:offer', { targetUserId, offer, callerName, callerAvatarUrl });
    } catch (err) {
      console.error('[DmCall] startCall error:', err);
      cleanup();
    }
  }, [socket, buildPeer, cleanup]);

  /** Callee: accept the incoming call. */
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      remoteUserIdRef.current = incomingCall.fromUserId;
      setRemoteUserId(incomingCall.fromUserId);

      const pc = buildPeer();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', { targetUserId: incomingCall.fromUserId, answer });

      setCallState('active');
      startDurationTimer();
    } catch (err) {
      console.error('[DmCall] acceptCall error:', err);
      cleanup();
    }
  }, [socket, incomingCall, buildPeer, cleanup, startDurationTimer]);

  /** Callee: decline the incoming call. */
  const declineCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call:decline', { targetUserId: incomingCall.fromUserId });
    setIncomingCall(null);
    setCallState('idle');
  }, [socket, incomingCall]);

  /** Either party: end an active or pending call. */
  const hangUp = useCallback(() => {
    if (socket && remoteUserIdRef.current) {
      socket.emit('call:end', { targetUserId: remoteUserIdRef.current });
    }
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  // ─── Incoming signaling events ────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: IncomingCallInfo) => {
      // Already busy — auto-decline
      if (callStateRef.current !== 'idle') {
        socket.emit('call:decline', { targetUserId: data.fromUserId });
        return;
      }
      setIncomingCall(data);
      setCallState('incoming');
    };

    const onAccepted = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('active');
        startDurationTimer();
      } catch (err) {
        console.error('[DmCall] onAccepted error:', err);
      }
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[DmCall] addIceCandidate error:', err);
      }
    };

    const onDeclined = () => cleanup();
    const onEnded = () => cleanup();
    const onUnavailable = () => {
      cleanup();
      setIsUnavailable(true);
      setTimeout(() => setIsUnavailable(false), 4000);
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:declined', onDeclined);
    socket.on('call:ended', onEnded);
    socket.on('call:unavailable', onUnavailable);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:declined', onDeclined);
      socket.off('call:ended', onEnded);
      socket.off('call:unavailable', onUnavailable);
    };
  }, [socket, cleanup, startDurationTimer]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    incomingCall,
    remoteStream,
    isMuted,
    callDuration,
    remoteUserId,
    isUnavailable,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute,
  };
}

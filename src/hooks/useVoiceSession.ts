import { useMemo, useRef } from 'react';
import type { DmCallState, IncomingCallInfo } from '@/hooks/useDmCall';
import type { NetworkStatus } from '@/hooks/useWebRTC';
import type { VoiceParticipant, VoiceSession, VoiceSessionState } from '@/shared/types/voice';

type ParticipantInput = {
  userId: string | null;
  displayName: string;
  avatarUrl?: string | null;
  isMuted: boolean;
  isActive: boolean;
  isSelf?: boolean;
};

type UseVoiceSessionParams = {
  currentUserId: string | null;
  currentUserName: string;
  currentUserAvatar?: string | null;
  dm: {
    callState: DmCallState;
    incomingCall: IncomingCallInfo | null;
    remoteUserId: string | null;
    remoteName: string;
    remoteAvatar?: string | null;
    isMuted: boolean;
  };
  room: {
    roomId: string | null;
    isVoiceActive: boolean;
    networkStatus: NetworkStatus;
    isMuted: boolean;
  };
};

function toParticipant(input: ParticipantInput): VoiceParticipant | null {
  if (!input.userId) return null;

  return {
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl ?? null,
    isMuted: input.isMuted,
    isActive: input.isActive,
    isSelf: input.isSelf,
  };
}

function mapDmState(callState: DmCallState): VoiceSessionState {
  switch (callState) {
    case 'calling':
      return 'calling';
    case 'incoming':
      return 'ringing';
    case 'active':
      return 'active';
    default:
      return 'idle';
  }
}

function mapRoomState(networkStatus: NetworkStatus, isVoiceActive: boolean): VoiceSessionState {
  if (isVoiceActive) return 'active';
  if (networkStatus === 'connecting' || networkStatus === 'reconnecting') return 'connecting';
  if (networkStatus === 'failed') return 'ended';
  return 'idle';
}

export function useVoiceSession({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  dm,
  room,
}: UseVoiceSessionParams): { session: VoiceSession | null } {
  const startedAtRef = useRef<string | null>(null);

  return useMemo(() => {
    const currentParticipant = toParticipant({
      userId: currentUserId,
      displayName: currentUserName,
      avatarUrl: currentUserAvatar,
      isMuted: dm.callState !== 'idle' ? dm.isMuted : room.isMuted,
      isActive: dm.callState !== 'idle' ? dm.callState === 'active' : room.isVoiceActive,
      isSelf: true,
    });

    if (dm.callState !== 'idle') {
      if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();

      const remoteParticipant = toParticipant({
        userId: dm.remoteUserId ?? dm.incomingCall?.fromUserId ?? 'pending-dm-peer',
        displayName: dm.remoteName || dm.incomingCall?.fromName || 'Собеседник',
        avatarUrl: dm.remoteAvatar ?? dm.incomingCall?.fromAvatarUrl ?? null,
        isMuted: false,
        isActive: dm.callState === 'active',
      });

      return {
        session: {
          sessionId: `dm:${dm.remoteUserId ?? dm.incomingCall?.fromUserId ?? 'pending'}`,
          type: 'dm',
          participants: [currentParticipant, remoteParticipant].filter(Boolean) as VoiceParticipant[],
          state: mapDmState(dm.callState),
          startedBy: dm.callState === 'incoming' ? dm.incomingCall?.fromUserId ?? null : currentUserId,
          startedAt: startedAtRef.current,
          isMuted: dm.isMuted,
          isActive: dm.callState === 'active',
        },
      };
    }

    if (room.roomId && (room.isVoiceActive || room.networkStatus === 'connecting' || room.networkStatus === 'reconnecting')) {
      if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();

      return {
        session: {
          sessionId: room.roomId,
          type: 'class-room',
          participants: currentParticipant ? [currentParticipant] : [],
          state: mapRoomState(room.networkStatus, room.isVoiceActive),
          startedBy: currentUserId,
          startedAt: startedAtRef.current,
          isMuted: room.isMuted,
          isActive: room.isVoiceActive,
        },
      };
    }

    startedAtRef.current = null;
    return { session: null };
  }, [currentUserAvatar, currentUserId, currentUserName, dm, room]);
}

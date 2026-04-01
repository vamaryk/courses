export type VoiceSessionType = 'dm' | 'group' | 'class-room';

export type VoiceSessionState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended';

export interface VoiceParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  isMuted: boolean;
  isActive: boolean;
  isSelf?: boolean;
}

export interface VoiceSession {
  sessionId: string;
  type: VoiceSessionType;
  participants: VoiceParticipant[];
  state: VoiceSessionState;
  startedBy: string | null;
  startedAt: string | null;
  isMuted: boolean;
  isActive: boolean;
}

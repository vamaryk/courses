/**
 * VirtualClassPage — «Виртуальный класс» with friends, DMs, group chats, and room-based chat.
 *
 * Layout:
 *  Left   — ChatSidebar: friend/chat list + "Add friend" / "Create group" buttons
 *  Center — ChatArea: universal component (room chat, DM, or group chat)
 *  Right  — RecentChats: appears when user is in a DM conversation
 */

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  Copy,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSharedSocket } from '@/app/providers/SocketProvider';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useDmCall } from '@/hooks/useDmCall';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { useFriends } from '@/hooks/useFriends';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useGroupChat } from '@/hooks/useGroupChat';
import ChatSidebar from '@/components/virtual-class/ChatSidebar';
import ChatArea from '@/components/virtual-class/ChatArea';
import RecentChats from '@/components/virtual-class/RecentChats';
import AddFriendModal from '@/components/virtual-class/AddFriendModal';
import CreateGroupModal from '@/components/virtual-class/CreateGroupModal';
import ForwardMessageModal, { type ForwardPickDestination } from '@/components/virtual-class/ForwardMessageModal';
import { resolveProfileMediaUrl } from '@/shared/utils/media';
import { getUserDisplayName, getUserInitials } from '@/shared/utils/userDisplay';
import type { ForwardInfo } from '@/hooks/useChat';

const RemoteAudio = memo(function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
});

function CallIdentity({
  name,
  avatar,
  size = 'lg',
  ring = false,
  className = '',
}: {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'lg';
  ring?: boolean;
  className?: string;
}) {
  const boxSize = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-8 w-8 text-xs';

  return (
    <div className={`relative ${className}`}>
      {ring && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
      <div className={`relative flex ${boxSize} items-center justify-center overflow-hidden rounded-full bg-white/20 font-bold text-white`}>
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          getUserInitials(name)
        )}
      </div>
    </div>
  );
}

function CallOverlay({
  accentClassName,
  name,
  avatar,
  subtitle,
  actions,
  pulsing = false,
}: {
  accentClassName: string;
  name: string;
  avatar?: string | null;
  subtitle: ReactNode;
  actions: ReactNode;
  pulsing?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className={`flex flex-col items-center gap-4 px-8 py-10 ${accentClassName}`}>
          <CallIdentity name={name} avatar={avatar} ring={pulsing} />
          <div className="text-center">
            <p className="text-lg font-bold text-white">{name}</p>
            <div className="text-sm text-white/70">{subtitle}</div>
          </div>
        </div>
        <div className="flex gap-4 px-8 py-6">
          {actions}
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'room' | 'dm' | 'group';

export default function VirtualClassPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { socket, userId, isConnected } = useSharedSocket();
  const {
    roomId,
    messages: roomMessages,
    error,
    status,
    isUploadingMedia,
    uploadProgress: roomUploadProgress,
    joinRoom,
    sendMessage: sendRoomMessage,
    sendMedia: sendRoomMedia,
    editMessage: editRoomMessage,
    deleteMessage: deleteRoomMessage,
  } = useChat(socket);
  const { remoteStream, isVoiceActive, networkStatus, isMuted, startVoice, stopVoice, toggleMute } = useWebRTC(socket, roomId);
  const {
    callState,
    incomingCall,
    remoteStream: callRemoteStream,
    isMuted: callIsMuted,
    callDuration,
    isUnavailable,
    remoteUserId,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute: callToggleMute,
  } = useDmCall(socket);
  const { friends, pending, recentChats, refresh, acceptRequest, rejectRequest, updateRecentChat, clearUnread } = useFriends(socket);

  // Stable refs so the DM onMessage callback never reads stale values
  const activeFriendStableRef = useRef<string | null>(null);
  const dbUserIdRef = useRef<string | null>(null);

  const {
    messages: dmMessages,
    loading: dmLoading,
    isUploadingMedia: isUploadingDmMedia,
    uploadProgress: dmUploadProgress,
    sendMessage: sendDm,
    sendMedia: sendDmMedia,
    editMessage: editDmMessage,
    deleteMessage: deleteDmMessage,
    loadHistory: loadDmHistory,
    activeFriendId,
    setActiveFriendId,
    dbUserId,
  } = useDirectMessages(socket, {
    onMessage: (msg) => updateRecentChat(msg, dbUserIdRef.current, activeFriendStableRef.current),
  });
  const {
    groups,
    messages: groupMessages,
    activeGroupId,
    loading: groupLoading,
    isUploadingMedia: isUploadingGroupMedia,
    uploadProgress: groupUploadProgress,
    setActiveGroupId,
    loadHistory: loadGroupHistory,
    sendMessage: sendGroupMsg,
    sendMedia: sendGroupMedia,
    editMessage: editGroupMessage,
    deleteMessage: deleteGroupMessage,
    refreshGroups,
    clearGroupUnread,
  } = useGroupChat(socket);

  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [forwardModalSnapshot, setForwardModalSnapshot] = useState<ForwardInfo | null>(null);
  const [pendingForward, setPendingForward] = useState<ForwardInfo | null>(null);
  const forwardSnapshotRef = useRef<ForwardInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('room');

  const formatCallDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Keep refs in sync so socket callbacks always see current values
  useEffect(() => { activeFriendStableRef.current = activeFriendId; }, [activeFriendId]);
  useEffect(() => { dbUserIdRef.current = dbUserId; }, [dbUserId]);

  // Currently selected friend info
  const activeFriend = friends.find((f) => f.id === activeFriendId)
    || recentChats.find((c) => c.friend_id === activeFriendId);
  const activeFriendName = activeFriend
    ? getUserDisplayName(
        'first_name' in activeFriend ? activeFriend.first_name : '',
        'last_name' in activeFriend ? activeFriend.last_name : '',
      )
    : '';

  const activeFriendAvatarRaw = activeFriend
    ? ('avatar_url' in activeFriend ? activeFriend.avatar_url : null)
    : null;
  const activeFriendAvatar = resolveProfileMediaUrl(activeFriendAvatarRaw);
  const currentUserName = getUserDisplayName(currentUser?.first_name, currentUser?.last_name);
  const currentUserAvatar = resolveProfileMediaUrl(currentUser?.avatar_url ?? null);
  const remoteCallPeer = remoteUserId
    ? friends.find((friend) => friend.id === remoteUserId)
      ?? recentChats.find((chat) => chat.friend_id === remoteUserId)
    : null;
  const callPeerName = remoteCallPeer
    ? getUserDisplayName(
        'first_name' in remoteCallPeer ? remoteCallPeer.first_name : '',
        'last_name' in remoteCallPeer ? remoteCallPeer.last_name : '',
      )
    : incomingCall?.fromName || activeFriendName || 'Звонок';
  const callPeerAvatar = resolveProfileMediaUrl(
    remoteCallPeer
      ? ('avatar_url' in remoteCallPeer ? remoteCallPeer.avatar_url : null)
      : incomingCall?.fromAvatarUrl ?? activeFriendAvatarRaw,
  );
  const { session: voiceSession } = useVoiceSession({
    currentUserId: dbUserId,
    currentUserName,
    currentUserAvatar,
    dm: {
      callState,
      incomingCall,
      remoteUserId,
      remoteName: callPeerName,
      remoteAvatar: callPeerAvatar,
      isMuted: callIsMuted,
    },
    room: {
      roomId,
      isVoiceActive,
      networkStatus,
      isMuted,
    },
  });
  const activeVoicePeer = voiceSession?.participants.find((participant) => !participant.isSelf);
  const activeVoicePeerName = activeVoicePeer?.displayName ?? callPeerName;
  const activeVoicePeerAvatar = resolveProfileMediaUrl(activeVoicePeer?.avatarUrl ?? callPeerAvatar ?? null);

  // Currently selected group info
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const handleSelectFriend = useCallback((friendId: string) => {
    setPendingForward(null);
    setViewMode('dm');
    setActiveGroupId(null);
    setActiveFriendId(friendId);
    loadDmHistory(friendId);
    clearUnread(friendId);
  }, [setActiveFriendId, setActiveGroupId, loadDmHistory, clearUnread]);

  const handleSelectGroup = useCallback((groupId: number) => {
    setPendingForward(null);
    setViewMode('group');
    setActiveFriendId(null);
    setActiveGroupId(groupId);
    loadGroupHistory(groupId);
    clearGroupUnread(groupId);
  }, [setActiveFriendId, setActiveGroupId, loadGroupHistory, clearGroupUnread]);

  // If opened with ?friendId=... from profile page, automatically switch to DM with that user
  useEffect(() => {
    const friendIdFromQuery = searchParams.get('friendId');
    if (!friendIdFromQuery) return;

    const existsInFriends = friends.some((f) => f.id === friendIdFromQuery);
    const existsInRecent = recentChats.some((c) => c.friend_id === friendIdFromQuery);

    if (existsInFriends || existsInRecent) {
      handleSelectFriend(friendIdFromQuery);

      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('friendId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, friends, recentChats, handleSelectFriend, setSearchParams]);

  const handleRoomMode = useCallback(() => {
    setPendingForward(null);
    setViewMode('room');
    setActiveFriendId(null);
    setActiveGroupId(null);
  }, [setActiveFriendId, setActiveGroupId]);

  const handleForwardSnapshot = useCallback((snapshot: ForwardInfo) => {
    setPendingForward(null);
    forwardSnapshotRef.current = snapshot;
    setForwardModalSnapshot(snapshot);
  }, []);

  const handlePickForwardDestination = useCallback(
    (dest: ForwardPickDestination) => {
      const snap = forwardSnapshotRef.current;
      if (!snap) return;
      forwardSnapshotRef.current = null;
      setForwardModalSnapshot(null);
      if (dest.type === 'dm') {
        setViewMode('dm');
        setActiveGroupId(null);
        setActiveFriendId(dest.friendId);
        void loadDmHistory(dest.friendId);
        clearUnread(dest.friendId);
      } else {
        setViewMode('group');
        setActiveFriendId(null);
        setActiveGroupId(dest.groupId);
        void loadGroupHistory(dest.groupId);
        clearGroupUnread(dest.groupId);
      }
      setPendingForward(snap);
    },
    [
      loadDmHistory,
      loadGroupHistory,
      clearUnread,
      clearGroupUnread,
      setActiveFriendId,
      setActiveGroupId,
    ],
  );

  const sendDmComposed = useCallback<typeof sendDm>(
    (text, reply, forward) => {
      sendDm(text, reply, forward);
      if (forward) setPendingForward(null);
    },
    [sendDm],
  );

  const sendGroupComposed = useCallback<typeof sendGroupMsg>(
    (text, reply, forward) => {
      sendGroupMsg(text, reply, forward);
      if (forward) setPendingForward(null);
    },
    [sendGroupMsg],
  );

  const handleCopyId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = () => {
    const id = targetId.trim().toUpperCase();
    if (id) joinRoom(id);
  };

  const isInDm = viewMode === 'dm' && activeFriendId;

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mx-auto mb-5 flex max-w-7xl items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple shadow-sm">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Виртуальный класс</h1>
          <p className="text-xs text-gray-400">Чат, друзья и голосовое общение</p>
        </div>
        <div
          className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}
        >
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? 'Онлайн' : 'Подключение…'}
        </div>
      </div>

      {/* Three-column layout */}
      <div className="mx-auto flex max-w-7xl gap-4" style={{ height: 'calc(100vh - 160px)' }}>

        {/* Left: Chat sidebar */}
        <div className="w-72 shrink-0">
          <ChatSidebar
            friends={friends}
            recentChats={recentChats}
            pending={pending}
            groups={groups}
            activeFriendId={activeFriendId}
            activeGroupId={activeGroupId}
            onSelectFriend={handleSelectFriend}
            onSelectGroup={handleSelectGroup}
            onAddFriendClick={() => setShowAddFriend(true)}
            onCreateGroupClick={() => setShowCreateGroup(true)}
            roomMode={viewMode === 'room'}
            onRoomModeClick={handleRoomMode}
          />
        </div>

        {/* Center: Chat area */}
        <div className="min-w-0 flex-1">
          {viewMode === 'room' && (
            <div className="flex h-full flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Ваш ID</p>
                    <span className="font-mono text-lg font-extrabold tracking-[0.15em] text-purple">
                      {userId ?? '——'}
                    </span>
                  </div>
                  <button onClick={handleCopyId} title="Копировать ID"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {status === 'idle' && (
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                    <input type="text" value={targetId}
                      onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      placeholder="ID пользователя (6 симв.)" maxLength={6}
                      className="flex-1 font-mono text-sm tracking-widest placeholder-gray-300 focus:outline-none" />
                    <button onClick={handleConnect} disabled={!targetId.trim() || !isConnected}
                      className="rounded-xl bg-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple/90 disabled:cursor-not-allowed disabled:opacity-50">
                      Войти
                    </button>
                  </div>
                )}
                {status === 'waiting' && (
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    Ожидаем собеседника… <code className="font-mono font-bold">{roomId}</code>
                  </div>
                )}
              </div>
              {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-xs font-medium text-red-500">{error}</p>}
              <div className="min-h-0 flex-1">
                <ChatArea mode="room" roomId={roomId} messages={roomMessages} currentUserId={userId}
                  isVoiceActive={isVoiceActive} networkStatus={networkStatus}
                  isMuted={isMuted} onStartVoice={startVoice} onStopVoice={stopVoice}
                  onToggleMute={toggleMute}
                  isSendingMedia={isUploadingMedia}
                  mediaUploadProgress={roomUploadProgress}
                  onSend={sendRoomMessage} onSendMedia={sendRoomMedia}
                  onEditMessage={editRoomMessage} onDeleteMessage={deleteRoomMessage}
                  onForwardSnapshot={handleForwardSnapshot}
                  status={status} />
              </div>
            </div>
          )}

          {viewMode === 'dm' && (
            <ChatArea
              mode="direct"
              friendName={activeFriendName}
              friendAvatar={activeFriendAvatar}
              messages={dmMessages}
              currentUserId={dbUserId}
              loading={dmLoading}
              isConnected={isConnected}
              isSendingMedia={isUploadingDmMedia}
              mediaUploadProgress={dmUploadProgress}
              onSend={sendDmComposed}
              onSendMedia={sendDmMedia}
              onEditMessage={editDmMessage}
              onDeleteMessage={deleteDmMessage}
              pendingForward={pendingForward}
              onCancelPendingForward={() => setPendingForward(null)}
              onHeaderClick={() => {
                if (activeFriendId) {
                  navigate(`/profile/${activeFriendId}`);
                }
              }}
              onStartCall={
                activeFriendId
                  ? () => {
                      const callerName = currentUser
                        ? currentUserName
                        : 'Пользователь';
                      void startCall(activeFriendId, callerName, currentUserAvatar);
                    }
                  : undefined
              }
              onForwardSnapshot={handleForwardSnapshot}
            />
          )}

          {viewMode === 'group' && activeGroup && (
            <ChatArea mode="group" groupName={activeGroup.name} memberCount={activeGroup.member_count}
              inviteToken={activeGroup.invite_token} messages={groupMessages} currentUserId={dbUserId}
              loading={groupLoading} isConnected={isConnected} isSendingMedia={isUploadingGroupMedia} mediaUploadProgress={groupUploadProgress} onSend={sendGroupComposed} onSendMedia={sendGroupMedia}
              onEditMessage={editGroupMessage} onDeleteMessage={deleteGroupMessage}
              pendingForward={pendingForward}
              onCancelPendingForward={() => setPendingForward(null)}
              onForwardSnapshot={handleForwardSnapshot} />
          )}
        </div>

        {/* Right: Recent chats (only when in DM) */}
        {isInDm && recentChats.length > 0 && (
          <div className="w-56 shrink-0">
            <RecentChats chats={recentChats} activeFriendId={activeFriendId} onSelect={handleSelectFriend} />
          </div>
        )}
      </div>

      {/* Room WebRTC remote audio */}
      {remoteStream && <RemoteAudio stream={remoteStream} />}

      {/* DM call remote audio */}
      {callRemoteStream && <RemoteAudio stream={callRemoteStream} />}

      {/* ── Incoming call overlay ────────────────────────────────────────── */}
      {callState === 'incoming' && incomingCall && (
        <CallOverlay
          accentClassName="bg-gradient-to-b from-emerald-500 to-emerald-600"
          name={incomingCall.fromName}
          avatar={resolveProfileMediaUrl(incomingCall.fromAvatarUrl ?? null)}
          subtitle="Входящий аудиозвонок…"
          pulsing
          actions={(
            <>
              <button
                onClick={declineCall}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
              >
                <PhoneOff className="h-5 w-5" />
                Отклонить
              </button>
              <button
                onClick={() => void acceptCall()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                <Phone className="h-5 w-5" />
                Принять
              </button>
            </>
          )}
        />
      )}

      {/* ── Outgoing call overlay (caller waiting) ──────────────────────── */}
      {callState === 'calling' && (
        <CallOverlay
          accentClassName="bg-gradient-to-b from-purple to-purple/80"
          name={activeVoicePeerName}
          avatar={activeVoicePeerAvatar}
          subtitle={(
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:0ms]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:150ms]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:300ms]" />
              Вызов…
            </p>
          )}
          actions={(
            <button
              onClick={hangUp}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
            >
              <PhoneOff className="h-5 w-5" />
              Отменить
            </button>
          )}
        />
      )}

      {/* ── Active call floating bar ─────────────────────────────────────── */}
      {callState === 'active' && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-gray-900/95 px-5 py-3 shadow-2xl backdrop-blur">
          <CallIdentity
            name={activeVoicePeerName}
            avatar={activeVoicePeerAvatar}
            size="sm"
            className="shrink-0"
          />
          <div className="text-left">
            <p className="text-xs font-semibold text-white">{activeVoicePeerName}</p>
            <p className="text-[10px] tabular-nums text-emerald-400">{formatCallDuration(callDuration)}</p>
          </div>
          <div className="mx-2 h-6 w-px bg-white/10" />
          <button
            onClick={callToggleMute}
            title={callIsMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              callIsMuted ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {callIsMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button
            onClick={hangUp}
            title="Завершить звонок"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── "User unavailable" toast ─────────────────────────────────────── */}
      {isUnavailable && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-medium text-white shadow-xl">
          Пользователь недоступен для звонка
        </div>
      )}

      <AddFriendModal
        open={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        pending={pending}
        onAccept={async (friendshipId, friendId) => {
          await acceptRequest(friendshipId);
          setShowAddFriend(false);
          handleSelectFriend(friendId);
        }}
        onReject={async (id) => { await rejectRequest(id); }}
        onRequestSent={refresh}
      />

      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        friends={friends}
        onCreated={(groupId) => {
          refreshGroups();
          handleSelectGroup(groupId);
        }}
      />

      {forwardModalSnapshot && (
        <ForwardMessageModal
          open
          snapshot={forwardModalSnapshot}
          onClose={() => {
            forwardSnapshotRef.current = null;
            setForwardModalSnapshot(null);
          }}
          friends={friends}
          recentChats={recentChats}
          groups={groups}
          excludeDmFriendId={viewMode === 'dm' ? activeFriendId : null}
          excludeGroupId={viewMode === 'group' ? activeGroupId : null}
          onPickDestination={handlePickForwardDestination}
        />
      )}
    </div>
  );
}

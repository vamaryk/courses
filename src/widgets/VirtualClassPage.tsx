/**
 * VirtualClassPage — «Виртуальный класс»
 * Fully responsive: mobile, tablet, desktop with proper spacing and layout
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
  X,
  PanelLeft,
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

// ── Remote Audio Component ──────────────────────────────────────────────
const RemoteAudio = memo(function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
});

// ── Call Identity Badge ─────────────────────────────────────────────────
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
  const boxSize = size === 'lg' 
    ? 'h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl' 
    : 'h-8 w-8 text-xs';

  return (
    <div className={`relative ${className}`}>
      {ring && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
      <div className={`relative flex ${boxSize} items-center justify-center overflow-hidden rounded-full bg-white/20 font-bold text-white`}>
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="select-none">{getUserInitials(name)}</span>
        )}
      </div>
    </div>
  );
}

// ── Call Overlay ────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className={`flex flex-col items-center gap-4 px-6 py-8 ${accentClassName}`}>
          <CallIdentity name={name} avatar={avatar} ring={pulsing} />
          <div className="text-center">
            <p className="text-lg font-bold text-white">{name}</p>
            <div className="mt-1 text-sm text-white/80">{subtitle}</div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
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
  
  // Chat hooks
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

  // Stable refs for DM callbacks
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

  // UI State
  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [forwardModalSnapshot, setForwardModalSnapshot] = useState<ForwardInfo | null>(null);
  const [pendingForward, setPendingForward] = useState<ForwardInfo | null>(null);
  const forwardSnapshotRef = useRef<ForwardInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('room');
  
  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const formatCallDuration = useCallback((secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  // Keep refs in sync
  useEffect(() => { activeFriendStableRef.current = activeFriendId; }, [activeFriendId]);
  useEffect(() => { dbUserIdRef.current = dbUserId; }, [dbUserId]);

  // Close mobile sidebar on view change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [viewMode, activeFriendId, activeGroupId]);

  // Active friend info
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

  // Active group info
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  // Handlers
  const handleSelectFriend = useCallback((friendId: string) => {
    setPendingForward(null);
    setViewMode('dm');
    setActiveGroupId(null);
    setActiveFriendId(friendId);
    loadDmHistory(friendId);
    clearUnread(friendId);
    setIsMobileSidebarOpen(false);
  }, [setActiveFriendId, setActiveGroupId, loadDmHistory, clearUnread]);

  const handleSelectGroup = useCallback((groupId: number) => {
    setPendingForward(null);
    setViewMode('group');
    setActiveFriendId(null);
    setActiveGroupId(groupId);
    loadGroupHistory(groupId);
    clearGroupUnread(groupId);
    setIsMobileSidebarOpen(false);
  }, [setActiveFriendId, setActiveGroupId, loadGroupHistory, clearGroupUnread]);

  // Auto-select friend from URL param
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
    setIsMobileSidebarOpen(false);
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
    [loadDmHistory, loadGroupHistory, clearUnread, clearGroupUnread, setActiveFriendId, setActiveGroupId],
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

  const handleCopyId = useCallback(() => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [userId]);

  const handleConnect = useCallback(() => {
    const id = targetId.trim().toUpperCase();
    if (id) joinRoom(id);
  }, [targetId, joinRoom]);

  const isInDm = viewMode === 'dm' && activeFriendId;

  return (
    // 🔧 FIX: overflow-hidden предотвращает растягивание страницы
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6 overflow-x-hidden">
      
      {/* ==================== Page Header ==================== */}
      <div className="mx-auto mb-4 flex max-w-7xl items-center gap-3 sm:mb-5">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-3 text-purple transition-colors active:scale-95 lg:hidden"
          aria-label="Открыть меню"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple shadow-sm sm:h-11 sm:w-11">
          <Users className="h-5 w-5 text-purple" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">Виртуальный класс</h1>
          <p className="hidden text-xs text-gray-400 sm:block">Чат, друзья и голосовое общение</p>
        </div>
        <div
          className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${
            isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {isConnected ? <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
          <span className="hidden sm:inline">{isConnected ? 'Онлайн' : 'Подключение…'}</span>
        </div>
      </div>

      {/* ==================== Main Layout ==================== */}
      {/* 🔧 FIX: Используем dvh для мобильных и правильные ограничения высоты */}
      <div 
        className="mx-auto flex max-w-7xl gap-3 sm:gap-4" 
        style={{ height: 'calc(100dvh - 130px)' }}
      >

        {/* ============ Desktop Left Sidebar ============ */}
        <div className="hidden w-72 shrink-0 lg:block">
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

        {/* ============ Mobile Sidebar Overlay ============ */}
        {isMobileSidebarOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/40 lg:hidden" 
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-full bg-white shadow-xl lg:hidden">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h2 className="text-base font-semibold text-gray-900">Меню</h2>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 active:scale-95"
                    aria-label="Закрыть меню"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ChatSidebar
                    friends={friends}
                    recentChats={recentChats}
                    pending={pending}
                    groups={groups}
                    activeFriendId={activeFriendId}
                    activeGroupId={activeGroupId}
                    onSelectFriend={handleSelectFriend}
                    onSelectGroup={handleSelectGroup}
                    onAddFriendClick={() => { setShowAddFriend(true); setIsMobileSidebarOpen(false); }}
                    onCreateGroupClick={() => { setShowCreateGroup(true); setIsMobileSidebarOpen(false); }}
                    roomMode={viewMode === 'room'}
                    onRoomModeClick={handleRoomMode}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ Center: Chat Area ============ */}
        {/* 🔧 FIX: min-w-0 предотвращает вылезание флекс-детей за границы */}
        <div className="min-w-0 flex-1">
          
          {/* ── ROOM MODE ── */}
          {viewMode === 'room' && (
            <div className="flex h-full flex-col gap-2 sm:gap-4">
              
              {/* 🔧 FIX: flex-wrap + gap для адаптивной панели управления */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                
                {/* User ID Card */}
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm sm:flex-none sm:w-auto sm:px-4 sm:py-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400 sm:text-[10px]">Ваш ID</p>
                    <span className="block font-mono text-sm font-extrabold tracking-[0.1em] text-purple sm:text-lg sm:tracking-[0.15em]">
                      {userId ?? '——'}
                    </span>
                  </div>
                  <button 
                    onClick={handleCopyId} 
                    title="Копировать ID"
                    className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 sm:p-2"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>

                {/* Connect Input */}
                {status === 'idle' && (
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm sm:w-auto sm:flex-none sm:px-4 sm:py-3">
                    <input 
                      type="text" 
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      placeholder="ID (6)" 
                      maxLength={6}
                      className="min-w-0 flex-1 font-mono text-sm tracking-widest placeholder-gray-300 focus:outline-none sm:text-base" 
                    />
                    <button 
                      onClick={handleConnect} 
                      disabled={!targetId.trim() || !isConnected}
                      className="flex-shrink-0 rounded-xl bg-purple px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple/90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                    >
                      Войти
                    </button>
                  </div>
                )}
                
                {/* Waiting Status */}
                {status === 'waiting' && (
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 sm:w-auto sm:flex-none sm:px-4 sm:py-3 sm:text-sm">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    <span className="truncate">Ожидаем… <code className="font-mono font-bold">{roomId}</code></span>
                  </div>
                )}
              </div>
              
              {/* Error Message */}
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-500 sm:px-4 sm:py-2.5">
                  {error}
                </p>
              )}
              
              {/* 🔧 FIX: ChatArea получает правильные ограничения высоты */}
              <div className="min-h-0 flex-1 overflow-hidden">
                <ChatArea 
                  mode="room" 
                  roomId={roomId} 
                  messages={roomMessages} 
                  currentUserId={userId}
                  isVoiceActive={isVoiceActive} 
                  networkStatus={networkStatus}
                  isMuted={isMuted} 
                  onStartVoice={startVoice} 
                  onStopVoice={stopVoice}
                  onToggleMute={toggleMute}
                  isSendingMedia={isUploadingMedia}
                  mediaUploadProgress={roomUploadProgress}
                  onSend={sendRoomMessage} 
                  onSendMedia={sendRoomMedia}
                  onEditMessage={editRoomMessage} 
                  onDeleteMessage={deleteRoomMessage}
                  onForwardSnapshot={handleForwardSnapshot}
                  status={status} 
                />
              </div>
            </div>
          )}

          {/* ── DM MODE ── */}
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
                if (activeFriendId) navigate(`/profile/${activeFriendId}`);
              }}
              onStartCall={
                activeFriendId
                  ? () => {
                      const callerName = currentUser ? currentUserName : 'Пользователь';
                      void startCall(activeFriendId, callerName, currentUserAvatar);
                    }
                  : undefined
              }
              onForwardSnapshot={handleForwardSnapshot}
            />
          )}

          {/* ── GROUP MODE ── */}
          {viewMode === 'group' && activeGroup && (
            <ChatArea 
              mode="group" 
              groupName={activeGroup.name} 
              memberCount={activeGroup.member_count}
              inviteToken={activeGroup.invite_token} 
              messages={groupMessages} 
              currentUserId={dbUserId}
              loading={groupLoading} 
              isConnected={isConnected} 
              isSendingMedia={isUploadingGroupMedia} 
              mediaUploadProgress={groupUploadProgress} 
              onSend={sendGroupComposed} 
              onSendMedia={sendGroupMedia}
              onEditMessage={editGroupMessage} 
              onDeleteMessage={deleteGroupMessage}
              pendingForward={pendingForward}
              onCancelPendingForward={() => setPendingForward(null)}
              onForwardSnapshot={handleForwardSnapshot} 
            />
          )}
        </div>

        {/* ============ Right: Recent Chats (Desktop only) ============ */}
        {isInDm && recentChats.length > 0 && (
          <div className="hidden w-56 shrink-0 xl:block">
            <RecentChats chats={recentChats} activeFriendId={activeFriendId} onSelect={handleSelectFriend} />
          </div>
        )}
      </div>

      {/* ==================== WebRTC Audio ==================== */}
      {remoteStream && <RemoteAudio stream={remoteStream} />}
      {callRemoteStream && <RemoteAudio stream={callRemoteStream} />}

      {/* ==================== Call Overlays ==================== */}
      
      {/* ── Incoming call overlay ── */}
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
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 active:scale-95"
              >
                <PhoneOff className="h-5 w-5" />
                Отклонить
              </button>
              <button
                onClick={() => void acceptCall()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 active:scale-95"
              >
                <Phone className="h-5 w-5" />
                Принять
              </button>
            </>
          )}
        />
      )}

      {/* ── Outgoing call overlay ── */}
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
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 active:scale-95"
            >
              <PhoneOff className="h-5 w-5" />
              Отменить
            </button>
          )}
        />
      )}

      {/* ── Active call floating bar ── */}
      {callState === 'active' && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-gray-900/95 px-4 py-3 shadow-2xl backdrop-blur sm:bottom-6 sm:w-auto sm:px-5">
          <CallIdentity
            name={activeVoicePeerName}
            avatar={activeVoicePeerAvatar}
            size="sm"
            className="shrink-0"
          />
          <div className="min-w-0 text-left">
            <p className="truncate text-xs font-semibold text-white sm:text-sm">{activeVoicePeerName}</p>
            <p className="text-[10px] tabular-nums text-emerald-400">{formatCallDuration(callDuration)}</p>
          </div>
          <div className="mx-2 h-6 w-px bg-white/10" />
          <button
            onClick={callToggleMute}
            title={callIsMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-95 ${
              callIsMuted ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {callIsMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button
            onClick={hangUp}
            title="Завершить звонок"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 active:scale-95"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── "User unavailable" toast ── */}
      {isUnavailable && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-gray-800 px-4 py-3 text-center text-sm font-medium text-white shadow-xl sm:bottom-6 sm:w-auto sm:px-5">
          Пользователь недоступен для звонка
        </div>
      )}

      {/* ==================== Modals ==================== */}
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
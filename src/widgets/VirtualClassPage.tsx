/**
 * VirtualClassPage — «Виртуальный класс» with friends, DMs, group chats, and room-based chat.
 *
 * Layout:
 *  Left   — ChatSidebar: friend/chat list + "Add friend" / "Create group" buttons
 *  Center — ChatArea: universal component (room chat, DM, or group chat)
 *  Right  — RecentChats: appears when user is in a DM conversation
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useFriends } from '@/hooks/useFriends';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useGroupChat } from '@/hooks/useGroupChat';
import ChatSidebar from '@/components/virtual-class/ChatSidebar';
import ChatArea from '@/components/virtual-class/ChatArea';
import RecentChats from '@/components/virtual-class/RecentChats';
import AddFriendModal from '@/components/virtual-class/AddFriendModal';
import CreateGroupModal from '@/components/virtual-class/CreateGroupModal';

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

type ViewMode = 'room' | 'dm' | 'group';

export default function VirtualClassPage() {
  const { socket, userId, isConnected } = useSocket();
  const {
    roomId,
    messages: roomMessages,
    error,
    status,
    joinRoom,
    sendMessage: sendRoomMessage,
    sendMedia: sendRoomMedia,
    editMessage: editRoomMessage,
    deleteMessage: deleteRoomMessage,
  } = useChat(socket);
  const { remoteStream, isVoiceActive, startVoice, stopVoice } = useWebRTC(socket, roomId);
  const { friends, pending, recentChats, refresh, acceptRequest, rejectRequest, updateRecentChat, clearUnread } = useFriends(socket);

  // Stable refs so the DM onMessage callback never reads stale values
  const activeFriendStableRef = useRef<string | null>(null);
  const dbUserIdRef = useRef<string | null>(null);

  const {
    messages: dmMessages,
    loading: dmLoading,
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
  const [viewMode, setViewMode] = useState<ViewMode>('room');

  // Keep refs in sync so socket callbacks always see current values
  useEffect(() => { activeFriendStableRef.current = activeFriendId; }, [activeFriendId]);
  useEffect(() => { dbUserIdRef.current = dbUserId; }, [dbUserId]);

  // Currently selected friend info
  const activeFriend = friends.find((f) => f.id === activeFriendId)
    || recentChats.find((c) => c.friend_id === activeFriendId);
  const activeFriendName = activeFriend
    ? `${('first_name' in activeFriend ? activeFriend.first_name : '')} ${('last_name' in activeFriend ? activeFriend.last_name : '')}`.trim()
    : '';
  const activeFriendAvatar = activeFriend
    ? ('avatar_url' in activeFriend ? activeFriend.avatar_url : null)
    : null;

  // Currently selected group info
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const handleSelectFriend = useCallback((friendId: string) => {
    setViewMode('dm');
    setActiveGroupId(null);
    setActiveFriendId(friendId);
    loadDmHistory(friendId);
    clearUnread(friendId);
  }, [setActiveFriendId, setActiveGroupId, loadDmHistory, clearUnread]);

  const handleSelectGroup = useCallback((groupId: number) => {
    setViewMode('group');
    setActiveFriendId(null);
    setActiveGroupId(groupId);
    loadGroupHistory(groupId);
    clearGroupUnread(groupId);
  }, [setActiveFriendId, setActiveGroupId, loadGroupHistory, clearGroupUnread]);

  const handleRoomMode = useCallback(() => {
    setViewMode('room');
    setActiveFriendId(null);
    setActiveGroupId(null);
  }, [setActiveFriendId, setActiveGroupId]);

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
                  isVoiceActive={isVoiceActive} onStartVoice={startVoice} onStopVoice={stopVoice}
                  onSend={sendRoomMessage} onSendMedia={sendRoomMedia}
                  onEditMessage={editRoomMessage} onDeleteMessage={deleteRoomMessage}
                  status={status} />
              </div>
            </div>
          )}

          {viewMode === 'dm' && (
            <ChatArea mode="direct" friendName={activeFriendName} friendAvatar={activeFriendAvatar}
              messages={dmMessages} currentUserId={dbUserId} loading={dmLoading} onSend={sendDm} onSendMedia={sendDmMedia}
              onEditMessage={editDmMessage} onDeleteMessage={deleteDmMessage} />
          )}

          {viewMode === 'group' && activeGroup && (
            <ChatArea mode="group" groupName={activeGroup.name} memberCount={activeGroup.member_count}
              inviteToken={activeGroup.invite_token} messages={groupMessages} currentUserId={dbUserId}
              loading={groupLoading} onSend={sendGroupMsg} onSendMedia={sendGroupMedia}
              onEditMessage={editGroupMessage} onDeleteMessage={deleteGroupMessage} />
          )}
        </div>

        {/* Right: Recent chats (only when in DM) */}
        {isInDm && recentChats.length > 0 && (
          <div className="w-56 shrink-0">
            <RecentChats chats={recentChats} activeFriendId={activeFriendId} onSelect={handleSelectFriend} />
          </div>
        )}
      </div>

      {remoteStream && <RemoteAudio stream={remoteStream} />}

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
    </div>
  );
}

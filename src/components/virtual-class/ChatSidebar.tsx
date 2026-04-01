import { MessageCircle, Plus, UserPlus, Users, Users2 } from 'lucide-react';
import type { FriendProfile, RecentChat, PendingRequest } from '@/shared/api/friends';
import type { GroupChat } from '@/shared/api/groups';
import { resolveProfileMediaUrl } from '@/shared/utils/media';

interface Props {
  friends: FriendProfile[];
  recentChats: RecentChat[];
  pending: PendingRequest[];
  groups: GroupChat[];
  activeFriendId: string | null;
  activeGroupId: number | null;
  onSelectFriend: (friendId: string) => void;
  onSelectGroup: (groupId: number) => void;
  onAddFriendClick: () => void;
  onCreateGroupClick: () => void;
  roomMode: boolean;
  onRoomModeClick: () => void;
}

export default function ChatSidebar({
  friends,
  recentChats,
  pending,
  groups,
  activeFriendId,
  activeGroupId,
  onSelectFriend,
  onSelectGroup,
  onAddFriendClick,
  onCreateGroupClick,
  roomMode,
  onRoomModeClick,
}: Props) {
  const recentFriendIds = new Set(recentChats.map((c) => c.friend_id));
  const friendsWithoutRecent = friends.filter((f) => !recentFriendIds.has(f.id));

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-800">Чаты</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCreateGroupClick}
            title="Создать беседу"
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
          >
            <Plus className="h-3 w-3" />
            <Users2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onAddFriendClick}
            className="relative flex items-center gap-1.5 rounded-lg bg-purple/10 px-2.5 py-1.5 text-xs font-semibold text-purple transition-colors hover:bg-purple/20"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {pending.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Room chat button */}
      <div className="border-b border-gray-100 px-3 py-2">
        <button
          onClick={onRoomModeClick}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${roomMode ? 'bg-purple/10 text-purple' : 'text-gray-600 hover:bg-gray-50'
            }`}
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${roomMode ? 'bg-purple text-white' : 'bg-gray-100'
            }`}>
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Комната</p>
            <p className="text-xs text-gray-400">Чат по ID</p>
          </div>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Recent chats */}
        {recentChats.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Недавние</p>
            {recentChats.map((chat) => (
              <button
                key={chat.friend_id}
                onClick={() => onSelectFriend(chat.friend_id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${activeFriendId === chat.friend_id && !roomMode && !activeGroupId
                    ? 'bg-purple/10 text-purple'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple overflow-hidden">
                  {resolveProfileMediaUrl(chat.avatar_url) ? (
                    <img
                      src={resolveProfileMediaUrl(chat.avatar_url) as string}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    `${(chat.first_name?.[0] || '').toUpperCase()}${(chat.last_name?.[0] || '').toUpperCase()}`
                  )}
                  {(chat.unread_count ?? 0) > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{chat.first_name} {chat.last_name}</p>
                  <p className="truncate text-xs text-gray-400">{chat.last_message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-gray-300">{formatTime(chat.last_message_at)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Group chats */}
        {groups.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Беседы</p>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${activeGroupId === group.id && !roomMode
                    ? 'bg-purple/10 text-purple'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Users2 className="h-4 w-4 text-blue-600" />
                  {(group.unread_count ?? 0) > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {group.unread_count}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{group.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {group.last_message || `${group.member_count} участников`}
                  </p>
                </div>
                {group.last_message_at && (
                  <span className="shrink-0 text-[10px] text-gray-300">{formatTime(group.last_message_at)}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* All friends */}
        {friendsWithoutRecent.length > 0 && (
          <div>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Друзья</p>
            {friendsWithoutRecent.map((friend) => (
              <button
                key={friend.id}
                onClick={() => onSelectFriend(friend.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${activeFriendId === friend.id && !roomMode && !activeGroupId
                    ? 'bg-purple/10 text-purple'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple overflow-hidden">
                  {resolveProfileMediaUrl(friend.avatar_url) ? (
                    <img
                      src={resolveProfileMediaUrl(friend.avatar_url) as string}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    `${(friend.first_name?.[0] || '').toUpperCase()}${(friend.last_name?.[0] || '').toUpperCase()}`
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{friend.first_name} {friend.last_name}</p>
                  <p className="text-xs text-gray-400">{friend.role === 'teacher' ? 'Преподаватель' : 'Студент'}</p>
                </div>
                <MessageCircle className="h-4 w-4 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {friends.length === 0 && recentChats.length === 0 && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">Пока нет чатов</p>
            <p className="mt-1 text-xs text-gray-300">Добавьте друга или создайте беседу</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'сейчас';
  if (mins < 60) return `${mins}м`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч`;
  return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

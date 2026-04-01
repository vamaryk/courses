import { Clock } from 'lucide-react';
import type { RecentChat } from '@/shared/api/friends';
import { resolveProfileMediaUrl } from '@/shared/utils/media';

interface Props {
  chats: RecentChat[];
  activeFriendId: string | null;
  onSelect: (friendId: string) => void;
}

export default function RecentChats({ chats, activeFriendId, onSelect }: Props) {
  if (chats.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Clock className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-800">Недавние чаты</h3>
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-2">
        {chats.map((chat) => (
          <button
            key={chat.friend_id}
            onClick={() => onSelect(chat.friend_id)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
              activeFriendId === chat.friend_id
                ? 'bg-purple/10'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple overflow-hidden">
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
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-700">
                {chat.first_name} {chat.last_name}
              </p>
              <p className="truncate text-[11px] text-gray-400">{chat.last_message}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

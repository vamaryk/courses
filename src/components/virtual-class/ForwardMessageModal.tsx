import { useEffect, useMemo, useState } from 'react';
import { Forward, Search, Users2, X } from 'lucide-react';
import type { ForwardInfo } from '@/hooks/useChat';
import type { FriendProfile, RecentChat } from '@/shared/api/friends';
import type { GroupChat } from '@/shared/api/groups';
import { resolveProfileMediaUrl } from '@/shared/utils/media';

type FriendRow = { id: string; name: string; avatar: string | null };

export type ForwardPickDestination =
  | { type: 'dm'; friendId: string }
  | { type: 'group'; groupId: number };

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: ForwardInfo;
  friends: FriendProfile[];
  recentChats: RecentChat[];
  groups: GroupChat[];
  excludeDmFriendId?: string | null;
  excludeGroupId?: number | null;
  /** После выбора открывается этот чат; комментарий вводится в поле ввода чата */
  onPickDestination: (dest: ForwardPickDestination) => void;
}

export default function ForwardMessageModal({
  open,
  onClose,
  snapshot,
  friends,
  recentChats,
  groups,
  excludeDmFriendId,
  excludeGroupId,
  onPickDestination,
}: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open, snapshot]);

  const friendRows = useMemo(() => {
    const map = new Map<string, FriendRow>();
    for (const f of friends) {
      map.set(f.id, {
        id: f.id,
        name: `${f.first_name} ${f.last_name}`.trim(),
        avatar: f.avatar_url,
      });
    }
    for (const c of recentChats) {
      if (!map.has(c.friend_id)) {
        map.set(c.friend_id, {
          id: c.friend_id,
          name: `${c.first_name} ${c.last_name}`.trim(),
          avatar: c.avatar_url,
        });
      }
    }
    const list = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.name.toLowerCase().includes(q));
  }, [friends, recentChats, query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, query]);

  const previewSnippet =
    snapshot.text?.trim() || (snapshot.mediaUrl ? 'Медиа' : '');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-modal-title"
        className="flex max-h-[min(560px,90vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100">
              <Forward className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <h2 id="forward-modal-title" className="text-sm font-bold text-gray-900">
                Переслать в чат
              </h2>
              <p className="text-[11px] text-gray-400">Выберите чат — откроется переписка, затем можно добавить текст</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-50 bg-sky-50/50 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Переслано от {snapshot.senderName}</p>
          <p className="mt-1 line-clamp-3 text-xs text-gray-600">{previewSnippet || '—'}</p>
        </div>

        <div className="border-b border-gray-100 px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени или группе…"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Личные сообщения</p>
          {friendRows.length === 0 && (
            <p className="px-2 py-3 text-sm text-gray-400">Нет контактов</p>
          )}
          {friendRows.map((row) => {
            const isCurrent = excludeDmFriendId === row.id;
            return (
              <button
                key={row.id}
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  onPickDestination({ type: 'dm', friendId: row.id });
                  onClose();
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? 'cursor-not-allowed opacity-40'
                    : 'text-gray-700 hover:bg-purple/5'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple/10 text-xs font-semibold text-purple">
                  {resolveProfileMediaUrl(row.avatar) ? (
                    <img src={resolveProfileMediaUrl(row.avatar) as string} alt="" className="h-full w-full object-cover" />
                  ) : (
                    row.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  {isCurrent && <p className="text-[10px] text-gray-400">Это текущий чат</p>}
                </div>
                <Forward className="h-4 w-4 shrink-0 text-gray-300" />
              </button>
            );
          })}

          <p className="mb-1.5 mt-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Группы</p>
          {filteredGroups.length === 0 && (
            <p className="px-2 py-2 text-sm text-gray-400">Нет групп</p>
          )}
          {filteredGroups.map((g) => {
            const isCurrent = excludeGroupId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  onPickDestination({ type: 'group', groupId: g.id });
                  onClose();
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? 'cursor-not-allowed opacity-40'
                    : 'text-gray-700 hover:bg-purple/5'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10">
                  <Users2 className="h-4 w-4 text-purple" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  {isCurrent && <p className="text-[10px] text-gray-400">Это текущий чат</p>}
                </div>
                <Forward className="h-4 w-4 shrink-0 text-gray-300" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

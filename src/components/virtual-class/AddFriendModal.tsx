import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link, Search, UserPlus, X, Clock, UserCheck } from 'lucide-react';
import { friendsApi, type SearchResult } from '@/shared/api/friends';
import type { PendingRequest } from '@/shared/api/friends';
import { resolveProfileMediaUrl } from '@/shared/utils/media';

interface Props {
  open: boolean;
  onClose: () => void;
  pending: PendingRequest[];
  onAccept: (friendshipId: number, friendId: string) => Promise<void>;
  onReject: (friendshipId: number) => Promise<void>;
  onRequestSent: () => void;
}

export default function AddFriendModal({ open, onClose, pending, onAccept, onReject, onRequestSent }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [tab, setTab] = useState<'search' | 'pending'>('search');

  useEffect(() => {
    if (open) {
      friendsApi.getInviteLink().then((token) => {
        setInviteLink(`${window.location.origin}/virtual-class/invite/${token}`);
      }).catch(() => {});
    }
  }, [open]);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const data = await friendsApi.searchUsers(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) handleSearch();
      else setResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSendRequest = async (friendId: string) => {
    try {
      await friendsApi.sendRequest(friendId);
      setResults((prev) =>
        prev.map((r) => (r.id === friendId ? { ...r, friendship_status: 'pending' as const } : r))
      );
      onRequestSent();
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Добавить друга</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'search' ? 'border-b-2 border-purple text-purple' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Поиск
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'pending' ? 'border-b-2 border-purple text-purple' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Заявки{pending.length > 0 && ` (${pending.length})`}
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {tab === 'search' && (
            <>
              {/* Invite link */}
              <div className="mb-4 rounded-xl bg-purple/5 p-3.5">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-purple">
                  <Link className="h-3.5 w-3.5" />
                  Ваша пригласительная ссылка
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-gray-600 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple text-white transition-colors hover:bg-purple/90"
                  >
                    {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по имени и фамилии..."
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                />
              </div>

              {/* Results */}
              {searching && (
                <p className="py-6 text-center text-sm text-gray-400">Поиск...</p>
              )}

              {!searching && results.length === 0 && query.trim().length >= 2 && (
                <p className="py-6 text-center text-sm text-gray-400">Пользователи не найдены</p>
              )}

              <div className="space-y-2">
                {results.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-gray-50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-sm font-semibold text-purple">
                      {resolveProfileMediaUrl(user.avatar_url) ? (
                        <img src={resolveProfileMediaUrl(user.avatar_url) as string} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        `${(user.first_name?.[0] || '').toUpperCase()}${(user.last_name?.[0] || '').toUpperCase()}`
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{user.role === 'teacher' ? 'Преподаватель' : 'Студент'}</p>
                    </div>
                    {user.friendship_status === 'accepted' ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                        <UserCheck className="h-3.5 w-3.5" /> Друг
                      </span>
                    ) : user.friendship_status === 'pending' ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                        <Clock className="h-3.5 w-3.5" /> Отправлено
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        className="flex items-center gap-1 rounded-lg bg-purple/10 px-3 py-1.5 text-xs font-semibold text-purple transition-colors hover:bg-purple/20"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Добавить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'pending' && (
            <div className="space-y-2">
              {pending.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">Нет входящих заявок</p>
              )}
              {pending.map((req) => (
                <div key={req.friendship_id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-gray-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-sm font-semibold text-purple">
                    {resolveProfileMediaUrl(req.avatar_url) ? (
                      <img src={resolveProfileMediaUrl(req.avatar_url) as string} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      `${(req.first_name?.[0] || '').toUpperCase()}${(req.last_name?.[0] || '').toUpperCase()}`
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {req.first_name} {req.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('ru')}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onAccept(req.friendship_id, req.id)}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-200"
                    >
                      Принять
                    </button>
                    <button
                      onClick={() => onReject(req.friendship_id)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

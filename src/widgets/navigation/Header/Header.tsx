import { Path } from '@/shared/routing/path';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Bell, GraduationCap, LogOut, Settings, User, ChevronDown, MessageCircle } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { friendsApi, type PendingRequest } from '@/shared/api/friends';
import { useNotificationCenter, useNotifications } from '@/hooks/useNotifications';
import { useSharedSocket } from '@/app/providers/SocketProvider';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const { notifications } = useNotificationCenter();

  const profileRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);

  const { socket } = useSharedSocket();
  useNotifications(socket);

  useEffect(() => {
    if (isAuthenticated) {
      friendsApi.getPending().then(setPendingRequests).catch(() => {});
    }
  }, [isAuthenticated]);

  const toggleProfile = () => {
    setProfileOpen((p) => { if (!p) setNotifOpen(false); return !p; });
  };
  const toggleNotif = () => {
    setNotifOpen((p) => { if (!p) setProfileOpen(false); return !p; });
    if (!isNotifOpen && isAuthenticated) {
      friendsApi.getPending().then(setPendingRequests).catch(() => {});
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        notifRef.current && !notifRef.current.contains(e.target as Node) &&
        notifBtnRef.current && !notifBtnRef.current.contains(e.target as Node)
      ) setNotifOpen(false);
      if (
        profileRef.current && !profileRef.current.contains(e.target as Node) &&
        profileBtnRef.current && !profileBtnRef.current.contains(e.target as Node)
      ) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAccept = async (friendshipId: number) => {
    try {
      await friendsApi.acceptRequest(friendshipId);
      setPendingRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
    } catch { /* ignore */ }
  };

  const handleReject = async (friendshipId: number) => {
    try {
      await friendsApi.rejectRequest(friendshipId);
      setPendingRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
    } catch { /* ignore */ }
  };

  const initials = user
    ? `${(user.first_name?.[0] || '').toUpperCase()}${(user.last_name?.[0] || '').toUpperCase()}`
    : '';

  const resolveAvatarUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('/profile-media/')) {
      return `${API_URL}${url}`;
    }
    return url;
  };

  return (
    <nav className="bg-header flex fixed top-0 left-0 w-full justify-between items-center h-[4em] px-10 z-100 mb-16">
      <div className="pl-8 lg:pl-0">
        <Link to={Path.Home}>
          <GraduationCap size={24} className="text-purple" />
        </Link>
      </div>

      <div className="flex flex-row items-center gap-3">
        {/* Notifications */}
        {isAuthenticated && (
          <div className="relative">
            <button
              ref={notifBtnRef}
              onClick={toggleNotif}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
            >
              <Bell className="h-[18px] w-[18px]" />
              {pendingRequests.length + notifications.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingRequests.length + notifications.length}
                </span>
              )}
            </button>

            <div
              ref={notifRef}
              className={`absolute right-0 top-12 z-50 w-80 rounded-2xl bg-white shadow-xl border border-gray-100 transition-all duration-150 ${
                isNotifOpen
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-800">Уведомления</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {pendingRequests.length === 0 && notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Bell className="mb-2 h-8 w-8 text-gray-200" />
                    <p className="text-sm text-gray-400">Пока ничего нету :(</p>
                  </div>
                )}

                {pendingRequests.length > 0 && (
                  <div className="p-2 space-y-1 border-b border-gray-100">
                    {pendingRequests.map((req) => (
                      <div key={req.friendship_id} className="flex items-center gap-2.5 rounded-xl p-2.5 hover:bg-gray-50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple">
                          {req.avatar_url ? (
                            <img src={req.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            `${(req.first_name?.[0] || '').toUpperCase()}${(req.last_name?.[0] || '').toUpperCase()}`
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-800">
                            <span className="font-semibold">{req.first_name} {req.last_name}</span>{' '}
                            <span className="text-gray-400">хочет добавить вас в друзья</span>
                          </p>
                          <div className="mt-1.5 flex gap-1.5">
                            <button
                              onClick={() => handleAccept(req.friendship_id)}
                              className="rounded-md bg-purple px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple/90"
                            >
                              Принять
                            </button>
                            <button
                              onClick={() => handleReject(req.friendship_id)}
                              className="rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-200"
                            >
                              Отклонить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {notifications.length > 0 && (
                  <div className="p-2 space-y-1">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-gray-50">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                          {n.type === 'direct_message' ? (
                            <MessageCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Bell className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{n.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Avatar / profile area */}
        <div className="relative flex items-center gap-1.5">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : isAuthenticated && user ? (
            <>
              <Link
                to={Path.Profile}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple overflow-hidden"
              >
                {resolveAvatarUrl(user.avatar_url) ? (
                  <img
                    src={resolveAvatarUrl(user.avatar_url) as string}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || <User className="h-4 w-4" />
                )}
              </Link>

              <div ref={profileBtnRef} onClick={toggleProfile} className="cursor-pointer p-1">
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-150 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </div>

              <div
                ref={profileRef}
                className={`absolute right-0 top-12 z-50 w-48 rounded-2xl bg-white shadow-xl border border-gray-100 p-2 transition-all duration-150 ${
                  isProfileOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="border-b border-gray-100 px-3 py-2 mb-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.first_name} {user.last_name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                </div>
                <Link
                  to={Path.Profile}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <User className="h-4 w-4" /> Профиль
                </Link>
                <Link
                  to={Path.Settings}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" /> Настройки
                </Link>
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Выйти
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <div ref={profileBtnRef} onClick={toggleProfile} className="cursor-pointer p-1">
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-150 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </div>
              <div
                ref={profileRef}
                className={`absolute right-0 top-12 z-50 w-48 rounded-2xl bg-white shadow-xl border border-gray-100 p-2 transition-all duration-150 ${
                  isProfileOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <Link
                  to={Path.Auth}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-purple/90"
                >
                  Войти
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

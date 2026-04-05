'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatsCards from '@/components/dashboard/StatsCards';
import MyCourses from '@/components/dashboard/MyCourses';
import CrCourse from '@/components/dashboard/CrCourses';
import Achievements from '@/components/dashboard/Achievements';
import StatisticsChart from '@/components/dashboard/StatisticsChart';
import TopCourses from '@/components/dashboard/TopCourses';
import ProgressRings from '@/components/dashboard/ProgressRings';
import { SideCalendar } from '@/widgets/calendar/components/SideCalendar';
import { Task } from '@/widgets/calendar/types';
import { calendarApi } from '@/shared/api/calendar';
import { friendsApi, type FriendStatus } from '@/shared/api/friends';
import { Path } from '@/shared/routing/path';
import { resolveProfileMediaUrl } from '@/shared/utils/media';
import type { AuthorDashboard } from '@/shared/api/authorDashboard';

interface UserProfile {
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  phone_number?: string;
  date_of_birth?: string;
  avatar_url?: string | null;
  role: string;
  bio?: string | null;
  address?: string | null;
  occupation?: string | null;
  profile_details_public?: boolean;
  learning_progress_public?: boolean;
}

interface ProfileMedia {
  avatarUrl: string | null;
  bannerUrl: string | null;
}

interface PublicStats {
  hoursOnPlatform: number;
  coursesCompleted: number;
  achievementsCount: number;
  subscriptionsCount: number;
  coursesInProgress: number;
  friendsCount?: number;
}

export default function ProfilePage() {
  const { id: routeProfileId } = useParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [media, setMedia] = useState<ProfileMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(true);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus | null>(null);
  const [friendStatusLoading, setFriendStatusLoading] = useState(false);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [publicStatsLoading, setPublicStatsLoading] = useState(false);
  const [authorDashboard, setAuthorDashboard] = useState<AuthorDashboard | null>(null);
  const [authorDashboardLoading, setAuthorDashboardLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setMedia(null);
        const apiUrl = import.meta.env.VITE_API_URL || '';
        let response: Response;

        if (routeProfileId) {
          response = await fetch(`${apiUrl}/api/users/${routeProfileId}`, {
            credentials: 'include',
          });
        } else {
          response = await fetch(`${apiUrl}/api/auth/me`, {
            credentials: 'include',
          });
        }

        if (!response.ok) {
          if (!routeProfileId) {
            throw new Error('Failed to fetch user profile');
          }
          throw new Error('Failed to fetch profile');
        }

        const profileData: UserProfile = await response.json();
        setUser(profileData);

        if (!routeProfileId) {
          setIsOwnProfile(true);
        } else {
          try {
            const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
              credentials: 'include',
            });
            if (meResponse.ok) {
              const meData: UserProfile = await meResponse.json();
              setIsOwnProfile(meData.id === profileData.id);
            } else {
              setIsOwnProfile(false);
            }
          } catch {
            setIsOwnProfile(false);
          }
        }

        setEditFirstName(profileData.first_name || '');
        setEditLastName(profileData.last_name || '');
        setEditBio(profileData.bio || '');
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (!routeProfileId) {
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, routeProfileId]);

  useEffect(() => {
    const loadFriendStatus = async () => {
      if (!user || isOwnProfile || !user.id) {
        setFriendStatus(null);
        return;
      }

      try {
        setFriendStatusLoading(true);
        const status = await friendsApi.getFriendStatus(user.id);
        setFriendStatus(status);
      } catch (error) {
        console.error('Error fetching friend status:', error);
        setFriendStatus(null);
      } finally {
        setFriendStatusLoading(false);
      }
    };

    void loadFriendStatus();
  }, [user, isOwnProfile]);

  useEffect(() => {
    const fetchProfileMedia = async () => {
      if (!user) return;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const mediaUrl = !routeProfileId || isOwnProfile
          ? `${apiUrl}/api/users/profile/media`
          : `${apiUrl}/api/users/${user.id}/media`;

        const response = await fetch(mediaUrl, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile media');
        }

        const mediaData: ProfileMedia = await response.json();
        setMedia(mediaData);
      } catch (error) {
        console.error('Error fetching profile media:', error);
        setMedia({ avatarUrl: null, bannerUrl: null });
      }
    };

    fetchProfileMedia();
  }, [user, routeProfileId, isOwnProfile]);

  useEffect(() => {
    setAvatarError(false);
    setBannerError(false);
  }, [user?.id, media?.avatarUrl, media?.bannerUrl]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const events = await calendarApi.getEvents();
        const mappedTasks: Task[] = events.map((event) => ({
          id: String(event.id),
          title: event.title,
          description: event.description || '',
          startDate: new Date(event.start_time),
          endDate: new Date(event.end_time),
        }));
        setTasks(mappedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    const loadPublicData = async () => {
      if (!user || isOwnProfile || !user.id) {
        setPublicStats(null);
        setPublicStatsLoading(false);
        return;
      }

      const detailsOk = user.profile_details_public !== false;
      const progressOk = detailsOk && user.learning_progress_public !== false;

      if (!detailsOk) {
        setPublicStats(null);
        setPublicStatsLoading(false);
        return;
      }

      setPublicStatsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';

        if (progressOk) {
          const statsRes = await fetch(`${apiUrl}/api/users/${user.id}/stats`, {
            credentials: 'include',
          });
          if (statsRes.ok) {
            setPublicStats(await statsRes.json());
          } else {
            setPublicStats(null);
          }
        } else {
          setPublicStats(null);
        }
      } catch (error) {
        console.error('Error fetching public profile ', error);
        setPublicStats(null);
      } finally {
        setPublicStatsLoading(false);
      }
    };

    void loadPublicData();
  }, [user, isOwnProfile]);

  useEffect(() => {
    let cancelled = false;
    const loadAuthorDashboard = async () => {
      if (!isOwnProfile || !user) {
        setAuthorDashboard(null);
        setAuthorDashboardLoading(false);
        return;
      }
      setAuthorDashboardLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/courses/my/dashboard`, {
          credentials: 'include',
        });
        if (cancelled) return;
        if (res.ok) {
          setAuthorDashboard(await res.json());
        } else {
          setAuthorDashboard(null);
        }
      } catch {
        if (!cancelled) setAuthorDashboard(null);
      } finally {
        if (!cancelled) setAuthorDashboardLoading(false);
      }
    };
    void loadAuthorDashboard();
    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, user?.id]);

  const refreshFriendStatusSafely = async () => {
    if (!user || isOwnProfile || !user.id) return;
    try {
      const status = await friendsApi.getFriendStatus(user.id);
      setFriendStatus(status);
    } catch (error) {
      console.error('Error refreshing friend status:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!user) return;
    try {
      await friendsApi.sendRequest(user.id);
      await refreshFriendStatusSafely();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendStatus || friendStatus.status !== 'pending' || friendStatus.direction !== 'incoming' || friendStatus.friendshipId == null) {
      return;
    }
    try {
      await friendsApi.acceptRequest(friendStatus.friendshipId);
      await refreshFriendStatusSafely();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!friendStatus || friendStatus.status !== 'pending' || friendStatus.direction !== 'incoming' || friendStatus.friendshipId == null) {
      return;
    }
    try {
      await friendsApi.rejectRequest(friendStatus.friendshipId);
      await refreshFriendStatusSafely();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user) return;
    try {
      await friendsApi.removeFriend(user.id);
      await refreshFriendStatusSafely();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleStartChat = () => {
    if (!user) return;
    navigate(`${Path.VirtualClass}?friendId=${user.id}`);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const apiUrl = import.meta.env.VITE_API_URL || '';

      await fetch(`${apiUrl}/api/users/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editFirstName,
          last_name: editLastName,
          bio: editBio,
        }),
      });

      if (avatarFile || bannerFile) {
        const formData = new FormData();
        if (avatarFile) {
          formData.append('avatar', avatarFile);
        }
        if (bannerFile) {
          formData.append('banner', bannerFile);
        }

        const mediaResponse = await fetch(`${apiUrl}/api/users/profile/media`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (mediaResponse.ok) {
          const mediaJson: ProfileMedia = await mediaResponse.json();
          setMedia((prev) => ({
            avatarUrl: mediaJson.avatarUrl ?? prev?.avatarUrl ?? null,
            bannerUrl: mediaJson.bannerUrl ?? prev?.bannerUrl ?? null,
          }));
        }
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              first_name: editFirstName,
              last_name: editLastName,
              bio: editBio,
            }
          : prev
      );
      setShowEditModal(false);
      setAvatarFile(null);
      setBannerFile(null);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userName = user
    ? `${user.first_name} ${user.last_name}`.trim() || 'Пользователь'
    : 'Пользователь';

  const showPublicDetails = isOwnProfile || user?.profile_details_public !== false;
  const showPublicProgress =
    isOwnProfile || (showPublicDetails && user?.learning_progress_public !== false);

  const initials =
    user && (user.first_name || user.last_name)
      ? `${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}`
          .toUpperCase()
          .trim() || 'П'
      : 'П';

  const avatarUrl = !avatarError
    ? resolveProfileMediaUrl(user?.avatar_url || media?.avatarUrl || null)
    : null;
  const bannerUrl = !bannerError
    ? resolveProfileMediaUrl(media?.bannerUrl || null)
    : null;

  return (
    <div className="bg-background w-full min-w-0 overflow-x-clip">
      <div className="max-w-[1920px] mx-auto w-full flex flex-col min-[1200px]:flex-row">
        <div className="flex-1 min-w-0 mx-3 md:mx-5 mb-5">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* Профильный баннер и аватар + кнопка редактирования */}
            <div className="mb-4 md:mb-10">
              <div className="relative h-full md:h-52">
                {bannerUrl && (
                  <img
                    src={bannerUrl}
                    alt="Баннер профиля"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => setBannerError(true)}
                  />
                )}
                <div
                  className={
                    bannerUrl
                      ? 'absolute inset-0 bg-black/30'
                      : 'absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                  }
                />
                
                {/* Адаптивная шапка: на мобильном — колонка, на десктопе — строка */}
                <div className="relative flex flex-col md:flex-row items-start md:items-end h-full px-4 md:px-6 pb-4 gap-3 md:gap-4 justify-between">
                  
                  {/* Левая часть: аватар + имя */}
                  <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <div className="relative pt-4 mb-2 md:-mb-10 shrink-0">
                      <div className="h-20 w-20 md:h-28 md:w-28 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Аватар пользователя"
                            className="h-full w-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl md:text-2xl font-semibold text-gray-500">
                            {initials}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pb-1 md:pb-2 min-w-0 flex-1 md:flex-none">
                      <p className="text-xs md:text-sm text-white/80 mb-0.5 md:mb-1 break-words">
                        {isOwnProfile ? 'С возвращением,' : 'Профиль пользователя'}
                      </p>
                      <h1 className="text-lg md:text-2xl lg:text-3xl font-semibold text-white font-Xolonium break-words">
                        {userName}
                      </h1>
                    </div>
                  </div>
                  
                  {/* Правая часть: кнопки действий — на мобильном под текстом, на десктопе справа */}
                  <div className="flex flex-wrap gap-2 md:pl-4 w-full md:w-auto md:justify-end pb-2 md:pb-4">
                    {isOwnProfile ? (
                      <button
                        type="button"
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 rounded-lg bg-white/90 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors cursor-pointer w-full md:w-auto"
                      >
                        Редактировать профиль
                      </button>
                    ) : (
                      user && (
                        <>
                          {friendStatusLoading && !friendStatus && (
                            <span className="text-xs text-white/80 w-full text-center md:text-left">Загрузка...</span>
                          )}
                          {friendStatus && friendStatus.status === 'none' && (
                            <button
                              type="button"
                              onClick={handleAddFriend}
                              className="px-4 py-2 rounded-lg bg-white/90 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors cursor-pointer w-full md:w-auto"
                            >
                              Добавить в друзья
                            </button>
                          )}
                          {friendStatus && friendStatus.status === 'pending' && friendStatus.direction === 'outgoing' && (
                            <span className="text-xs text-white/80 w-full text-center md:text-left">
                              Заявка отправлена
                            </span>
                          )}
                          {friendStatus && friendStatus.status === 'pending' && friendStatus.direction === 'incoming' && (
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                              <button
                                type="button"
                                onClick={handleAcceptFriendRequest}
                                className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-600 shadow-sm transition-colors cursor-pointer flex-1 md:flex-none"
                              >
                                Принять заявку
                              </button>
                              <button
                                type="button"
                                onClick={handleRejectFriendRequest}
                                className="px-4 py-2 rounded-lg bg-white/80 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors cursor-pointer flex-1 md:flex-none"
                              >
                                Отклонить
                              </button>
                            </div>
                          )}
                          {friendStatus && friendStatus.status === 'accepted' && (
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                              <button
                                type="button"
                                onClick={handleStartChat}
                                className="px-4 py-2 rounded-lg bg-white/90 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors cursor-pointer flex-1 md:flex-none"
                              >
                                Написать сообщение
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveFriend}
                                className="px-4 py-2 rounded-lg bg-white/80 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors cursor-pointer flex-1 md:flex-none"
                              >
                                Удалить из друзей
                              </button>
                            </div>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Краткое описание профиля под шапкой */}
            {showPublicDetails && user?.bio && (
              <div className="px-4 md:px-5 pb-4">
                <p className="text-sm text-gray-700 break-words">
                  {user.bio}
                </p>
              </div>
            )}

            <div className="px-4 md:px-5 pb-5">
              {isOwnProfile ? (
                <>
                  <StatsCards />
                  <MyCourses profileId={routeProfileId && !isOwnProfile ? routeProfileId : undefined} />
                  <CrCourse
                    profileId={routeProfileId && !isOwnProfile ? routeProfileId : undefined}
                    authorDashboard={authorDashboard}
                    authorDashboardLoading={authorDashboardLoading}
                  />
                  <Achievements />
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <StatisticsChart />
                    <TopCourses
                      authorDashboard={authorDashboard}
                      authorDashboardLoading={authorDashboardLoading}
                    />
                  </div>
                  <ProgressRings />
                </>
              ) : (
                <>
                  {!showPublicDetails && (
                    <div className="px-4 md:px-5 pb-4">
                      <p className="text-sm text-gray-600">
                        Пользователь ограничил отображение профиля. Для остальных видны только имя, фото и баннер.
                      </p>
                    </div>
                  )}
                  {showPublicDetails && user && (
                    <>
                      {showPublicProgress && (
                        <>
                          {(publicStatsLoading || publicStats) && (
                            <StatsCards
                              external
                              externalStats={publicStats}
                              externalLoading={publicStatsLoading && !publicStats}
                              friendsUserId={user.id}
                              friendsDropdownHeading="Друзья"
                            />
                          )}
                          <MyCourses profileId={user.id} />
                        </>
                      )}
                      <CrCourse
                        profileId={user.id}
                        authorDashboard={null}
                        authorDashboardLoading={false}
                      />
                      <Achievements profileUserId={user.id} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Календарь */}
        <aside className="hidden min-[1200px]:block w-[300px] mr-[20px] ml-0 flex-shrink-0">
        <div className="sticky top-[calc(4em+env(safe-area-inset-top,0px))] rounded-xl shadow p-6 h-fit bg-white">
            <SideCalendar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tasks={tasks}
            />
        </div>
        </aside>
      </div>

      {/* Модальное окно редактирования профиля */}
      {isOwnProfile && showEditModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Редактировать профиль
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setAvatarFile(null);
                  setBannerFile(null);
                  if (user) {
                    setEditFirstName(user.first_name || '');
                    setEditLastName(user.last_name || '');
                    setEditBio(user.bio || '');
                  }
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Кратко расскажите о себе, опыте и интересах..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Аватар
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setAvatarFile(file);
                    }}
                    className="block w-full text-sm text-gray-900 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Баннер
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setBannerFile(file);
                    }}
                    className="block w-full text-sm text-gray-900 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setAvatarFile(null);
                  setBannerFile(null);
                  if (user) {
                    setEditFirstName(user.first_name || '');
                    setEditLastName(user.last_name || '');
                    setEditBio(user.bio || '');
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white transition-colors cursor-pointer w-full md:w-auto"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-lg bg-purple text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer w-full md:w-auto"
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
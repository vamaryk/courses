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
}

interface PublicCourse {
  id: number;
  title: string;
  image: string | null;
  progress: number;
  isCompleted: boolean;
}

interface AuthoredCourse {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  is_public: boolean;
  students_count: number;
  created_at: string;
}

interface PublicAchievement {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  unlocked_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

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
  const [publicCourses, setPublicCourses] = useState<PublicCourse[]>([]);
  const [authoredCourses, setAuthoredCourses] = useState<AuthoredCourse[]>([]);
  const [publicAchievements, setPublicAchievements] = useState<PublicAchievement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // При смене профиля сбрасываем медиа, чтобы не мигал баннер другого пользователя
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

        // Собственный профиль, если нет id в урле или совпадает с текущим
        if (!routeProfileId) {
          setIsOwnProfile(true);
        } else {
          // Попробуем получить /auth/me и сравнить id, если возможно
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

  // Friendship status with viewed profile (for foreign profiles)
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

        // Для собственного профиля используем эндпоинт /profile/media,
        // для чужих профилей — отдельный эндпоинт по id
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

  // Сбрасываем ошибки аватара/баннера, когда меняется пользователь или медиа
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

  // Load public view data for foreign profiles
  useEffect(() => {
    const loadPublicData = async () => {
      if (!user || isOwnProfile || !user.id) {
        setPublicStats(null);
        setPublicCourses([]);
        setAuthoredCourses([]);
        setPublicAchievements([]);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const [statsRes, coursesRes, authoredRes, achievementsRes] = await Promise.all([
          fetch(`${apiUrl}/api/users/${user.id}/stats`),
          fetch(`${apiUrl}/api/users/${user.id}/courses`),
          fetch(`${apiUrl}/api/users/${user.id}/courses/authored`),
          fetch(`${apiUrl}/api/users/${user.id}/achievements`),
        ]);

        if (statsRes.ok) {
          setPublicStats(await statsRes.json());
        } else {
          setPublicStats(null);
        }

        if (coursesRes.ok) {
          setPublicCourses(await coursesRes.json());
        } else {
          setPublicCourses([]);
        }

        if (authoredRes.ok) {
          setAuthoredCourses(await authoredRes.json());
        } else {
          setAuthoredCourses([]);
        }

        if (achievementsRes.ok) {
          setPublicAchievements(await achievementsRes.json());
        } else {
          setPublicAchievements([]);
        }
      } catch (error) {
        console.error('Error fetching public profile data:', error);
        setPublicStats(null);
        setPublicCourses([]);
        setAuthoredCourses([]);
        setPublicAchievements([]);
      }
    };

    void loadPublicData();
  }, [user, isOwnProfile]);

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

      // 1. Имя, фамилия, описание
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

      // 2. Аватар и баннер (если выбраны)
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

  const initials =
    user && (user.first_name || user.last_name)
      ? `${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}`
          .toUpperCase()
          .trim() || 'П'
      : 'П';

  const resolveMediaUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('/profile-media/')) {
      return `${API_URL}${url}`;
    }
    return url;
  };

  const avatarUrl = !avatarError
    ? resolveMediaUrl(user?.avatar_url || media?.avatarUrl || null)
    : null;
  const bannerUrl = !bannerError
    ? resolveMediaUrl(media?.bannerUrl || null)
    : null;

  const resolveAchievementIcon = (iconUrl: string | null): string | null => {
    if (!iconUrl) return null;
    if (iconUrl.startsWith('/achievement-media/')) {
      return `${API_URL}${iconUrl}`;
    }
    if (iconUrl.startsWith('/icons/achievements/')) {
      const filename = iconUrl.replace('/icons/achievements/', '');
      return `${API_URL}/achievement-media/${filename}`;
    }
    if (iconUrl.startsWith('http') || iconUrl.startsWith('data:')) {
      return iconUrl;
    }
    return `${API_URL}/achievement-media/${iconUrl}`;
  };

  return (
    <div className="bg-background">
      <div className="flex">
        <main className="flex-1 mx-5 mb-5">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* Профильный баннер и аватар + кнопка редактирования */}
            <div className="mb-6">
              <div className="relative h-40 md:h-52">
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
                <div className="relative flex items-end h-full px-6 pb-4 gap-4 justify-between">
                  <div className="flex items-end gap-4">
                    <div className="relative -mb-10">
                      <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Аватар пользователя"
                            className="h-full w-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-500">
                            {initials}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pb-2">
                      <p className="text-sm text-white/80 mb-1">
                        {isOwnProfile ? 'С возвращением,' : 'Профиль пользователя'}
                      </p>
                      <h1 className="text-2xl md:text-3xl font-semibold text-white font-Xolonium">
                        {userName}
                      </h1>
                    </div>
                  </div>
                  <div className="pb-4 flex gap-2">
                    {isOwnProfile ? (
                      <button
                        type="button"
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 rounded-lg bg-white/90 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors"
                      >
                        Редактировать профиль
                      </button>
                    ) : (
                      user && (
                        <>
                          {friendStatusLoading && !friendStatus && (
                            <span className="text-xs text-white/80">Загрузка...</span>
                          )}
                          {friendStatus && friendStatus.status === 'none' && (
                            <button
                              type="button"
                              onClick={handleAddFriend}
                              className="px-4 py-2 rounded-lg bg-white/90 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors"
                            >
                              Добавить в друзья
                            </button>
                          )}
                          {friendStatus && friendStatus.status === 'pending' && friendStatus.direction === 'outgoing' && (
                            <span className="text-xs text-white/80">
                              Заявка отправлена
                            </span>
                          )}
                          {friendStatus && friendStatus.status === 'pending' && friendStatus.direction === 'incoming' && (
                            <>
                              <button
                                type="button"
                                onClick={handleAcceptFriendRequest}
                                className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-600 shadow-sm transition-colors"
                              >
                                Принять заявку
                              </button>
                              <button
                                type="button"
                                onClick={handleRejectFriendRequest}
                                className="px-4 py-2 rounded-lg bg-white/80 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors"
                              >
                                Отклонить
                              </button>
                            </>
                          )}
                          {friendStatus && friendStatus.status === 'accepted' && (
                            <>
                              <button
                                type="button"
                                onClick={handleStartChat}
                                className="px-4 py-2 rounded-lg bg-white/90 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors"
                              >
                                Написать сообщение
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveFriend}
                                className="px-4 py-2 rounded-lg bg-white/80 text-sm font-medium text-gray-800 hover:bg-white shadow-sm transition-colors"
                              >
                                Удалить из друзей
                              </button>
                            </>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Краткое описание профиля под шапкой */}
            {user?.bio && (
              <div className="px-5 pb-4">
                <p className="text-sm text-gray-700">
                  {user.bio}
                </p>
              </div>
            )}

            <div className="px-5 pb-5">
              {isOwnProfile ? (
                <>
              <StatsCards />
              <MyCourses profileId={routeProfileId && !isOwnProfile ? routeProfileId : undefined} />
              <CrCourse profileId={routeProfileId && !isOwnProfile ? routeProfileId : undefined} />
                  <Achievements />
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <StatisticsChart />
                    <TopCourses />
                  </div>
                  <ProgressRings />
                </>
              ) : (
                <>
                  {/* Public stats for viewed profile */}
                  {publicStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 mb-8">
                      <div className="stat-card flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500">Часов на платформе</span>
                        <span className="text-3xl sm:text-4xl font-bold">
                          {publicStats.hoursOnPlatform}
                        </span>
                      </div>
                      <div className="stat-card flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500">Пройдено курсов</span>
                        <span className="text-3xl sm:text-4xl font-bold">
                          {publicStats.coursesCompleted}
                        </span>
                      </div>
                      <div className="stat-card flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500">Достижения</span>
                        <span className="text-3xl sm:text-4xl font-bold">
                          {publicStats.achievementsCount}
                        </span>
                      </div>
                      <div className="stat-card flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500">Подписок</span>
                        <span className="text-3xl sm:text-4xl font-bold">
                          {publicStats.subscriptionsCount}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Courses in progress / completed */}
                  <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">
                        Курсы, которые проходит пользователь
                      </h2>
                    </div>
                    {publicCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Пользователь пока не записан ни на один курс.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {publicCourses.map((course) => (
                          <div
                            key={course.id}
                            className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm"
                          >
                            <div className="h-24 w-full bg-gray-100" />
                            <div className="p-3">
                              <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
                                {course.title}
                              </p>
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>
                                  {course.isCompleted ? 'Завершён' : 'В процессе'}
                                </span>
                                <span>{course.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 bg-purple rounded-full"
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Authored courses */}
                  <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">
                        Созданные курсы
                      </h2>
                    </div>
                    {authoredCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Пользователь ещё не создавал курсы.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {authoredCourses.map((course) => (
                          <div
                            key={course.id}
                            className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => navigate(`/courses/${course.id}`)}
                          >
                            <div className="h-24 w-full bg-gray-100" />
                            <div className="p-3">
                              <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                                {course.title}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                {course.description}
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-gray-400">
                                <span>
                                  {course.is_public ? 'Публичный курс' : 'Приватный курс'}
                                </span>
                                <span>
                                  {course.students_count} ученик(ов)
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Public achievements */}
                  <section className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">
                        Достижения пользователя
                      </h2>
                    </div>
                    {publicAchievements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        У пользователя пока нет достижений.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {publicAchievements.map((a) => {
                          const iconSrc = resolveAchievementIcon(a.icon_url);
                          return (
                            <div
                              key={a.id}
                              className="flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-muted-foreground/20 rounded-2xl px-4 py-3"
                            >
                              {iconSrc ? (
                                <img
                                  src={iconSrc}
                                  alt={a.name}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {a.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-medium text-foreground leading-tight truncate">
                                  {a.name}
                                </span>
                                {a.description && (
                                  <span className="text-[11px] text-muted-foreground leading-tight mt-1 line-clamp-2">
                                    {a.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Календарь */}
        <aside className="w-[300px] mr-[20px] flex-shrink-0 hidden lg:block">
          <div className="sticky top-[4em] rounded-xl shadow p-6 h-fit bg-white">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
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
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    className="block w-full text-sm text-gray-900 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                    className="block w-full text-sm text-gray-900 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
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
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
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
'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Users, X } from 'lucide-react';
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
import { friendsApi, type FriendStatus, type FriendProfile } from '@/shared/api/friends';
import { Path } from '@/shared/routing/path';
import { getCoverImageUrl } from '@/shared/utils/courseTransform';
import { resolveAchievementMediaUrl, resolveProfileMediaUrl } from '@/shared/utils/media';
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
  rating?: number;
}

interface AuthoredStats {
  total_students: number;
  average_rating: number | null;
}

interface PublicAchievement {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  unlocked_at: string;
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
  const [publicCourses, setPublicCourses] = useState<PublicCourse[]>([]);
  const [authoredCourses, setAuthoredCourses] = useState<AuthoredCourse[]>([]);
  const [authoredStats, setAuthoredStats] = useState<AuthoredStats | null>(null);
  const [authorDashboard, setAuthorDashboard] = useState<AuthorDashboard | null>(null);
  const [authorDashboardLoading, setAuthorDashboardLoading] = useState(true);
  const [publicAchievements, setPublicAchievements] = useState<PublicAchievement[]>([]);
  const [profileFriends, setProfileFriends] = useState<FriendProfile[] | null>(null);
  const [profileFriendsLoading, setProfileFriendsLoading] = useState(false);
  const [friendsBlockOpen, setFriendsBlockOpen] = useState(false);
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
        setPublicCourses([]);
        setAuthoredCourses([]);
        setAuthoredStats(null);
        setPublicAchievements([]);
        return;
      }

      const detailsOk = user.profile_details_public !== false;
      const progressOk = detailsOk && user.learning_progress_public !== false;

      if (!detailsOk) {
        setPublicStats(null);
        setPublicCourses([]);
        setAuthoredCourses([]);
        setAuthoredStats(null);
        setPublicAchievements([]);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';

        let statsRes: Response = { ok: false } as Response;
        let coursesRes: Response = { ok: false } as Response;
        if (progressOk) {
          [statsRes, coursesRes] = await Promise.all([
            fetch(`${apiUrl}/api/users/${user.id}/stats`),
            fetch(`${apiUrl}/api/users/${user.id}/courses`),
          ]);
        }

        const [authoredRes, authoredStatsRes, achievementsRes] = await Promise.all([
          fetch(`${apiUrl}/api/users/${user.id}/courses/authored`),
          fetch(`${apiUrl}/api/users/${user.id}/courses/authored-stats`),
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

        if (authoredStatsRes.ok) {
          setAuthoredStats(await authoredStatsRes.json());
        } else {
          setAuthoredStats(null);
        }

        if (achievementsRes.ok) {
          setPublicAchievements(await achievementsRes.json());
        } else {
          setPublicAchievements([]);
        }
      } catch (error) {
        console.error('Error fetching public profile ', error);
        setPublicStats(null);
        setPublicCourses([]);
        setAuthoredCourses([]);
        setAuthoredStats(null);
        setPublicAchievements([]);
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

  useEffect(() => {
    setProfileFriends(null);
    setFriendsBlockOpen(false);
  }, [user?.id]);

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

  const loadProfileFriends = async () => {
    if (!user?.id) return;
    setProfileFriendsLoading(true);
    try {
      const list = isOwnProfile ? await friendsApi.getFriends() : await friendsApi.getFriendsByUserId(user.id);
      setProfileFriends(list);
    } catch (err) {
      console.error('Error loading profile friends:', err);
      setProfileFriends(null);
    } finally {
      setProfileFriendsLoading(false);
    }
  };

  const handleToggleFriendsBlock = () => {
    const nextOpen = !friendsBlockOpen;
    setFriendsBlockOpen(nextOpen);
    if (nextOpen && profileFriends === null && !profileFriendsLoading) {
      loadProfileFriends();
    }
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
    <div className="bg-background">
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1 mx-3 md:mx-5 mb-5">
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
                  {showPublicDetails && showPublicProgress && publicStats && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 mb-8">
                    <div className="stat-card rounded-xl flex flex-col gap-2">
                    <span className="text-xs text-white/60 font-medium min-h-[32px] line-clamp-2">
                        Часов на платформе
                    </span>
                    <span className="text-xl sm:text-2xl font-bold">
                        {publicStats.hoursOnPlatform}
                    </span>
                    </div>
                    <div className="stat-card rounded-xl flex flex-col gap-2">
                    <span className="text-xs text-white/60 font-medium min-h-[32px] line-clamp-2">
                        Пройдено курсов
                    </span>
                    <span className="text-xl sm:text-2xl font-bold">
                        {publicStats.coursesCompleted}
                    </span>
                    </div>
                    <div className="stat-card rounded-xl flex flex-col gap-2">
                    <span className="text-xs text-white/60 font-medium min-h-[32px] line-clamp-2">
                        Достижения
                    </span>
                    <span className="text-xl sm:text-2xl font-bold">
                        {publicStats.achievementsCount}
                    </span>
                    </div>
                    {(publicStats.friendsCount ?? 0) > 0 && (
                    <div className="stat-card rounded-xl flex flex-col gap-2 relative">
                    <div className="flex items-start gap-2 text-white/60">
                      <Users className="w-4 h-4 flex-shrink-0 mt-[2px]" />
                      <span className="text-xs font-medium min-h-[32px] line-clamp-2 leading-tight">Друзей</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xl sm:text-2xl font-bold">{publicStats.friendsCount ?? 0}</span>
                      {(publicStats.friendsCount ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleFriendsBlock}
                        className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
                        aria-label="Показать друзей"
                      >
                        {friendsBlockOpen ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      )}
                    </div>
                    {(publicStats.friendsCount ?? 0) > 0 && friendsBlockOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg z-50 border border-gray-200 overflow-hidden min-w-[240px]">
                        <div className="p-3 border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-700">Друзья ({profileFriends?.length ?? 0})</h4>
                        </div>
                        <div className="max-h-96 overflow-y-auto p-2">
                          {profileFriendsLoading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Загрузка...</div>
                          ) : profileFriends && profileFriends.length > 0 ? (
                            <div className="space-y-2">
                              {profileFriends.map((friend) => {
                                const avatarSrc = resolveProfileMediaUrl(friend.avatar_url);
                                return (
                                  <button
                                    key={friend.id}
                                    type="button"
                                    onClick={() => { setFriendsBlockOpen(false); navigate(`/profile/${friend.id}`); }}
                                    className="w-full flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-left hover:bg-gray-100 transition-colors cursor-pointer"
                                  >
                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                                      {avatarSrc ? (
                                        <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-500">
                                          {(friend.first_name?.charAt(0) || '') + (friend.last_name?.charAt(0) || '') || '?'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 truncate">{friend.first_name} {friend.last_name}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">Нет друзей</div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                    )}
                </div>
                )}

                  {showPublicDetails && showPublicProgress && (
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publicCourses.map((course) => {
                          const coverUrl = getCoverImageUrl(course.image);
                          return (
                            <div
                              key={course.id}
                              role="link"
                              tabIndex={0}
                              onClick={() => navigate(`/courses/${course.id}`)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigate(`/courses/${course.id}`);
                                }
                              }}
                              className="group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-soft-xl transition-all duration-300 cursor-pointer"
                            >
                              <div className="relative h-44 overflow-hidden">
                                {coverUrl ? (
                                  <img
                                    src={coverUrl}
                                    alt={course.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-muted" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                                <h3 className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-primary-foreground leading-tight">
                                  {course.title}
                                </h3>
                              </div>
                              <div className="p-4">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                  <span>
                                    {course.isCompleted ? 'Завершён' : 'В процессе'}
                                  </span>
                                  <span>{course.progress}%</span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-1.5 bg-primary rounded-full transition-all"
                                    style={{ width: `${course.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                  )}

                  {showPublicDetails && (
                  <>
                  <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">
                        Созданные курсы
                      </h2>
                    </div>
                    {authoredStats && (
                      <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                        <span>
                          Всего студентов:{' '}
                          <span className="font-semibold text-foreground">{authoredStats.total_students}</span>
                        </span>
                        <span>
                          Средний рейтинг:{' '}
                          <span className="font-semibold text-foreground">
                            {authoredStats.average_rating != null ? authoredStats.average_rating.toFixed(2) : '—'}
                          </span>
                        </span>
                      </div>
                    )}
                    {authoredCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Пользователь ещё не создавал курсы.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {authoredCourses.map((course) => {
                          const coverUrl = getCoverImageUrl(course.cover_image);
                          return (
                            <div
                              key={course.id}
                              onClick={() => navigate(`/courses/${course.id}`)}
                              className="group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-soft-xl transition-all duration-300 cursor-pointer"
                            >
                              <div className="relative h-44 overflow-hidden">
                                {coverUrl ? (
                                  <img
                                    src={coverUrl}
                                    alt={course.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-muted" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                                <h3 className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-primary-foreground leading-tight">
                                  {course.title}
                                </h3>
                              </div>
                              <div className="p-4">
                                {course.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 break-words">
                                    {course.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                                  <span>
                                    {course.is_public ? 'Публичный курс' : 'Приватный курс'}
                                  </span>
                                  <span>
                                    {course.students_count} ученик(ов)
                                    {course.rating != null && Number(course.rating) > 0 && (
                                      <> · рейтинг {Number(course.rating).toFixed(1)}</>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

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
                          const iconSrc = resolveAchievementMediaUrl(a.icon_url);
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
                </>
              )}
            </div>
          </div>
        </main>

        {/* Календарь */}
        <aside className="hidden min-[1200px]:block w-[300px] mr-[20px] ml-0 flex-shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Clock, BookOpen, Trophy, Users, X } from "lucide-react";
import { friendsApi, type FriendProfile } from "@/shared/api/friends";
import { resolveProfileMediaUrl } from "@/shared/utils/media";

const API_URL = import.meta.env.VITE_API_URL || '';

interface StatsData {
  hoursOnPlatform: number;
  coursesCompleted: number;
  achievementsCount: number;
  subscriptionsCount: number;
  friendsCount?: number;
}

export interface StatsCardsProps {
  /** Режим просмотра чужого профиля: данные приходят снаружи */
  external?: boolean;
  externalStats?: StatsData | null;
  externalLoading?: boolean;
  /** Загрузка списка друзей для выпадающего списка (иначе — текущий пользователь) */
  friendsUserId?: string;
  friendsDropdownHeading?: string;
}

const StatsCards = ({
  external = false,
  externalStats = null,
  externalLoading = false,
  friendsUserId,
  friendsDropdownHeading = "Мои друзья",
}: StatsCardsProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData>({
    hoursOnPlatform: 0,
    coursesCompleted: 0,
    achievementsCount: 0,
    subscriptionsCount: 0,
    friendsCount: 0
  });
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(!external);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);

  useEffect(() => {
    if (external) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/profile/stats`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [external]);

  const displayStats: StatsData = external
    ? {
        hoursOnPlatform: externalStats?.hoursOnPlatform ?? 0,
        coursesCompleted: externalStats?.coursesCompleted ?? 0,
        achievementsCount: externalStats?.achievementsCount ?? 0,
        subscriptionsCount: externalStats?.subscriptionsCount ?? 0,
        friendsCount: externalStats?.friendsCount ?? externalStats?.subscriptionsCount ?? 0,
      }
    : stats;

  const statsLoading = external ? Boolean(externalLoading) : loading;

  useEffect(() => {
    setFriends([]);
    setShowFriendsMenu(false);
  }, [friendsUserId]);

  const fetchFriends = async () => {
    if (friends.length > 0 || loadingFriends) return;
    setLoadingFriends(true);
    try {
      const list = friendsUserId
        ? await friendsApi.getFriendsByUserId(friendsUserId)
        : await friendsApi.getFriends();
      setFriends(list);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const statsConfig = [
    { 
      icon: Clock, 
      label: "Часов на платформе", 
      value: displayStats.hoursOnPlatform.toString(),
      hasDropdown: false
    },
    { 
      icon: BookOpen, 
      label: "Пройдено курсов", 
      value: displayStats.coursesCompleted.toString(),
      hasDropdown: false
    },
    { 
      icon: Trophy, 
      label: "Достижения", 
      value: displayStats.achievementsCount.toString(),
      hasDropdown: false
    },
    { 
      icon: Users, 
      label: "Друзья", 
      value: (displayStats.friendsCount ?? displayStats.subscriptionsCount ?? 0).toString(),
      hasDropdown: true
    },
  ];

  const toggleFriendsMenu = () => {
    if (!showFriendsMenu) {
      void fetchFriends();
    }
    setShowFriendsMenu(!showFriendsMenu);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 mb-8">
      {statsConfig.map((stat, index) => (
        <div
          key={index}
          className={`stat-card rounded-xl flex flex-col gap-2 animate-fade-in ${
            stat.hasDropdown ? 'relative' : ''
          }`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Заголовок: иконка по первой строке текста */}
          <div className="flex items-start gap-2 text-white/60">
            <stat.icon className="w-4 h-4 flex-shrink-0 mt-[2px]" />
            <span className="text-xs font-medium min-h-[32px] line-clamp-2 leading-tight">
              {stat.label}
            </span>
          </div>
          
          {/* Число с кнопкой (если есть) */}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xl sm:text-2xl font-bold">
              {statsLoading ? '...' : stat.value}
            </span>
            {stat.hasDropdown && (
              <button 
                onClick={toggleFriendsMenu}
                className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label="Показать друзей"
              >
                {showFriendsMenu ? (
                  <X className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Выпадающий список друзей */}
          {stat.hasDropdown && showFriendsMenu && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-lg z-50 border border-gray-200 overflow-hidden animate-fade-in">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 text-center">
                  {friendsDropdownHeading} ({friends.length})
                </h4>
              </div>
              <div className="max-h-96 overflow-y-auto p-2 bg-white">
                {loadingFriends ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Загрузка...
                  </div>
                ) : friends.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Нет друзей
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => {
                      const avatarSrc = resolveProfileMediaUrl(friend.avatar_url);
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => {
                            setShowFriendsMenu(false);
                            navigate(`/profile/${friend.id}`);
                          }}
                          className="w-full flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2 text-left hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                            {avatarSrc ? (
                              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-500">
                                {(friend.first_name?.charAt(0) || '') + (friend.last_name?.charAt(0) || '') || '?'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {friend.first_name} {friend.last_name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
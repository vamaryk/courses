import { useState, useEffect } from "react";
import { ChevronDown, Clock, BookOpen, Trophy, Users, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface StatsData {
  hoursOnPlatform: number;
  coursesCompleted: number;
  achievementsCount: number;
  subscriptionsCount: number;
}

interface Subscription {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
}

const StatsCards = () => {
  const [stats, setStats] = useState<StatsData>({
    hoursOnPlatform: 0,
    coursesCompleted: 0,
    achievementsCount: 0,
    subscriptionsCount: 0
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);

  useEffect(() => {
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
  }, []);

  const fetchSubscriptions = async () => {
    if (subscriptions.length === 0 && !loadingSubscriptions) {
      setLoadingSubscriptions(true);
      try {
        const response = await fetch(`${API_URL}/api/users/profile/subscriptions`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoadingSubscriptions(false);
      }
    }
  };

  const statsConfig = [
    { 
      icon: Clock, 
      label: "Часов на платформе", 
      value: stats.hoursOnPlatform.toString(),
      hasDropdown: false
    },
    { 
      icon: BookOpen, 
      label: "Пройдено курсов", 
      value: stats.coursesCompleted.toString(),
      hasDropdown: false
    },
    { 
      icon: Trophy, 
      label: "Достижения", 
      value: stats.achievementsCount.toString(),
      hasDropdown: false
    },
    { 
      icon: Users, 
      label: "Подписки", 
      value: stats.subscriptionsCount.toString(),
      hasDropdown: true
    },
  ];

  const toggleSubscriptions = () => {
    if (!showSubscriptions) {
      fetchSubscriptions();
    }
    setShowSubscriptions(!showSubscriptions);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 mb-8">
      {statsConfig.map((stat, index) => (
        <div
          key={index}
          className={`stat-card flex flex-col gap-2 animate-fade-in ${
            stat.hasDropdown ? 'relative' : ''
          }`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center gap-2 text-white/60">
            <stat.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">{stat.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-3xl sm:text-4xl font-bold">
              {loading ? '...' : stat.value}
            </span>
            {stat.hasDropdown && (
              <button 
                onClick={toggleSubscriptions}
                className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Показать подписки"
              >
                {showSubscriptions ? (
                  <X className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Выпадающий список подписок */}
          {stat.hasDropdown && showSubscriptions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-50 border border-gray-200 animate-fade-in">
              <div className="p-3 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700">
                  Мои подписки ({subscriptions.length})
                </h4>
              </div>
              <div 
                className="max-h-96 overflow-y-auto"
                style={{ maxHeight: '400px' }}
              >
                {loadingSubscriptions ? (
                  <div className="p-4 text-center text-gray-500">
                    Загрузка...
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Нет подписок
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {subscriptions.map((subscription) => (
                      <div
                        key={subscription.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                          {subscription.user.avatar ? (
                            <img
                              src={subscription.user.avatar}
                              alt={subscription.user.first_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-background flex items-center justify-center">
                              <span className="text-gray-500 font-medium text-sm">
                                {subscription.user.first_name.charAt(0)}
                                {subscription.user.last_name?.charAt(0) || ''}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {subscription.user.first_name} {subscription.user.last_name || ''}
                          </p>
                        </div>
                      </div>
                    ))}
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
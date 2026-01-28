import { useState, useEffect } from "react";
import { ChevronDown, Clock, BookOpen, Trophy, Users } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface StatsData {
  hoursOnPlatform: number;
  coursesCompleted: number;
  achievementsCount: number;
  subscriptionsCount: number;
}

const StatsCards = () => {
  const [stats, setStats] = useState<StatsData>({
    hoursOnPlatform: 0,
    coursesCompleted: 0,
    achievementsCount: 0,
    subscriptionsCount: 0
  });
  const [loading, setLoading] = useState(true);

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

  const statsConfig = [
    { icon: Clock, label: "Часов на платформе", value: stats.hoursOnPlatform.toString() },
    { icon: BookOpen, label: "Пройдено курсов", value: stats.coursesCompleted.toString() },
    { icon: Trophy, label: "Достижения", value: stats.achievementsCount.toString() },
    { icon: Users, label: "Подписки", value: stats.subscriptionsCount.toString() },
  ];

  return (
    <div className="flex gap-3 mb-8">
      {statsConfig.map((stat, index) => (
        <div
          key={index}
          className="stat-card flex-1 flex flex-col gap-2 animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center gap-2 text-white/60">
            <stat.icon className="w-4 h-4" />
            <span className="text-xs">{stat.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold">
              {loading ? '...' : stat.value}
            </span>
            <button className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

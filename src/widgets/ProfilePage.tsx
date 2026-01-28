'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '@/components/dashboard/TopNav';
import StatsCards from '@/components/dashboard/StatsCards';
import MyCourses from '@/components/dashboard/MyCourses';
import Achievements from '@/components/dashboard/Achievements';
import StatisticsChart from '@/components/dashboard/StatisticsChart';
import TopCourses from '@/components/dashboard/TopCourses';
import ProgressRings from '@/components/dashboard/ProgressRings';
import CalendarWidget from '@/components/dashboard/CalendarWidget';

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  phone_number?: string;
  date_of_birth?: string;
  role: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData: UserProfile = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex">
        {/* Center Content */}
        <main className="flex-1 p-8 pr-4">
          <TopNav userName={userName} />
          <StatsCards />
          <MyCourses />
          <Achievements />

          {/* Statistics Row */}
          <div className="flex gap-4 mb-8">
            <StatisticsChart />
            <TopCourses />
          </div>

          <ProgressRings />
        </main>

        {/* Right Sidebar */}
        <div className="p-8 pl-4">
          <CalendarWidget />
        </div>
      </div>
    </div>
  );
}

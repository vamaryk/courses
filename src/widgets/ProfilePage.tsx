'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '@/components/dashboard/TopNav';
import StatsCards from '@/components/dashboard/StatsCards';
import MyCourses from '@/components/dashboard/MyCourses';
import CrCourse from '@/components/dashboard/CrCourses';
import Achievements from '@/components/dashboard/Achievements';
import StatisticsChart from '@/components/dashboard/StatisticsChart';
import TopCourses from '@/components/dashboard/TopCourses';
import ProgressRings from '@/components/dashboard/ProgressRings';
import { SideCalendar } from '@/widgets/calendar/components/SideCalendar';
import { Task } from '@/widgets/calendar/types';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
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

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${apiUrl}/api/tasks`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setTasks(data);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, []);

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
    <div className="bg-background">
      <div className="flex">
        <main className="flex-1 mx-5 mb-5">
          <div className="bg-white rounded-xl shadow p-5">
            <TopNav userName={userName} />
            <StatsCards />
            <MyCourses />
            <CrCourse />
            <Achievements />

            {/* Statistics Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <StatisticsChart />
              <TopCourses />
            </div>

            <ProgressRings />
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
    </div>
  );
}
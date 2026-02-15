'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, User, Edit, Award, BookOpen, Clock } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    patronymic?: string;
    phone_number?: string;
    date_of_birth?: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const achievements = [
    { id: 1, title: 'Первый курс', description: 'Завершен первый курс', icon: Award },
    { id: 2, title: 'Отличник', description: 'Средний балл выше 90%', icon: Award },
    { id: 3, title: 'Марафонец', description: 'Изучено 30+ часов материала', icon: Clock },
  ];

  const stats = [
    { label: 'Завершенных курсов', value: '12', icon: BookOpen },
    { label: 'Общее время обучения', value: '156ч', icon: Clock },
    { label: 'Сертификатов', value: '8', icon: Award },
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log('🔄 [PROFILE] Fetching user profile...');

        // Use the same API URL as auth page
        const apiUrl = import.meta.env.VITE_API_URL || '/api';

        // Direct request to auth/me without test
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });

        console.log('📡 [PROFILE] Response status:', response.status);
        console.log('📡 [PROFILE] Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          console.error('❌ [PROFILE] Response not ok:', response.status, response.statusText);
          const text = await response.text();
          console.error('❌ [PROFILE] Response body:', text);
          throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();
        console.log('✅ [PROFILE] User data received:', userData);
        setUser(userData);
      } catch (error) {
        console.error('❌ [PROFILE] Error fetching user profile:', error);
        // Redirect to login if not authenticated
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        navigate('/auth');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // or redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header аналогично календарю */}
      <header className="h-16 flex items-center justify-between px-[40px] z-[10] bg-gray-50/90 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold font-xolonium">LOGO</div>
        </div>
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <div className="relative group">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium cursor-pointer">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-10 hidden group-hover:block">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                {user.first_name} {user.last_name}
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 min-w-0 md:ml-[120px] px-[20px] md:px-0 mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
              <div className="rounded-xl shadow p-6" style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center">
                    <button 
                      onClick={() => navigate('/')}
                      className="flex items-center text-gray-600 text-[12px] font-montserrat hover:text-gray-900 mr-4"
                    >
                      ← На главную
                    </button>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors">
                    <Edit className="w-4 h-4" />
                    Редактировать
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <h1 className="text-[24px] font-xolonium">{user.first_name} {user.last_name}</h1>
                  <User className="w-5 h-5 text-gray-500" />
                </div>

                <div className="bg-white/70 rounded-lg p-8 mb-8">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold mb-2">
                        {user.first_name} {user.last_name} {user.patronymic || ''}
                      </h2>
                      <p className="text-gray-600 mb-2">Студент</p>
                      <p className="text-gray-500 text-sm">Активный пользователь</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <div key={index} className="text-center">
                          <Icon className="w-8 h-8 text-[#B291FF] mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                          <div className="text-sm text-gray-600">{stat.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/70 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Достижения
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement) => {
                      const Icon = achievement.icon;
                      return (
                        <div key={achievement.id} className="bg-white/50 rounded-lg p-4 hover:bg-white/70 transition-colors">
                          <Icon className="w-8 h-8 text-[#B291FF] mb-3" />
                          <h4 className="font-semibold mb-1">{achievement.title}</h4>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

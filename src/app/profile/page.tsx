import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Calendar as CalendarIcon, LogOut, Edit, Save, X } from 'lucide-react';

// Define the user type
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
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData: UserProfile = await response.json();
        setUser(userData);
        setFormData(userData);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleLogout = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/auth');
        router.refresh();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUserData = await response.json();
      setUser(updatedUserData.user);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating profile:', err);
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
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Профиль пользователя</h1>
                <p className="mt-1 text-sm text-gray-500">Просмотр и редактирование личных данных</p>
              </div>
              <div className="flex items-center space-x-4">
                {isEditing ? (
                  <>
                    <button
                      type="submit"
                      form="profile-form"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(user); // Reset changes
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Отмена
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Ошибка!</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            <div className="mt-8 border-t border-gray-200 pt-8">
              <form id="profile-form" onSubmit={handleSave}>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Личная информация</h3>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      {isEditing ? (
                        <>
                          <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">Имя</label>
                            <input type="text" name="first_name" id="first_name" value={formData.first_name || ''} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                          </div>
                          <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Фамилия</label>
                            <input type="text" name="last_name" id="last_name" value={formData.last_name || ''} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                          </div>
                          <div>
                            <label htmlFor="patronymic" className="block text-sm font-medium text-gray-700">Отчество</label>
                            <input type="text" name="patronymic" id="patronymic" value={formData.patronymic || ''} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                          </div>
                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" name="email" id="email" value={formData.email || ''} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                          </div>
                          <div>
                            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Телефон</label>
                            <input type="tel" name="phone_number" id="phone_number" value={formData.phone_number || ''} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                          </div>
                          <div>
                            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Дата рождения</label>
                            <input type="date" name="date_of_birth" id="date_of_birth" value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500 flex items-center"><User className="h-4 w-4 mr-2 text-gray-400" />Имя</dt>
                            <dd className="mt-1 text-sm text-gray-900">{user.first_name} {user.last_name} {user.patronymic}</dd>
                          </div>
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500 flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-400" />Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                          </div>
                          {user.phone_number && <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500 flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-400" />Телефон</dt><dd className="mt-1 text-sm text-gray-900">{user.phone_number}</dd></div>}
                          {user.date_of_birth && <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500 flex items-center"><CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />Дата рождения</dt><dd className="mt-1 text-sm text-gray-900">{new Date(user.date_of_birth).toLocaleDateString('ru-RU')}</dd></div>}
                        </>
                      )}
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Роль</dt>
                        <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role}</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

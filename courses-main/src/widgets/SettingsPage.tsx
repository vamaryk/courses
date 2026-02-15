import { useState } from 'react';
import { Calendar as CalendarIcon, Settings, Bell, Shield, Palette, Save } from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showProgress: false,
    allowAnalytics: true,
  });

  const [theme, setTheme] = useState('light');

  const handleNotificationChange = (type: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handlePrivacyChange = (type: keyof typeof privacy) => {
    setPrivacy(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header аналогично календарю */}
      <header className="h-16 flex items-center justify-between px-[40px] z-[10] bg-gray-50/90 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold font-xolonium">LOGO</div>
        </div>
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <div className="w-8 h-8 bg-gray-200 rounded-full p-1"></div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 min-w-0 md:ml-[120px] px-[20px] md:px-0 mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
              <div className="rounded-xl shadow p-6" style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center">
                    <button className="flex items-center text-gray-600 text-[12px] font-montserrat hover:text-gray-900 mr-4">
                      ← Настройки
                    </button>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors">
                    <Save className="w-4 h-4" />
                    Сохранить
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <h1 className="text-[24px] font-xolonium">Настройки</h1>
                  <Settings className="w-5 h-5 text-gray-500" />
                </div>

                <div className="space-y-8">
                  {/* Уведомления */}
                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Уведомления
                    </h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Email уведомления</h3>
                          <p className="text-sm text-gray-600">Получать уведомления на почту</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.email}
                            onChange={() => handleNotificationChange('email')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Push уведомления</h3>
                          <p className="text-sm text-gray-600">Получать уведомления в браузере</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.push}
                            onChange={() => handleNotificationChange('push')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">SMS уведомления</h3>
                          <p className="text-sm text-gray-600">Получать уведомления по SMS</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.sms}
                            onChange={() => handleNotificationChange('sms')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Приватность */}
                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Приватность
                    </h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Видимость профиля</h3>
                          <p className="text-sm text-gray-600">Показывать профиль другим пользователям</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.profileVisible}
                            onChange={() => handlePrivacyChange('profileVisible')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Показывать прогресс</h3>
                          <p className="text-sm text-gray-600">Отображать прогресс обучения публично</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showProgress}
                            onChange={() => handlePrivacyChange('showProgress')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Аналитика использования</h3>
                          <p className="text-sm text-gray-600">Разрешить сбор анонимной статистики</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.allowAnalytics}
                            onChange={() => handlePrivacyChange('allowAnalytics')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Тема */}
                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Внешний вид
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-3">Тема оформления</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setTheme('light')}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              theme === 'light'
                                ? 'border-[#B291FF] bg-[#B291FF] text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            Светлая
                          </button>
                          <button
                            onClick={() => setTheme('dark')}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              theme === 'dark'
                                ? 'border-[#B291FF] bg-[#B291FF] text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            Темная
                          </button>
                          <button
                            onClick={() => setTheme('auto')}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              theme === 'auto'
                                ? 'border-[#B291FF] bg-[#B291FF] text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            Авто
                          </button>
                        </div>
                      </div>
                    </div>
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

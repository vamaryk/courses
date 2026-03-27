import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Shield, Save, User, Lock, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { authApi } from '@/shared/api/auth';
import {
  loadStoredUserSettings,
  persistUserSettings,
  type StoredUserSettings,
} from '@/shared/lib/userSettingsStorage';

const API_URL = import.meta.env.VITE_API_URL || '';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function canChangeEmailNow(emailChangedAt: string | null | undefined): boolean {
  if (emailChangedAt == null || emailChangedAt === '') return true;
  return Date.now() - new Date(emailChangedAt).getTime() >= MONTH_MS;
}

function nextEmailChangeAllowedAt(emailChangedAt: string | null | undefined): Date | null {
  if (emailChangedAt == null || emailChangedAt === '') return null;
  return new Date(new Date(emailChangedAt).getTime() + MONTH_MS);
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [settings, setSettings] = useState<StoredUserSettings>(() => loadStoredUserSettings());
  const [profileDetailsPublic, setProfileDetailsPublic] = useState(true);
  const [learningProgressPublic, setLearningProgressPublic] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const u = await authApi.getCurrentUser();
      login(u);
      setProfileDetailsPublic(u.profile_details_public !== false);
      setLearningProgressPublic(
        u.profile_details_public !== false && u.learning_progress_public !== false,
      );
      setPrefsLoaded(true);
    } catch {
      setPrefsLoaded(true);
    }
  }, [login]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const handleNotificationChange = (type: keyof StoredUserSettings['notifications']) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [type]: !prev.notifications[type] },
    }));
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      persistUserSettings(settings);
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_details_public: profileDetailsPublic,
          learning_progress_public: profileDetailsPublic ? learningProgressPublic : false,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Не удалось сохранить');
      }
      const u = await authApi.getCurrentUser();
      login(u);
      setSaveMessage('Настройки сохранены');
      window.setTimeout(() => setSaveMessage(null), 4000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordOk(null);

    if (!currentPassword || !newPassword) {
      setPasswordError('Укажите текущий и новый пароль');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен быть не короче 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Новый пароль и подтверждение не совпадают');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordOk('Пароль успешно изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && err.response.data !== null && 'error' in err.response.data) {
        const e = (err.response.data as { error?: unknown }).error;
        setPasswordError(typeof e === 'string' ? e : 'Не удалось сменить пароль');
      } else {
        setPasswordError('Не удалось сменить пароль');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailOk(null);
    if (!newEmail.trim() || !emailPassword) {
      setEmailError('Укажите новый email и текущий пароль');
      return;
    }
    if (!canChangeEmailNow(user?.email_changed_at)) {
      setEmailError('Смена email доступна не чаще одного раза в месяц');
      return;
    }
    setEmailLoading(true);
    try {
      await authApi.changeEmail({ newEmail: newEmail.trim(), password: emailPassword });
      setEmailOk('Адрес электронной почты обновлён');
      setNewEmail('');
      setEmailPassword('');
      const u = await authApi.getCurrentUser();
      login(u);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && err.response.data !== null && 'error' in err.response.data) {
        const e = (err.response.data as { error?: string; nextChangeAt?: string }).error;
        setEmailError(typeof e === 'string' ? e : 'Не удалось сменить email');
      } else {
        setEmailError('Не удалось сменить email');
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const emailCooldownUntil = nextEmailChangeAllowedAt(user?.email_changed_at);
  const emailLocked = !canChangeEmailNow(user?.email_changed_at);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <main className="flex-1 min-w-0 px-[20px] mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
              <div className="rounded-xl shadow p-6" style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="flex items-center text-gray-600 text-[12px] font-montserrat hover:text-gray-900 mr-4"
                    >
                      ← Назад
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    disabled={savingPrefs || !prefsLoaded}
                    className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-60"
                  >
                    {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Сохранить
                  </button>
                </div>

                {saveMessage && (
                  <p className="mb-4 text-sm font-medium text-green-700" role="status">
                    {saveMessage}
                  </p>
                )}
                {saveError && (
                  <p className="mb-4 text-sm font-medium text-red-600" role="status">
                    {saveError}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-8">
                  <h1 className="text-[24px] font-xolonium">Настройки</h1>
                  <Settings className="w-5 h-5 text-gray-500" />
                </div>

                <div className="space-y-8">
                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Аккаунт
                    </h2>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-600">Текущий email</span>
                        <p className="font-medium text-gray-900 break-all">{user?.email ?? '—'}</p>
                      </div>
                      {emailLocked && emailCooldownUntil && (
                        <p className="text-xs text-gray-600">
                          Следующая смена email:{' '}
                          {emailCooldownUntil.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Смена email
                    </h2>
                    <form onSubmit={handleChangeEmail} className="space-y-4 max-w-md">
                      <p className="text-xs text-gray-600">
                        Адрес можно менять не чаще одного раза в 30 дней. Потребуется текущий пароль.
                      </p>
                      <div>
                        <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-1">
                          Новый email
                        </label>
                        <input
                          id="new-email"
                          type="email"
                          autoComplete="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          disabled={emailLocked}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#B291FF] focus:outline-none focus:ring-1 focus:ring-[#B291FF] disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="email-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Текущий пароль
                        </label>
                        <input
                          id="email-password"
                          type="password"
                          autoComplete="current-password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          disabled={emailLocked}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#B291FF] focus:outline-none focus:ring-1 focus:ring-[#B291FF] disabled:bg-gray-100"
                        />
                      </div>
                      {emailError && <p className="text-sm text-red-600">{emailError}</p>}
                      {emailOk && <p className="text-sm text-green-700">{emailOk}</p>}
                      <button
                        type="submit"
                        disabled={emailLoading || emailLocked}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-60"
                      >
                        {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Сменить email
                      </button>
                    </form>
                  </div>

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
                            checked={settings.notifications.email}
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
                            checked={settings.notifications.push}
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
                            checked={settings.notifications.sms}
                            onChange={() => handleNotificationChange('sms')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Приватность профиля
                    </h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Показывать подробности профиля</h3>
                          <p className="text-sm text-gray-600">
                            Если выключено, другие видят только имя, фамилию, аватар и баннер.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileDetailsPublic}
                            onChange={() => {
                              setProfileDetailsPublic((prev) => {
                                const next = !prev;
                                if (!next) setLearningProgressPublic(false);
                                return next;
                              });
                              setSaveMessage(null);
                              setSaveError(null);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Показывать прогресс обучения</h3>
                          <p className="text-sm text-gray-600">
                            Статистика, курсы в процессе и проценты прохождения для других пользователей.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={learningProgressPublic}
                            onChange={() => {
                              setLearningProgressPublic((v) => !v);
                              setSaveMessage(null);
                              setSaveError(null);
                            }}
                            className="sr-only peer"
                            disabled={!profileDetailsPublic}
                          />
                          <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 ${!profileDetailsPublic ? 'opacity-50' : ''}`}></div>
                        </label>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      Уведомления (блок выше) сохраняются в браузере; приватность и email — на сервере. Нажмите «Сохранить», чтобы применить настройки приватности.
                    </p>
                  </div>

                  <div className="bg-white/70 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Безопасность
                    </h2>
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Текущий пароль
                        </label>
                        <input
                          id="current-password"
                          type="password"
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#B291FF] focus:outline-none focus:ring-1 focus:ring-[#B291FF]"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Новый пароль
                        </label>
                        <input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#B291FF] focus:outline-none focus:ring-1 focus:ring-[#B291FF]"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Подтверждение нового пароля
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#B291FF] focus:outline-none focus:ring-1 focus:ring-[#B291FF]"
                        />
                      </div>
                      {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                      {passwordOk && <p className="text-sm text-green-700">{passwordOk}</p>}
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-60"
                      >
                        {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Сменить пароль
                      </button>
                    </form>
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

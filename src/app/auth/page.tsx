'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Phone, Calendar } from 'lucide-react';
import { authApi } from '@/shared/api/auth';
import { useAuth } from '@/app/providers/AuthProvider';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    patronymic: '',
    phone_number: '',
    date_of_birth: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      let response;

      if (mode === 'login') {
        const loginData = {
          email: formData.email,
          password: formData.password
        };
        response = await authApi.signIn(loginData);
        login(response);
        navigate('/');
      } else {
        const signupData = {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          patronymic: formData.patronymic,
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth
        };
        response = await authApi.signUp(signupData);
        setSuccessMessage('Регистрация прошла успешно! Теперь вы можете войти.');
        setMode('login');
        setFormData(prev => ({
          ...prev,
          password: '',
          first_name: '',
          last_name: '',
          patronymic: '',
          phone_number: '',
          date_of_birth: ''
        }));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Произошла непредвиденная ошибка.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' 
                ? 'Войдите, чтобы продолжить' 
                : 'Заполните форму для регистрации'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Имя *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={50}
                        value={formData.first_name}
                        onChange={handleChange}
                        className="p-1 pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        placeholder="Иван"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Фамилия *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={50}
                        value={formData.last_name}
                        onChange={handleChange}
                        className="p-1 pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        placeholder="Иванов"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="patronymic" className="block text-sm font-medium text-gray-700 mb-1">
                    Отчество
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="patronymic"
                      name="patronymic"
                      type="text"
                      value={formData.patronymic}
                      onChange={handleChange}
                      className="p-1 pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Иванович"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={handleChange}
                      className="p-1 pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="+7 (___) ___-____"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                    Дата рождения
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="p-1 pl-10 block w-full rounded-lg text-gray-400 border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="p-1 pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Пароль *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => navigate('/auth/reset-password')}
                    className="text-sm text-purple-600 hover:text-purple-500"
                  >
                    Забыли пароль?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="p-1 pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  placeholder="••••••••"
                />
              </div>
              {mode === 'register' && (
                <p className="mt-1 text-xs text-gray-500">Пароль должен содержать минимум 8 символов</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'login' ? 'Вход...' : 'Регистрация...'}
                  </>
                ) : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              {mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-purple-600 hover:text-purple-500 focus:outline-none"
              >
                {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-6 rounded-b-2xl text-center">
          <p className="text-xs text-gray-500">
            Нажимая «{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}», вы соглашаетесь с нашими
            {' '}
            <a href="#" className="text-purple-600 hover:underline">Условиями использования</a>
            {' '}и{' '}
            <a href="#" className="text-purple-600 hover:underline">Политикой конфиденциальности</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

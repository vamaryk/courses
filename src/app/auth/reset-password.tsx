import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Sparkles } from 'lucide-react';
import { authApi } from '@/shared/api/auth';

// Компонент плавающей частицы для фона
const FloatingParticle = ({ delay, duration, size, left, top }: { delay: number; duration: number; size: number; left: string; top: string }) => (
  <div
    className="absolute rounded-full bg-white/20 animate-float"
    style={{
      width: size,
      height: size,
      left,
      top,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      filter: 'blur(1px)',
    }}
  />
);

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.email || !formData.newPassword || !formData.confirmPassword) {
      setError('Пожалуйста, заполните все поля.');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Новый пароль должен содержать минимум 8 символов.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        email: formData.email,
        newPassword: formData.newPassword,
      };

      const response = await authApi.resetPassword(payload);
      setSuccessMessage(response.message || 'Пароль успешно изменён. Теперь вы можете войти.');
      setFormData({
        email: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        navigate('/auth');
      }, 1500);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Не удалось изменить пароль. Попробуйте ещё раз.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Глобальные стили для анимаций */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0) translateX(0);opacity:.6}50%{transform:translateY(-20px) translateX(10px);opacity:1} }
        @keyframes gradient-shift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(139,92,246,.4)}50%{box-shadow:0 0 40px rgba(139,92,246,.8)} }
        @keyframes fade-scale { from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-gradient { background-size:200% 200%; animation:gradient-shift 8s ease infinite; }
        .animate-pulse-glow { animation:pulse-glow 3s ease-in-out infinite; }
        .animate-fade-scale { animation:fade-scale .4s ease-out forwards; }
        .animate-shimmer { background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent); background-size:200% 100%; animation:shimmer 2s infinite; }
        .glass-card { background: rgba(255,255,255,.95); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.5); box-shadow: 0 12px 48px rgba(0,0,0,.08); }
        .input-field { transition: all .25s ease; }
        .input-field:focus { box-shadow: 0 0 0 3px rgba(139,92,246,.2); border-color: #8b5cf6; }
      `}</style>

      <div className="px-4 sm:px-6 lg:px-[20px] pb-4 min-h-screen bg-background flex items-center justify-center">
        
        {/* Карточка восстановления пароля */}
        <div className="w-full max-w-md relative z-10">
          <div className="glass-card rounded-2xl sm:rounded-xl overflow-hidden animate-fade-scale">
            
            {/* Анимированный фон в шапке */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-6 sm:px-8 py-6 sm:py-8">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-32 h-32 sm:w-40 sm:h-40 bg-purple-500/40 rounded-full blur-2xl animate-pulse-glow" />
                <div className="absolute bottom-0 right-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-pink-500/30 rounded-full blur-2xl animate-pulse-glow" style={{animationDelay:'1s'}} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-60 sm:h-60 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-full blur-2xl animate-gradient" />
                {[...Array(8)].map((_, i) => (
                  <FloatingParticle key={i} delay={i * 0.5} duration={6 + i % 3} size={2 + (i % 2) * 2} left={`${15 + (i % 4) * 20}%`} top={`${20 + Math.floor(i / 4) * 40}%`} />
                ))}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-Xolonium text-white font-bold flex items-center gap-2">
                    🔐 Восстановление
                  </h2>
                  <p className="text-purple-100 text-sm mt-1">Укажите email и новый пароль</p>
                </div>
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 animate-pulse" />
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Сообщения */}
              {error && (
                <div className="mb-5 p-3 bg-red-50/80 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2 animate-fade-scale">
                  <span>⚠️</span> {error}
                </div>
              )}
              {successMessage && (
                <div className="mb-5 p-3 bg-green-50/80 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2 animate-fade-scale">
                  <span>✅</span> {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                    <input name="email" type="email" required value={formData.email} onChange={handleChange}
                      className="input-field p-2.5 pl-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-purple-500/20" placeholder="your@email.com" />
                  </div>
                </div>

                {/* Новый пароль */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">Новый пароль *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                    <input name="newPassword" type="password" required minLength={8} value={formData.newPassword} onChange={handleChange}
                      className="input-field p-2.5 pl-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-purple-500/20" placeholder="••••••••" />
                  </div>
                </div>

                {/* Подтверждение пароля */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">Повторите пароль *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                    <input name="confirmPassword" type="password" required minLength={8} value={formData.confirmPassword} onChange={handleChange}
                      className="input-field p-2.5 pl-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-purple-500/20" placeholder="••••••••" />
                  </div>
                </div>

                {/* Кнопка */}
                <div className="pt-3">
                  <button type="submit" disabled={isLoading}
                    className={`w-full relative overflow-hidden flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-300 ${isLoading?'bg-purple cursor-not-allowed':'bg-purple hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] cursor-pointer'}`}>
                    {isLoading ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      <span>Сохранение...</span></>
                    ) : (
                      <><span>Сменить пароль</span><ArrowLeft className="w-4 h-4 rotate-180"/></>
                    )}
                    {!isLoading && <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"><div className="absolute top-0 -left-full w-1/2 h-full animate-shimmer"/></div>}
                  </button>
                </div>
              </form>

              {/* Кнопка возврата */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-center text-sm text-gray-600">
                  <button type="button" onClick={() => navigate('/auth')}
                    className="font-semibold text-purple-600 hover:text-purple-500 transition-all duration-300 relative group inline-flex items-center gap-1 cursor-pointer">
                    <ArrowLeft className="w-3.5 h-3.5"/>
                    <span>Вернуться ко входу</span>
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"/>
                  </button>
                </p>
              </div>
            </div>

            {/* Футер */}
            <div className="bg-gradient-to-r from-gray-50 to-purple-50/30 px-6 sm:px-8 py-4 text-center">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Пароль должен содержать минимум 8 символов и быть надёжным.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
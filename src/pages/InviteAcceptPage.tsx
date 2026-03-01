import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { friendsApi } from '@/shared/api/friends';
import { UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Неверная ссылка');
      return;
    }

    friendsApi.acceptInvite(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/virtual-class'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        const msg = err?.response?.data?.error || 'Не удалось принять приглашение';
        setErrorMsg(msg);
      });
  }, [token, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-purple" />
            <p className="text-sm text-gray-600">Подтверждаем дружбу…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <UserCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Готово!</h2>
            <p className="text-sm text-gray-500">Вы теперь друзья. Переходим в чат…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Ошибка</h2>
            <p className="mb-4 text-sm text-gray-500">{errorMsg}</p>
            <button
              onClick={() => navigate('/virtual-class')}
              className="rounded-xl bg-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple/90"
            >
              Перейти в чат
            </button>
          </>
        )}
      </div>
    </div>
  );
}

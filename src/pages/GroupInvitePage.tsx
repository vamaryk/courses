import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '@/shared/api/groups';
import { Users2, AlertCircle, Loader2 } from 'lucide-react';

export default function GroupInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [groupName, setGroupName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Неверная ссылка');
      return;
    }

    groupsApi.joinByToken(token)
      .then((data) => {
        setGroupName(data.groupName);
        setStatus('success');
        setTimeout(() => navigate('/virtual-class'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err?.response?.data?.error || 'Не удалось присоединиться к беседе');
      });
  }, [token, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-purple" />
            <p className="text-sm text-gray-600">Присоединяемся к беседе…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <Users2 className="h-7 w-7 text-blue-600" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Готово!</h2>
            <p className="text-sm text-gray-500">Вы присоединились к «{groupName}». Переходим в чат…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Ошибка</h2>
            <p className="mb-4 text-sm text-gray-500">{errorMsg}</p>
            <button onClick={() => navigate('/virtual-class')}
              className="rounded-xl bg-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple/90">
              Перейти в чат
            </button>
          </>
        )}
      </div>
    </div>
  );
}

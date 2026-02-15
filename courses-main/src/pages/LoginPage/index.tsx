import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/auth', { replace: true });
  }, [navigate]);

  return null;
};

export default LoginPage;

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import '../styles/global.css';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};
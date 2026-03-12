import { createContext, useContext, type ReactNode } from 'react';
import { useSocket, type UseSocketReturn } from '@/hooks/useSocket';

const SocketContext = createContext<UseSocketReturn | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const value = useSocket();
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSharedSocket(): UseSocketReturn {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSharedSocket must be used within SocketProvider');
  }
  return ctx;
}


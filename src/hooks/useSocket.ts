/**
 * useSocket — manages the Socket.IO connection lifecycle.
 *
 * Returns the live socket instance, the server-assigned userId,
 * and a boolean connection flag.
 */

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket.IO connects to the same origin as the page (Vite proxies /socket.io → backend).
// This means only ONE tunnel/port is needed for cross-network testing.
// Override with VITE_SOCKET_URL only if you need a separate backend URL.
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || undefined;

export interface UseSocketReturn {
  socket: Socket | null;
  userId: string | null;
  isConnected: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const opts = {
      transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    };

    const s: Socket = SOCKET_URL ? io(SOCKET_URL, opts) : io(opts);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    // Server assigns a unique short ID on every connection
    s.on('user:id', ({ userId: id }: { userId: string }) => setUserId(id));

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, userId, isConnected };
}

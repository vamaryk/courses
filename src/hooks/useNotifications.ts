import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from '@/hooks/use-toast';

export type NotificationPayload =
  | {
      type: 'friend_request';
      title: string;
      body: string;
      created_at: string;
    }
  | {
      type: 'friend_accepted';
      title: string;
      body: string;
      created_at: string;
    }
  | {
      type: 'direct_message';
      title: string;
      body: string;
      created_at: string;
    }
  | {
      type: 'calendar_reminder';
      title: string;
      body: string;
      created_at: string;
    }
  | {
      type: string;
      title: string;
      body: string;
      created_at: string;
    };

export interface StoredNotification extends NotificationPayload {
  id: string;
}

interface NotificationState {
  notifications: StoredNotification[];
}

const listeners: Array<(state: NotificationState) => void> = [];
let memoryState: NotificationState = { notifications: [] };

function dispatch(nextState: NotificationState) {
  memoryState = nextState;
  listeners.forEach((l) => l(memoryState));
}

function addNotification(payload: NotificationPayload) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next: StoredNotification = { id, ...payload };
  const list = [next, ...memoryState.notifications].slice(0, 50);
  dispatch({ notifications: list });
}

export function useNotificationCenter() {
  const [state, setState] = useState<NotificationState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  const clearAll = () => dispatch({ notifications: [] });

  return {
    notifications: state.notifications,
    clearAll,
  };
}

export function useNotifications(socket: Socket | null) {
  useEffect(() => {
    if (!socket) return;

    const handler = (payload: NotificationPayload) => {
      const createdAt = payload.created_at
        ? new Date(payload.created_at).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      const suffix = createdAt ? ` (в ${createdAt})` : '';

      addNotification(payload);

      toast({
        title: payload.title,
        description: `${payload.body}${suffix}`,
      });
    };

    socket.on('notification', handler);

    return () => {
      socket.off('notification', handler);
    };
  }, [socket]);
}


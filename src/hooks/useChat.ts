/**
 * useChat — handles all chat-room logic on top of a Socket instance.
 *
 * Flow:
 *  1. Caller A emits  chat:join { targetUserId }
 *  2. Server notifies caller A  → chat:joined  { roomId }
 *  3. Server notifies caller B  → chat:invited { roomId }
 *  4. Caller B auto-accepts     → emits chat:accept { roomId }
 *  5. Both receive              → chat:ready   { roomId }
 *  6. Either side calls sendMessage to broadcast in the room.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  fromUserId: string;
  text: string;
  timestamp: string;
  isRead?: boolean;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  editedAt?: string | null;
}

export type ChatStatus = 'idle' | 'waiting' | 'connected';

export interface UseChatReturn {
  roomId: string | null;
  messages: ChatMessage[];
  error: string | null;
  status: ChatStatus;
  joinRoom: (targetUserId: string) => void;
  sendMessage: (text: string) => void;
  sendMedia: (file: File, caption?: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
}

export function useChat(socket: Socket | null): UseChatReturn {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>('idle');

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result || '');
        resolve(data.includes(',') ? data.split(',')[1] : data);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!socket) return;

    const onJoined = ({ roomId: rid }: { roomId: string; targetUserId: string }) => {
      setRoomId(rid);
      setStatus('waiting');
      setError(null);
    };

    // Auto-accept incoming invitations
    const onInvited = ({ roomId: rid }: { fromUserId: string; roomId: string }) => {
      setRoomId(rid);
      socket.emit('chat:accept', { roomId: rid });
    };

    const onReady = () => {
      setStatus('connected');
    };

    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onUpdated = ({ messageId, text, editedAt }: { messageId: string; text: string; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, text, editedAt } : msg)),
      );
    };

    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    const onError = ({ message }: { message: string }) => {
      setError(message);
    };

    socket.on('chat:joined', onJoined);
    socket.on('chat:invited', onInvited);
    socket.on('chat:ready', onReady);
    socket.on('chat:message', onMessage);
    socket.on('chat:updated', onUpdated);
    socket.on('chat:deleted', onDeleted);
    socket.on('chat:error', onError);

    return () => {
      socket.off('chat:joined', onJoined);
      socket.off('chat:invited', onInvited);
      socket.off('chat:ready', onReady);
      socket.off('chat:message', onMessage);
      socket.off('chat:updated', onUpdated);
      socket.off('chat:deleted', onDeleted);
      socket.off('chat:error', onError);
    };
  }, [socket]);

  const joinRoom = useCallback(
    (targetUserId: string) => {
      if (!socket) return;
      setError(null);
      socket.emit('chat:join', { targetUserId });
    },
    [socket],
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket || !roomId || !text.trim()) return;
      socket.emit('chat:message', { roomId, text });
    },
    [socket, roomId],
  );

  const sendMedia = useCallback(
    async (file: File, caption = '') => {
      if (!socket || !roomId) return;
      const isSupported = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isSupported) return;

      const base64Data = await fileToBase64(file);
      socket.emit('chat:media-upload', {
        roomId,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        caption,
      });
    },
    [socket, roomId],
  );

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      if (!socket || !roomId || !messageId || !text.trim()) return;
      socket.emit('chat:edit', { roomId, messageId, text: text.trim() });
    },
    [socket, roomId],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socket || !roomId || !messageId) return;
      socket.emit('chat:delete', { roomId, messageId }, (response?: { ok?: boolean }) => {
        if (response?.ok) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }
      });
    },
    [socket, roomId],
  );

  return { roomId, messages, error, status, joinRoom, sendMessage, sendMedia, editMessage, deleteMessage };
}

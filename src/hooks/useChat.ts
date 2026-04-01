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
import { uploadSocketMedia } from '@/shared/lib/socketMediaUpload';

export interface ReplyInfo {
  id: string;
  text: string;
  senderName: string;
}

/** Snapshot of a message being forwarded (Telegram-style attribution). */
export interface ForwardInfo {
  senderName: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  text: string;
  timestamp: string;
  isRead?: boolean;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  editedAt?: string | null;
  reply_to_id?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
  forward_from_name?: string | null;
  forward_original_text?: string | null;
  forward_media_url?: string | null;
  forward_media_type?: 'image' | 'video' | null;
}

export type ChatStatus = 'idle' | 'waiting' | 'connected';

export interface UseChatReturn {
  roomId: string | null;
  messages: ChatMessage[];
  error: string | null;
  status: ChatStatus;
  isUploadingMedia: boolean;
  uploadProgress: number;
  joinRoom: (targetUserId: string) => void;
  sendMessage: (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  /** Отправить в другую комнату по ID (без смены текущей), в т.ч. пересылку */
  sendMessageToRoom: (targetRoomId: string, text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  sendMedia: (file: File, caption?: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
}

export function useChat(socket: Socket | null): UseChatReturn {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const emitRoom = useCallback(
    (targetRoomId: string, trimmed: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => {
      if (!socket || !targetRoomId) return;
      const hasForward = Boolean(
        forwardFrom?.senderName && (forwardFrom.text?.trim() || (forwardFrom.mediaUrl && forwardFrom.mediaType)),
      );
      if (!trimmed && !hasForward) return;

      socket.emit('chat:message', {
        roomId: targetRoomId,
        text: trimmed,
        ...(replyTo && {
          replyToId: replyTo.id,
          replyToText: replyTo.text,
          replyToSender: replyTo.senderName,
        }),
        ...(hasForward && forwardFrom && {
          forwardFromName: forwardFrom.senderName,
          forwardOriginalText: forwardFrom.text || '',
          forwardMediaUrl: forwardFrom.mediaUrl ?? null,
          forwardMediaType: forwardFrom.mediaType ?? null,
        }),
      });
    },
    [socket],
  );

  const sendMessage = useCallback(
    (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => {
      if (!roomId) return;
      emitRoom(roomId, text.trim(), replyTo, forwardFrom);
    },
    [emitRoom, roomId],
  );

  const sendMessageToRoom = useCallback(
    (targetRoomId: string, text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => {
      emitRoom(targetRoomId, text.trim(), replyTo, forwardFrom);
    },
    [emitRoom],
  );

  const sendMedia = useCallback(
    async (file: File, caption = '') => {
      if (!socket || !roomId) return;
      const isSupported = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isSupported) return;

      setIsUploadingMedia(true);
      setUploadProgress(0);
      try {
        const message = await uploadSocketMedia<ChatMessage>({
          socket,
          file,
          caption,
          target: { type: 'room', roomId },
          onProgress: setUploadProgress,
        });
        if (message) {
          setMessages((prev) => (prev.some((msg) => msg.id === message.id) ? prev : [...prev, message]));
        }
      } finally {
        setIsUploadingMedia(false);
        setUploadProgress(0);
      }
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

  return { roomId, messages, error, status, isUploadingMedia, uploadProgress, joinRoom, sendMessage, sendMessageToRoom, sendMedia, editMessage, deleteMessage };
}

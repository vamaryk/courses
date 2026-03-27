import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { friendsApi, type DirectMessage } from '@/shared/api/friends';
import type { ForwardInfo } from '@/hooks/useChat';

export interface ReplyInfo {
  id: string;
  text: string;
  senderName: string;
}

export interface UseDirectMessagesReturn {
  messages: DirectMessage[];
  loading: boolean;
  sendMessage: (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  /** Отправить в личку конкретному пользователю (без смены активного чата), в т.ч. пересылку */
  sendMessageTo: (receiverId: string, text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  sendMedia: (file: File, caption?: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  loadHistory: (friendId: string) => Promise<void>;
  activeFriendId: string | null;
  setActiveFriendId: (id: string | null) => void;
  dbUserId: string | null;
}

interface Options {
  /** Called for every incoming DM (used to update the sidebar preview) */
  onMessage?: (msg: DirectMessage) => void;
}

export function useDirectMessages(
  socket: Socket | null,
  options?: Options,
): UseDirectMessagesReturn {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFriendId, setActiveFriendIdState] = useState<string | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const activeFriendRef = useRef(activeFriendId);
  const lastLoadedFriendIdRef = useRef<string | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Keep a stable ref to the callback so the socket listener doesn't go stale
  const onMessageRef = useRef(options?.onMessage);
  useEffect(() => { onMessageRef.current = options?.onMessage; }, [options?.onMessage]);

  const setActiveFriendId = useCallback((id: string | null) => {
    activeFriendRef.current = id;
    setActiveFriendIdState(id);
    if (!id) setMessages([]);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onAuthenticated = ({ dbUserId: id }: { dbUserId: string }) => {
      setDbUserId(id);
    };

    const onMessage = (msg: DirectMessage) => {
      const friendId = activeFriendRef.current;

      const isRelevant = friendId &&
        ((msg.sender_id === friendId) || (msg.receiver_id === friendId));

      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.sender_id === friendId) {
          socket.emit('dm:read', { senderId: friendId });
        }
      }

      onMessageRef.current?.(msg);
    };

    const onUpdated = (updated: DirectMessage) => {
      setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg)));
      onMessageRef.current?.(updated);
    };

    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    // Server notifies sender that recipient read their messages
    const onRead = ({ readBy }: { readBy: string }) => {
      const friendId = activeFriendRef.current;
      if (!friendId || readBy !== friendId) return;
      setMessages((prev) =>
        prev.map((msg) => (msg.is_read ? msg : { ...msg, is_read: true })),
      );
    };

    // On reconnect: reload the active chat history to catch messages missed during disconnect
    const onConnect = () => {
      const friendId = activeFriendRef.current;
      if (!friendId) return;
      // Clear deduplication guard so loadHistory runs again
      lastLoadedFriendIdRef.current = null;
      void friendsApi.getMessages(friendId).then((history) => {
        setMessages(history);
      }).catch(() => {/* silent – user can refresh manually */});
    };

    socket.on('connect', onConnect);
    socket.on('dm:authenticated', onAuthenticated);
    socket.on('dm:message', onMessage);
    socket.on('dm:updated', onUpdated);
    socket.on('dm:deleted', onDeleted);
    socket.on('dm:read', onRead);

    return () => {
      socket.off('connect', onConnect);
      socket.off('dm:authenticated', onAuthenticated);
      socket.off('dm:message', onMessage);
      socket.off('dm:updated', onUpdated);
      socket.off('dm:deleted', onDeleted);
      socket.off('dm:read', onRead);
    };
  }, [socket]);

  // Fallback: fetch current DB user id via HTTP in case socket auth event was missed
  useEffect(() => {
    if (dbUserId) return;

    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const me = await res.json();
        if (me?.id) {
          setDbUserId(me.id);
        }
      } catch {
        // ignore
      }
    };

    void fetchMe();
  }, [API_URL, dbUserId]);

  const loadHistory = useCallback(async (friendId: string) => {
    // Avoid spamming the API if we are already loaded (or trying to load) this friend
    if (lastLoadedFriendIdRef.current === friendId && !loading) {
      return;
    }
    lastLoadedFriendIdRef.current = friendId;

    setLoading(true);
    try {
      const history = await friendsApi.getMessages(friendId);
      setMessages(history);
    } catch (err) {
      console.error('[useDirectMessages] loadHistory error:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const emitDm = useCallback(
    (
      receiverId: string,
      trimmed: string,
      replyTo?: ReplyInfo,
      forwardFrom?: ForwardInfo,
    ) => {
      if (!socket) return;
      const hasForward = Boolean(
        forwardFrom?.senderName && (forwardFrom.text?.trim() || (forwardFrom.mediaUrl && forwardFrom.mediaType)),
      );
      if (!trimmed && !hasForward) return;

      socket.emit('dm:send', {
        receiverId,
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
      if (!activeFriendRef.current) return;
      emitDm(activeFriendRef.current, text.trim(), replyTo, forwardFrom);
    },
    [emitDm],
  );

  const sendMessageTo = useCallback(
    (receiverId: string, text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => {
      if (!receiverId) return;
      emitDm(receiverId, text.trim(), replyTo, forwardFrom);
    },
    [emitDm],
  );

  const sendMedia = useCallback(
    async (file: File, caption = '') => {
      if (!socket || !activeFriendRef.current) return;
      const isSupported = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isSupported) return;

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const data = String(reader.result || '');
          resolve(data.includes(',') ? data.split(',')[1] : data);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      socket.emit('dm:send', {
        receiverId: activeFriendRef.current,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        caption: caption.trim(),
      });
    },
    [socket],
  );

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      if (!socket || !messageId || !text.trim()) return;
      socket.emit('dm:edit', { messageId, text: text.trim() });
    },
    [socket],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socket || !messageId) return;
      socket.emit('dm:delete', { messageId }, (response?: { ok?: boolean }) => {
        if (response?.ok) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }
      });
    },
    [socket],
  );

  return {
    messages,
    loading,
    sendMessage,
    sendMessageTo,
    sendMedia,
    editMessage,
    deleteMessage,
    loadHistory,
    activeFriendId,
    setActiveFriendId,
    dbUserId,
  };
}

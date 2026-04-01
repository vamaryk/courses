import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { friendsApi, type DirectMessage } from '@/shared/api/friends';
import type { ForwardInfo } from '@/hooks/useChat';
import { loadChatHistoryCache, saveChatHistoryCache } from '@/shared/lib/chatHistoryCache';
import { uploadSocketMedia } from '@/shared/lib/socketMediaUpload';

export interface ReplyInfo {
  id: string;
  text: string;
  senderName: string;
}

export interface UseDirectMessagesReturn {
  messages: DirectMessage[];
  loading: boolean;
  isUploadingMedia: boolean;
  uploadProgress: number;
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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeFriendId, setActiveFriendIdState] = useState<string | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const activeFriendRef = useRef(activeFriendId);
  const messagesRef = useRef<DirectMessage[]>([]);
  const messageCacheRef = useRef<Record<string, DirectMessage[]>>({});
  const loadRequestIdRef = useRef(0);
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Keep a stable ref to the callback so the socket listener doesn't go stale
  const onMessageRef = useRef(options?.onMessage);
  useEffect(() => { onMessageRef.current = options?.onMessage; }, [options?.onMessage]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applyMessages = useCallback((next: DirectMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const readCachedMessages = useCallback((friendId: string) => {
    const cached = messageCacheRef.current[friendId] ?? loadChatHistoryCache<DirectMessage>('dm', friendId);
    if (cached) {
      messageCacheRef.current[friendId] = cached;
    }
    return cached ?? null;
  }, []);

  const cacheMessages = useCallback((friendId: string, next: DirectMessage[]) => {
    messageCacheRef.current[friendId] = next;
    saveChatHistoryCache('dm', friendId, next);
  }, []);

  const setActiveFriendId = useCallback((id: string | null) => {
    activeFriendRef.current = id;
    setActiveFriendIdState(id);
    if (!id) {
      applyMessages([]);
      return;
    }

    const cached = readCachedMessages(id);
    if (cached) {
      applyMessages(cached);
    } else {
      applyMessages([]);
    }
  }, [applyMessages, readCachedMessages]);

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
        const current = messagesRef.current;
        const next = current.some((m) => m.id === msg.id) ? current : [...current, msg];
        cacheMessages(friendId, next);
        applyMessages(next);

        if (msg.sender_id === friendId) {
          socket.emit('dm:read', { senderId: friendId });
        }
      }

      onMessageRef.current?.(msg);
    };

    const onUpdated = (updated: DirectMessage) => {
      const friendId = activeFriendRef.current;
      const next = messagesRef.current.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg));
      if (friendId) {
        cacheMessages(friendId, next);
      }
      applyMessages(next);
      onMessageRef.current?.(updated);
    };

    const onDeleted = ({ messageId }: { messageId: string }) => {
      const friendId = activeFriendRef.current;
      const next = messagesRef.current.filter((msg) => msg.id !== messageId);
      if (friendId) {
        cacheMessages(friendId, next);
      }
      applyMessages(next);
    };

    // Server notifies sender that recipient read their messages
    const onRead = ({ readBy }: { readBy: string }) => {
      const friendId = activeFriendRef.current;
      if (!friendId || readBy !== friendId) return;
      const next = messagesRef.current.map((msg) => (msg.is_read ? msg : { ...msg, is_read: true }));
      cacheMessages(friendId, next);
      applyMessages(next);
    };

    // On reconnect: reload the active chat history to catch messages missed during disconnect
    const onConnect = () => {
      const friendId = activeFriendRef.current;
      if (!friendId) return;

      const requestId = ++loadRequestIdRef.current;
      void friendsApi.getMessages(friendId).then((history) => {
        cacheMessages(friendId, history);
        if (requestId === loadRequestIdRef.current && activeFriendRef.current === friendId) {
          applyMessages(history);
        }
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
  }, [applyMessages, cacheMessages, socket]);

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
    const cached = readCachedMessages(friendId);
    if (activeFriendRef.current === friendId) {
      if (cached) {
        applyMessages(cached);
      } else {
        applyMessages([]);
      }
    }

    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      const history = await friendsApi.getMessages(friendId);
      cacheMessages(friendId, history);
      if (requestId === loadRequestIdRef.current && activeFriendRef.current === friendId) {
        applyMessages(history);
      }
    } catch (err) {
      console.error('[useDirectMessages] loadHistory error:', err);
      if (!cached && requestId === loadRequestIdRef.current && activeFriendRef.current === friendId) {
        applyMessages([]);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applyMessages, cacheMessages, readCachedMessages]);

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

      setIsUploadingMedia(true);
      setUploadProgress(0);
      try {
        await uploadSocketMedia<DirectMessage>({
          socket,
          file,
          caption: caption.trim(),
          target: { type: 'dm', receiverId: activeFriendRef.current },
          onProgress: setUploadProgress,
        });
      } finally {
        setIsUploadingMedia(false);
        setUploadProgress(0);
      }
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
    isUploadingMedia,
    uploadProgress,
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

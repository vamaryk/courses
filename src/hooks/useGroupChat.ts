import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { groupsApi, type GroupChat, type GroupMessage } from '@/shared/api/groups';
import type { ForwardInfo } from '@/hooks/useChat';

export interface ReplyInfo {
  id: string;
  text: string;
  senderName: string;
}

export interface UseGroupChatReturn {
  groups: GroupChat[];
  messages: GroupMessage[];
  activeGroupId: number | null;
  loading: boolean;
  setActiveGroupId: (id: number | null) => void;
  loadHistory: (groupId: number) => Promise<void>;
  sendMessage: (text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  /** Отправить в указанную группу без смены активного чата */
  sendMessageToGroup: (groupId: number, text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => void;
  sendMedia: (file: File, caption?: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  refreshGroups: () => Promise<void>;
  /** Сбросить счётчик непрочитанных для группы при открытии */
  clearGroupUnread: (groupId: number) => void;
}

export function useGroupChat(socket: Socket | null): UseGroupChatReturn {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const activeGroupRef = useRef<number | null>(null);

  // Keep a stable ref to the logged-in user's socket DB id for sender comparison
  const dbUserIdRef = useRef<string | null>(null);

  const setActiveGroupId = useCallback((id: number | null) => {
    activeGroupRef.current = id;
    setActiveGroupIdState(id);
    if (!id) setMessages([]);
  }, []);

  const refreshGroups = useCallback(async () => {
    try {
      const g = await groupsApi.getAll();
      setGroups(g);
    } catch (err) {
      console.error('[useGroupChat] refreshGroups error:', err);
    }
  }, []);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  // Capture the authenticated DB user id from the socket
  useEffect(() => {
    if (!socket) return;
    const onAuthenticated = ({ dbUserId }: { dbUserId: string }) => {
      dbUserIdRef.current = dbUserId;
    };
    socket.on('dm:authenticated', onAuthenticated);
    return () => { socket.off('dm:authenticated', onAuthenticated); };
  }, [socket]);

  // On socket reconnect: reload active group history to catch missed messages
  useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      const groupId = activeGroupRef.current;
      if (!groupId) return;
      void groupsApi.getMessages(groupId).then((history) => {
        setMessages(history);
      }).catch(() => {/* silent */});
    };
    socket.on('connect', onReconnect);
    return () => { socket.off('connect', onReconnect); };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const onGroupMessage = (msg: GroupMessage) => {
      // 1. Append to message list if the group is currently open
      if (msg.group_id === activeGroupRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // 2. Update sidebar preview + unread count for that group
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== msg.group_id) return g;

          const isOpen = activeGroupRef.current === msg.group_id;
          const isMine = msg.sender_id === dbUserIdRef.current;

          const lastPreview =
            msg.text?.trim()
            || (msg.forward_from_name ? `Переслано от ${msg.forward_from_name}` : '')
            || (msg.media_url ? 'Медиа' : '');
          return {
            ...g,
            last_message: lastPreview,
            last_message_at: msg.created_at,
            unread_count: isOpen || isMine ? 0 : (g.unread_count ?? 0) + 1,
          };
        }),
      );
    };

    socket.on('group:message', onGroupMessage);
    const onGroupUpdated = (updated: GroupMessage) => {
      if (updated.group_id === activeGroupRef.current) {
        setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg)));
      }
    };

    const onGroupDeleted = ({ groupId, messageId }: { groupId: number; messageId: string }) => {
      if (groupId === activeGroupRef.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    };

    socket.on('group:updated', onGroupUpdated);
    socket.on('group:deleted', onGroupDeleted);
    return () => {
      socket.off('group:message', onGroupMessage);
      socket.off('group:updated', onGroupUpdated);
      socket.off('group:deleted', onGroupDeleted);
    };
  }, [socket]);

  const loadHistory = useCallback(async (groupId: number) => {
    setLoading(true);
    try {
      if (socket) socket.emit('group:join', { groupId });
      const history = await groupsApi.getMessages(groupId);
      setMessages(history);
    } catch (err) {
      console.error('[useGroupChat] loadHistory error:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [socket]);

  const emitGroup = useCallback(
    (groupId: number, trimmed: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => {
      if (!socket) return;
      const hasForward = Boolean(
        forwardFrom?.senderName && (forwardFrom.text?.trim() || (forwardFrom.mediaUrl && forwardFrom.mediaType)),
      );
      if (!trimmed && !hasForward) return;

      socket.emit('group:send', {
        groupId,
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
      if (!activeGroupRef.current) return;
      emitGroup(activeGroupRef.current, text.trim(), replyTo, forwardFrom);
    },
    [emitGroup],
  );

  const sendMessageToGroup = useCallback(
    (groupId: number, text: string, replyTo?: ReplyInfo, forwardFrom?: ForwardInfo) => {
      emitGroup(groupId, text.trim(), replyTo, forwardFrom);
    },
    [emitGroup],
  );

  const sendMedia = useCallback(
    async (file: File, caption = '') => {
      if (!socket || !activeGroupRef.current) return;
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

      socket.emit('group:send', {
        groupId: activeGroupRef.current,
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
      socket.emit('group:edit', { messageId, text: text.trim() });
    },
    [socket],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socket || !messageId) return;
      socket.emit('group:delete', { messageId }, (response?: { ok?: boolean }) => {
        if (response?.ok) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }
      });
    },
    [socket],
  );

  /** Zero out the unread counter when the user opens a group */
  const clearGroupUnread = useCallback((groupId: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, unread_count: 0 } : g)),
    );
  }, []);

  return {
    groups,
    messages,
    activeGroupId,
    loading,
    setActiveGroupId,
    loadHistory,
    sendMessage,
    sendMessageToGroup,
    sendMedia,
    editMessage,
    deleteMessage,
    refreshGroups,
    clearGroupUnread,
  };
}

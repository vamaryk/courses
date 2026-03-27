import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { friendsApi, type FriendProfile, type PendingRequest, type RecentChat, type DirectMessage } from '@/shared/api/friends';

export interface UseFriendsReturn {
  friends: FriendProfile[];
  pending: PendingRequest[];
  recentChats: RecentChat[];
  loading: boolean;
  refresh: () => Promise<void>;
  sendRequest: (friendId: string) => Promise<void>;
  acceptRequest: (friendshipId: number) => Promise<void>;
  rejectRequest: (friendshipId: number) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  /** Обновить превью последнего сообщения в боковой панели в реальном времени */
  updateRecentChat: (msg: DirectMessage, myId: string | null, activeFriendId: string | null) => void;
  /** Сбросить счётчик непрочитанных для конкретного друга (при открытии чата) */
  clearUnread: (friendId: string) => void;
}

export function useFriends(socket: Socket | null): UseFriendsReturn {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [f, p, rc] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPending(),
        friendsApi.getRecentChats(),
      ]);
      setFriends(f);
      setPending(p);
      setRecentChats(rc);
    } catch (err) {
      console.error('[useFriends] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Real-time: socket events for friend requests ─────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Incoming friend request — update the pending badge immediately
    const onFriendRequest = (req: PendingRequest) => {
      setPending((prev) => {
        if (prev.some((r) => r.friendship_id === req.friendship_id)) return prev;
        return [req, ...prev];
      });
    };

    // Friendship accepted — refresh friends list so the new friend appears
    const onFriendAccepted = () => {
      refresh();
    };

    socket.on('friend:request', onFriendRequest);
    socket.on('friend:accepted', onFriendAccepted);

    return () => {
      socket.off('friend:request', onFriendRequest);
      socket.off('friend:accepted', onFriendAccepted);
    };
  }, [socket, refresh]);

  const sendRequest = useCallback(async (friendId: string) => {
    await friendsApi.sendRequest(friendId);
    await refresh();
  }, [refresh]);

  const acceptRequest = useCallback(async (friendshipId: number) => {
    await friendsApi.acceptRequest(friendshipId);
    await refresh();
  }, [refresh]);

  const rejectRequest = useCallback(async (friendshipId: number) => {
    await friendsApi.rejectRequest(friendshipId);
    await refresh();
  }, [refresh]);

  const removeFriend = useCallback(async (friendId: string) => {
    await friendsApi.removeFriend(friendId);
    await refresh();
  }, [refresh]);

  /**
   * Optimistically update the sidebar preview when a new DM arrives,
   * without making an extra API request.
   */
  const updateRecentChat = useCallback(
    (msg: DirectMessage, myId: string | null, activeFriendId: string | null) => {
      const friendId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
      const previewText =
        msg.text?.trim()
        || (msg.forward_from_name ? `Переслано от ${msg.forward_from_name}` : '')
        || (msg.media_type ? 'Медиа' : '');

      setRecentChats((prev) => {
        const existing = prev.find((c) => c.friend_id === friendId);

        // Only update existing entries — never auto-add new contacts to "Недавние"
        if (!existing) return prev;

        // Increment unread only for messages from the friend, and only when that chat is NOT open
        const shouldIncUnread = msg.sender_id !== myId && activeFriendId !== friendId;

        const updated: RecentChat = {
          ...existing,
          last_message: previewText,
          last_message_at: msg.created_at,
          last_sender_id: msg.sender_id,
          unread_count: shouldIncUnread
            ? (existing.unread_count ?? 0) + 1
            : existing.unread_count ?? 0,
        };

        // Move to top of list
        return [updated, ...prev.filter((c) => c.friend_id !== friendId)];
      });
    },
    [],
  );

  /** Zero out the unread counter for a friend when the user opens their chat */
  const clearUnread = useCallback((friendId: string) => {
    setRecentChats((prev) =>
      prev.map((c) => (c.friend_id === friendId ? { ...c, unread_count: 0 } : c)),
    );
  }, []);

  return {
    friends,
    pending,
    recentChats,
    loading,
    refresh,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    updateRecentChat,
    clearUnread,
  };
}

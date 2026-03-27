import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface FriendProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
  friends_since?: string;
}

export interface SearchResult extends FriendProfile {
  friendship_status: 'pending' | 'accepted' | 'rejected' | null;
  friendship_id: number | null;
  friendship_initiator: string | null;
}

export interface PendingRequest {
  friendship_id: number;
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  is_read: boolean;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  reply_to_id?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
  forward_from_name?: string | null;
  forward_original_text?: string | null;
  forward_media_url?: string | null;
  forward_media_type?: 'image' | 'video' | null;
}

export interface RecentChat {
  friend_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  last_sender_id: string;
  unread_count: number | null;
}

export interface FriendStatus {
  status: 'none' | 'self' | 'pending' | 'accepted';
  direction: 'outgoing' | 'incoming' | null;
  friendshipId: number | null;
}

const opts = { withCredentials: true };

export const friendsApi = {
  async searchUsers(query: string): Promise<SearchResult[]> {
    const res = await axios.get(`${API_URL}/api/friends/search`, { ...opts, params: { q: query } });
    return res.data;
  },

  async getFriends(): Promise<FriendProfile[]> {
    const res = await axios.get(`${API_URL}/api/friends`, opts);
    return res.data;
  },

  async getPending(): Promise<PendingRequest[]> {
    const res = await axios.get(`${API_URL}/api/friends/pending`, opts);
    return res.data;
  },

  async sendRequest(friendId: string): Promise<{ friendshipId: number; message: string }> {
    const res = await axios.post(`${API_URL}/api/friends/request`, { friendId }, opts);
    return res.data;
  },

  async acceptRequest(friendshipId: number): Promise<void> {
    await axios.post(`${API_URL}/api/friends/accept/${friendshipId}`, {}, opts);
  },

  async rejectRequest(friendshipId: number): Promise<void> {
    await axios.post(`${API_URL}/api/friends/reject/${friendshipId}`, {}, opts);
  },

  async removeFriend(friendId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/friends/${friendId}`, opts);
  },

  async getInviteLink(): Promise<string> {
    const res = await axios.get(`${API_URL}/api/friends/invite-link`, opts);
    return res.data.token;
  },

  async acceptInvite(token: string): Promise<{ message: string; friendId: string }> {
    const res = await axios.post(`${API_URL}/api/friends/invite/${token}`, {}, opts);
    return res.data;
  },

  async getMessages(friendId: string, limit = 50, offset = 0): Promise<DirectMessage[]> {
    const res = await axios.get(`${API_URL}/api/friends/messages/${friendId}`, {
      ...opts,
      params: { limit, offset },
    });
    return res.data;
  },

  async getRecentChats(): Promise<RecentChat[]> {
    const res = await axios.get(`${API_URL}/api/friends/recent-chats`, opts);
    return res.data;
  },

  async getFriendStatus(userId: string): Promise<FriendStatus> {
    const res = await axios.get(`${API_URL}/api/friends/status/${userId}`, opts);
    return res.data;
  },

  /** Public list of friends for a user profile (by user id) */
  async getFriendsByUserId(userId: string): Promise<FriendProfile[]> {
    const res = await axios.get(`${API_URL}/api/users/${userId}/friends`, opts);
    return res.data;
  },
};

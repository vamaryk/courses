import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const opts = { withCredentials: true };

export interface GroupChat {
  id: number;
  name: string;
  avatar_url: string | null;
  invite_token: string;
  creator_id: string;
  created_at: string;
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count?: number;
}

export interface GroupMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupDetail extends GroupChat {
  members: GroupMember[];
}

export interface GroupMessage {
  id: string;
  group_id: number;
  sender_id: string;
  text: string;
  created_at: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  sender_first_name: string;
  sender_last_name: string;
  sender_avatar: string | null;
}

export const groupsApi = {
  async create(name: string, memberIds: string[] = []): Promise<GroupChat> {
    const res = await axios.post(`${API_URL}/api/groups`, { name, memberIds }, opts);
    return res.data;
  },

  async getAll(): Promise<GroupChat[]> {
    const res = await axios.get(`${API_URL}/api/groups`, opts);
    return res.data;
  },

  async getDetail(groupId: number): Promise<GroupDetail> {
    const res = await axios.get(`${API_URL}/api/groups/${groupId}`, opts);
    return res.data;
  },

  async getMessages(groupId: number, limit = 50, offset = 0): Promise<GroupMessage[]> {
    const res = await axios.get(`${API_URL}/api/groups/${groupId}/messages`, {
      ...opts,
      params: { limit, offset },
    });
    return res.data;
  },

  async joinByToken(token: string): Promise<{ groupId: number; groupName: string }> {
    const res = await axios.post(`${API_URL}/api/groups/join/${token}`, {}, opts);
    return res.data;
  },

  async addMembers(groupId: number, memberIds: string[]): Promise<void> {
    await axios.post(`${API_URL}/api/groups/${groupId}/members`, { memberIds }, opts);
  },

  async leave(groupId: number): Promise<void> {
    await axios.delete(`${API_URL}/api/groups/${groupId}/leave`, opts);
  },
};

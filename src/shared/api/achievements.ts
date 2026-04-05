import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_url: string | null;
  unlocked_at: string;
}

export const achievementsApi = {
  async getUserAchievements(): Promise<Achievement[]> {
    const response = await axios.get(`${API_URL}/api/users/achievements`, {
      withCredentials: true,
    });
    return response.data;
  },

  async getUserAchievementsByUserId(userId: string): Promise<Achievement[]> {
    const response = await axios.get(`${API_URL}/api/users/${userId}/achievements`, {
      withCredentials: true,
    });
    return response.data;
  },
};

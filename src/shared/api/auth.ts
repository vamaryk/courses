import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export interface AuthData {
  email: string;
  password: string;
  name?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role?: string;
  name: string;
}

export const authApi = {
  async signUp(data: AuthData): Promise<User> {
    const response = await axios.post(`${API_URL}/api/auth/signup`, data, {
      withCredentials: true,
    });
    const userData = response.data.user;
    // Create name field for backward compatibility
    return {
      ...userData,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
    };
  },

  async signIn(data: AuthData): Promise<User> {
    const response = await axios.post(`${API_URL}/api/auth/signin`, data, {
      withCredentials: true,
    });
    const userData = response.data.user;
    // Create name field for backward compatibility
    return {
      ...userData,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
    };
  },

  async logout(): Promise<void> {
    await axios.post(`${API_URL}/api/auth/logout`, {}, {
      withCredentials: true,
    });
  },

  async getCurrentUser(): Promise<User> {
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      withCredentials: true,
    });
    const userData = response.data;
    // Create name field for backward compatibility
    return {
      ...userData,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
    };
  },
};

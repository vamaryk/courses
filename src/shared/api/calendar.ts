import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface CalendarEvent {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: string;
  location: string | null;
  created_at: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type?: string;
  location?: string | null;
}

export interface UpdateCalendarEventPayload {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type?: string;
  location?: string | null;
}

export const calendarApi = {
  async getEvents(): Promise<CalendarEvent[]> {
    const response = await axios.get(`${API_URL}/api/calendar`, {
      withCredentials: true,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async createEvent(payload: CreateCalendarEventPayload): Promise<CalendarEvent> {
    const response = await axios.post(`${API_URL}/api/calendar`, payload, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateEvent(id: number, payload: UpdateCalendarEventPayload): Promise<CalendarEvent> {
    const response = await axios.put(`${API_URL}/api/calendar/${id}`, payload, {
      withCredentials: true,
    });
    return response.data;
  },

  async deleteEvent(id: number): Promise<void> {
    await axios.delete(`${API_URL}/api/calendar/${id}`, {
      withCredentials: true,
    });
  },
};


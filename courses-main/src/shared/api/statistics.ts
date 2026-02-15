import axios from 'axios';

// Ensure we have a proper base URL with /api prefix
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = API_BASE_URL.endsWith('/') 
  ? `${API_BASE_URL}api` 
  : `${API_BASE_URL}/api`;

export interface CourseStatistics {
  courseId: number;
  totalEnrolled: number;
  totalCompleted: number;
  completionRate: number;
  averageTimeSpent: number;
  chapterStats: {
    chapterId: number;
    chapterTitle: string;
    averageTimeSpent: number;
    completionRate: number;
    subchapterStats: {
      subchapterId: number;
      subchapterTitle: string;
      averageTimeSpent: number;
      completionRate: number;
    }[];
  }[];
  progressOverTime: {
    date: string;
    activeUsers: number;
    completions: number;
  }[];
}

export const statisticsApi = {
  async getCourseStatistics(courseId: number): Promise<CourseStatistics> {
    if (!courseId || isNaN(courseId)) {
      throw new Error('Invalid course ID');
    }
    
    const url = `${API_URL}/statistics/courses/${courseId}`;
    console.log('Fetching statistics from:', url);
    
    try {
      const response = await axios.get(url, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error fetching course statistics:', error);
      throw error;
    }
  },

  async getCompletionRates(courseId: number) {
    const response = await axios.get(`${API_URL}/statistics/courses/${courseId}/completion-rates`);
    return response.data;
  },

  async getTimeSpentData(courseId: number) {
    const response = await axios.get(`${API_URL}/statistics/courses/${courseId}/time-spent`);
    return response.data;
  }
};

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface UserProgress {
  id: number;
  user_id: number;
  course_id: number;
  chapter_id?: number;
  subchapter_id?: number;
  content_block_id?: number;
  is_completed: boolean;
  time_spent: number; // in seconds
  last_accessed: string;
  created_at: string;
  updated_at: string;
}

export interface CourseCompletion {
  id: number;
  user_id: number;
  course_id: number;
  completed_at: string;
  progress_percentage: number;
}

export const progressApi = {
  // Track when a user views a content block
  async trackView(
    courseId: number,
    chapterId?: number,
    subchapterId?: number,
    contentBlockId?: number
  ): Promise<UserProgress> {
    const response = await axios.post(
      `${API_URL}/api/progress/track`,
      {
        course_id: courseId,
        chapter_id: chapterId,
        subchapter_id: subchapterId,
        content_block_id: contentBlockId,
      },
      { withCredentials: true }
    );
    return response.data;
  },

  // Update time spent on a content block
  async updateTimeSpent(
    progressId: number,
    additionalTime: number // in seconds
  ): Promise<UserProgress> {
    const response = await axios.put(
      `${API_URL}/api/progress/${progressId}/time`,
      { additional_time: additionalTime },
      { withCredentials: true }
    );
    return response.data;
  },

  // Mark content as completed
  async markAsCompleted(progressId: number): Promise<UserProgress> {
    const response = await axios.put(
      `${API_URL}/api/progress/${progressId}/complete`,
      {},
      { withCredentials: true }
    );
    return response.data;
  },

  // Get user's progress for a course
  async getCourseProgress(courseId: number): Promise<{
    progress: UserProgress[];
    completion: CourseCompletion | null;
  }> {
    const response = await axios.get(
      `${API_URL}/api/progress/courses/${courseId}/progress`,
      { withCredentials: true }
    );
    return response.data;
  },
};

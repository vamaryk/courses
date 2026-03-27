import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface Course {
  id: number;
  title: string;
  description: string;
  is_public: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  cover_image?: string | null;
  tags?: string[];
  specialty?: string | null;
  target_audience?: string | null;
  about_course?: string | null;
  course_skills?: string[];
  course_tools?: string[];
  certificate_text?: string | null;
  job_title?: string | null;
  chapters?: Chapter[];
  instructor_name?: string;
  instructor_avatar?: string | null;
  price?: number;
  studentsCount?: number;
  hoursPractice?: number;
  hoursTheory?: number;
  is_enrolled?: boolean;
  has_access?: boolean;
  rating?: number;
  my_rating?: number | null;
  /** из GET /api/courses/my */
  students_count?: number;
  favorites_count?: number;
}

export interface CourseAccessStatus {
  courseId: number;
  isPublic: boolean;
  isAuthor: boolean;
  isEnrolled: boolean;
  hasAccess: boolean;
  canViewContent: boolean;
}

export interface Chapter {
  id: number;
  course_id: number;
  title: string;
  order: number;
  subchapters?: Subchapter[];
}

export interface Subchapter {
  id: number;
  chapter_id: number;
  title: string;
  order: number;
  content_blocks?: ContentBlock[];
}

export interface ContentBlock {
  id: number;
  subchapter_id: number;
  type: 'theory' | 'task' | 'test' | 'code_task';
  content: string;
  answer?: string | null;
  order: number;
}

export interface CreateCourseData {
  title: string;
  description: string;
  isPublic: boolean;
  coverImage?: string | null;
  price?: number;
  hoursPractice?: number;
  hoursTheory?: number;
  tags?: string[];
  specialty?: string | null;
  targetAudience?: string | null;
  aboutCourse?: string | null;
  courseSkills?: string[];
  courseTools?: string[];
  certificateText?: string | null;
  jobTitle?: string | null;
}

export interface UpdateCourseData {
  title: string;
  description: string;
  isPublic: boolean;
  coverImage?: string | null;
  price?: number;
  hoursPractice?: number;
  hoursTheory?: number;
  tags?: string[];
  specialty?: string | null;
  targetAudience?: string | null;
  aboutCourse?: string | null;
  courseSkills?: string[];
  courseTools?: string[];
  certificateText?: string | null;
  jobTitle?: string | null;
}

export interface CreateChapterData {
  title: string;
  order: number;
}

export interface UpdateChapterData {
  title: string;
  order: number;
  canvasData?: any | null;
}

export interface CreateSubchapterData {
  title: string;
  order: number;
}

export interface UpdateSubchapterData {
  title: string;
  order: number;
}

export interface CreateContentBlockData {
  type: 'theory' | 'task' | 'test' | 'code_task';
  content: string;
  answer?: string | null;
  order: number;
}

export interface UpdateContentBlockData {
  type: 'theory' | 'task' | 'test' | 'code_task';
  content: string;
  answer?: string | null;
  order: number;
}

export interface UserContentBlockAnswer {
  content_block_id: number;
  user_answer: string;
  is_correct: boolean;
  answered_at?: string;
  updated_at?: string;
}

export const coursesApi = {
  // Get all courses (public courses + user's courses if authenticated)
  async getAllCourses(): Promise<Course[]> {
    const response = await axios.get(`${API_URL}/api/courses`, {
      withCredentials: true,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get all public courses (for browsing) - alias for getAllCourses
  async getAllPublicCourses(): Promise<Course[]> {
    return this.getAllCourses();
  },

  // Get courses created by the logged-in user
  async getMyCourses(): Promise<Course[]> {
    const response = await axios.get(`${API_URL}/api/courses/my`, {
      withCredentials: true,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  // Legacy method - kept for backward compatibility
  async getUserCourses(): Promise<Course[]> {
    return this.getMyCourses();
  },

  async getCourse(id: number): Promise<Course> {
    const response = await axios.get(`${API_URL}/api/courses/${id}`, {
      withCredentials: true,
    });
    // Ensure chapters array exists
    const course = response.data;
    if (!course.chapters) {
      course.chapters = [];
    }
    return course;
  },

  async getCourseAccessStatus(id: number): Promise<CourseAccessStatus> {
    const response = await axios.get(`${API_URL}/api/courses/${id}/access-status`, {
      withCredentials: true,
    });
    return response.data;
  },

  async enrollToCourse(id: number): Promise<void> {
    await axios.post(
      `${API_URL}/api/courses/${id}/enroll`,
      {},
      { withCredentials: true }
    );
  },

  async createCourse(data: CreateCourseData): Promise<Course> {
    const response = await axios.post(`${API_URL}/api/courses`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateCourse(id: number, data: UpdateCourseData): Promise<Course> {
    const response = await axios.put(`${API_URL}/api/courses/${id}`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async uploadCourseCover(courseId: number, file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(
      `${API_URL}/api/courses/${courseId}/upload?type=cover`,
      formData,
      { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async uploadCourseMedia(courseId: number, file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(
      `${API_URL}/api/courses/${courseId}/upload`,
      formData,
      { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async deleteCourse(id: number): Promise<void> {
    await axios.delete(`${API_URL}/api/courses/${id}`, {
      withCredentials: true,
    });
  },

  // Chapters CRUD
  async createChapter(courseId: number, data: CreateChapterData): Promise<Chapter> {
    const response = await axios.post(`${API_URL}/api/courses/${courseId}/chapters`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateChapter(id: number, data: UpdateChapterData): Promise<Chapter> {
    const response = await axios.put(`${API_URL}/api/chapters/${id}`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async deleteChapter(id: number): Promise<void> {
    await axios.delete(`${API_URL}/api/chapters/${id}`, {
      withCredentials: true,
    });
  },

  // Subchapters CRUD
  async getSubchapters(chapterId: number): Promise<Subchapter[]> {
    const response = await axios.get(`${API_URL}/api/chapters/${chapterId}/subchapters`, {
      withCredentials: true,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async createSubchapter(chapterId: number, data: CreateSubchapterData): Promise<Subchapter> {
    const response = await axios.post(`${API_URL}/api/chapters/${chapterId}/subchapters`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateSubchapter(id: number, data: UpdateSubchapterData): Promise<Subchapter> {
    const response = await axios.put(`${API_URL}/api/subchapters/${id}`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async deleteSubchapter(id: number): Promise<void> {
    await axios.delete(`${API_URL}/api/subchapters/${id}`, {
      withCredentials: true,
    });
  },

  // Content Blocks CRUD
  async createContentBlock(subchapterId: number, data: CreateContentBlockData): Promise<ContentBlock> {
    const response = await axios.post(`${API_URL}/api/subchapters/${subchapterId}/contentblocks`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateContentBlock(id: number, data: UpdateContentBlockData): Promise<ContentBlock> {
    const response = await axios.put(`${API_URL}/api/contentblocks/${id}`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  async deleteContentBlock(id: number): Promise<void> {
    await axios.delete(`${API_URL}/api/contentblocks/${id}`, {
      withCredentials: true,
    });
  },

  async getSubchapterAnswers(subchapterId: number): Promise<UserContentBlockAnswer[]> {
    const response = await axios.get(`${API_URL}/api/subchapters/${subchapterId}/answers`, {
      withCredentials: true,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async saveContentBlockAnswer(
    contentBlockId: number,
    userAnswer: string,
    isCorrect: boolean
  ): Promise<UserContentBlockAnswer> {
    const response = await axios.put(
      `${API_URL}/api/contentblocks/${contentBlockId}/answer`,
      { userAnswer, isCorrect },
      { withCredentials: true }
    );
    return response.data;
  },

  // Canvas operations for chapters
  async getChapterCanvas(chapterId: number): Promise<{ canvasData: any }> {
    const response = await axios.get(`${API_URL}/api/chapters/${chapterId}/canvas`, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateChapterCanvas(chapterId: number, canvasData: any): Promise<{ canvasData: any }> {
    const response = await axios.put(`${API_URL}/api/chapters/${chapterId}/canvas`, { canvasData }, {
      withCredentials: true,
    });
    return response.data;
  },

  // Favorites operations
  async getFavorites(): Promise<Course[]> {
    const response = await axios.get(`${API_URL}/api/courses/favorites`, {
      withCredentials: true,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async addToFavorites(courseId: number): Promise<void> {
    await axios.post(`${API_URL}/api/courses/${courseId}/favorite`, {}, {
      withCredentials: true,
    });
  },

  async removeFromFavorites(courseId: number): Promise<void> {
    await axios.delete(`${API_URL}/api/courses/${courseId}/favorite`, {
      withCredentials: true,
    });
  },

  async getFavoriteStatus(courseId: number): Promise<{ isFavorite: boolean }> {
    const response = await axios.get(`${API_URL}/api/courses/${courseId}/favorite/status`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Activity tracking
  async getCourseActivity(courseId: number): Promise<{
    stats: {
      today: string;
      week: string;
      total: string;
    };
    chartData: Array<{ day: string; value: number }>;
  }> {
    const response = await axios.get(`${API_URL}/api/courses/${courseId}/activity`, {
      withCredentials: true,
    });
    return response.data;
  },

  async trackActivity(courseId: number, timeSpentMinutes: number): Promise<void> {
    await axios.post(
      `${API_URL}/api/courses/${courseId}/activity/track`,
      { timeSpentMinutes },
      { withCredentials: true }
    );
  },

  async rateCourse(courseId: number, rating: number): Promise<{ rating: number; my_rating: number }> {
    const response = await axios.post(
      `${API_URL}/api/courses/${courseId}/rate`,
      { rating },
      { withCredentials: true }
    );
    return response.data;
  },
};
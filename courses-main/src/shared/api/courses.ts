import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface Course {
  id: number;
  title: string;
  description: string;
  is_public: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  chapters?: Chapter[];
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
  type: 'theory' | 'task';
  content: string;
  answer?: string | null;
  order: number;
}

export interface CreateCourseData {
  title: string;
  description: string;
  isPublic: boolean;
}

export interface UpdateCourseData {
  title: string;
  description: string;
  isPublic: boolean;
}

export interface CreateChapterData {
  title: string;
  order: number;
}

export interface UpdateChapterData {
  title: string;
  order: number;
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
  type: 'theory' | 'task';
  content: string;
  answer?: string | null;
  order: number;
}

export interface UpdateContentBlockData {
  type: 'theory' | 'task';
  content: string;
  answer?: string | null;
  order: number;
}

export const coursesApi = {
  // Courses CRUD
  async getUserCourses(): Promise<Course[]> {
    const response = await axios.get(`${API_URL}/api/courses`, {
      withCredentials: true,
    });
    return response.data;
  },

  async getCourse(id: number): Promise<Course> {
    const response = await axios.get(`${API_URL}/api/courses/${id}`, {
      withCredentials: true,
    });
    return response.data;
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
};

/** Ответ GET /api/courses/my/dashboard */
export interface AuthorDashboardCourse {
  id: number;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  is_public?: boolean;
  created_at?: string;
  students_count: number;
  rating?: number;
  favorites_count?: number;
}

export interface AuthorDashboard {
  total_students: number;
  average_rating: number | null;
  courses: AuthorDashboardCourse[];
  chart_bars: { name: string; students: number; percentage: number }[];
}

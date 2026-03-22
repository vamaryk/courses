import { Course as ApiCourse, Chapter, ContentBlock } from '@/shared/api/courses';
import { Course as CourseCardCourse } from '@/components/courses/CourseCard';

// Default images for courses
import coursePython1 from "@/assets/course-python-1.jpg";
import coursePython2 from "@/assets/course-python-2.jpg";
import courseData1 from "@/assets/course-data-1.jpg";
import courseDesign1 from "@/assets/course-design-1.jpg";
import courseMarketing1 from "@/assets/course-marketing-1.jpg";
import courseSql1 from "@/assets/course-sql-1.jpg";

const defaultImages = [
  coursePython1,
  coursePython2,
  courseData1,
  courseDesign1,
  courseMarketing1,
  courseSql1,
];

// Helper function to calculate hours from content blocks
function calculateHours(chapters?: Chapter[]): { practice: number; theory: number } {
  if (!chapters || chapters.length === 0) {
    return { practice: 0, theory: 0 };
  }

  let practiceHours = 0;
  let theoryHours = 0;

  chapters.forEach((chapter) => {
    if (chapter.subchapters) {
      chapter.subchapters.forEach((subchapter) => {
        if (subchapter.content_blocks) {
          subchapter.content_blocks.forEach((block: ContentBlock) => {
            // Estimate: each content block = 1 hour
            // You can adjust this logic based on your needs
            if (block.type === 'task') {
              practiceHours += 1;
            } else if (block.type === 'theory') {
              theoryHours += 1;
            }
          });
        }
      });
    }
  });

  return { practice: practiceHours, theory: theoryHours };
}

// Helper function to generate badge from title
function generateBadge(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('python') || titleLower.includes('питон')) {
    return 'Py';
  }
  if (titleLower.includes('data') || titleLower.includes('данн')) {
    return 'DA';
  }
  if (titleLower.includes('design') || titleLower.includes('дизайн') || titleLower.includes('ux') || titleLower.includes('ui')) {
    return 'UX';
  }
  if (titleLower.includes('marketing') || titleLower.includes('маркетинг')) {
    return 'MK';
  }
  if (titleLower.includes('sql')) {
    return 'SQL';
  }
  
  // Default: first two letters of title
  return title.substring(0, 2).toUpperCase();
}

const API_URL = import.meta.env.VITE_API_URL || '';

function getImageUrl(courseId: number, coverImage?: string | null): string {
  if (coverImage) {
    if (coverImage.startsWith('/course-media/')) {
      return `${API_URL}${coverImage}`;
    }
    if (coverImage.startsWith('http') || coverImage.startsWith('data:')) {
      return coverImage;
    }
  }
  const imageIndex = courseId % defaultImages.length;
  return defaultImages[imageIndex];
}

// Helper function to get instructor name from course data
function getInstructorName(course: ApiCourse): string {
  // Use instructor_name from API if available, otherwise fallback to placeholder
  return (course as any).instructor_name || 'Преподаватель';
}

// Helper function to get instructor avatar from course data
function getInstructorAvatar(course: ApiCourse): string | undefined {
  return (course as any).instructor_avatar || undefined;
}

/**
 * Resolve profile media URL (e.g. avatar) to a full URL.
 * Paths like /profile-media/... are prefixed with API_URL.
 */
export function resolveProfileMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/profile-media/')) {
    return `${API_URL}${url}`;
  }
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  return url;
}

/**
 * Resolve a cover_image value to a full URL usable by <img> or CSS background.
 * Returns undefined when there is nothing to show so the caller can fall back.
 */
export function getCoverImageUrl(coverImage?: string | null): string | undefined {
  if (!coverImage) return undefined;
  if (coverImage.startsWith('/course-media/')) {
    return `${API_URL}${coverImage}`;
  }
  if (coverImage.startsWith('http') || coverImage.startsWith('data:')) {
    return coverImage;
  }
  return undefined;
}

/**
 * Transform API Course to CourseCard Course format
 */
export function transformCourseToCardCourse(apiCourse: ApiCourse): CourseCardCourse {
  const { practice, theory } = calculateHours(apiCourse.chapters);
  const apiHoursPractice = (apiCourse as any).hoursPractice;
  const apiHoursTheory = (apiCourse as any).hoursTheory;
  const hoursPractice =
    typeof apiHoursPractice === "number" && apiHoursPractice >= 0
      ? apiHoursPractice
      : practice;
  const hoursTheory =
    typeof apiHoursTheory === "number" && apiHoursTheory >= 0
      ? apiHoursTheory
      : theory;
  const rawPrice: any = (apiCourse as any).price;
  const numericPrice =
    typeof rawPrice === "number"
      ? rawPrice
      : Number(rawPrice);
  const safePrice =
    Number.isFinite(numericPrice) && numericPrice >= 0
      ? numericPrice
      : 0;
  
  return {
    id: apiCourse.id.toString(),
    title: apiCourse.title,
    imageUrl: getImageUrl(apiCourse.id, apiCourse.cover_image),
    badge: generateBadge(apiCourse.title),
    hoursPractice,
    hoursTheory,
    // Стоимость курса в рублях берём из API (PostgreSQL),
    // поддерживаем как числовой, так и строковый тип.
    price: safePrice,
    instructorName: getInstructorName(apiCourse),
    instructorAvatar: getInstructorAvatar(apiCourse),
    isFavorite: false, // Default - will be set by CoursesPage based on API or localStorage
  };
}

/**
 * Transform array of API Courses to CourseCard Courses
 */
export function transformCoursesToCardCourses(apiCourses: ApiCourse[]): CourseCardCourse[] {
  return apiCourses.map(transformCourseToCardCourse);
}

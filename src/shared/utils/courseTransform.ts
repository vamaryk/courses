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

// Helper function to get image URL
function getImageUrl(courseId: number): string {
  // Use course ID to select an image from default images
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
 * Transform API Course to CourseCard Course format
 */
export function transformCourseToCardCourse(apiCourse: ApiCourse): CourseCardCourse {
  const { practice, theory } = calculateHours(apiCourse.chapters);
  
  return {
    id: apiCourse.id.toString(),
    title: apiCourse.title,
    imageUrl: getImageUrl(apiCourse.id),
    badge: generateBadge(apiCourse.title),
    hoursPractice: practice,
    hoursTheory: theory,
    price: 0, // Default price - you can add price field to database if needed
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

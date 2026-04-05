import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";
import { getCoverImageUrl } from "@/shared/utils/courseTransform";

interface CourseCardProps {
  id: number;
  title: string;
  description?: string;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  rating: number;
  price: number;
  category: string;
  language: string;
  authorId?: string;
  cover_image?: string | null;
}

export const CourseCard = ({ course }: { course: CourseCardProps }) => {
  return (
    <CatalogCourseCard
      courseId={course.id}
      title={course.title}
      description={course.description}
      coverUrl={getCoverImageUrl(course.cover_image) || undefined}
      price={course.price}
      rating={course.rating}
      authorName={course.author?.name}
      language={course.language}
      statisticsHref={`/courses/${course.id}/statistics`}
      courseAuthorId={course.author?.id}
      audienceNote={
        course.category ? `Категория: ${course.category}` : undefined
      }
    />
  );
};

import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";

interface CourseCardProps {
  title: string;
  image: string;
  progress: number;
  isCompleted?: boolean;
  courseId?: string | number;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  courseAuthorId?: string | number | null;
}

const CourseCard = ({
  title,
  image,
  progress,
  isCompleted = false,
  courseId,
  authorName,
  authorAvatarUrl,
  courseAuthorId,
}: CourseCardProps) => {
  if (courseId == null || courseId === "") {
    return null;
  }

  return (
    <CatalogCourseCard
      courseId={courseId}
      title={title}
      coverUrl={image}
      progress={{ percent: progress, isCompleted }}
      authorName={authorName ?? undefined}
      authorAvatarUrl={authorAvatarUrl ?? undefined}
      courseAuthorId={courseAuthorId ?? undefined}
      hideCommerceRow
      hideDescription
      size="compact"
    />
  );
};

export default CourseCard;

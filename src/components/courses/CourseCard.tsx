import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";

export interface Course {
  id: string;
  title: string;
  imageUrl: string;
  /** Резерв для совместимости; в единой карточке каталога не показывается */
  badge: string;
  hoursPractice: number;
  hoursTheory: number;
  price: number;
  instructorName: string;
  instructorAvatar?: string;
  isFavorite?: boolean;
  /** Краткое описание для карточки каталога */
  description?: string | undefined;
  rating?: number;
  language?: string | null;
}

interface CourseCardProps {
  course: Course;
  onFavoriteToggle?: (id: string) => void;
  /** Соответствует сетке главной: default — страница курсов, compact — плотные сетки */
  size?: "compact" | "default" | "comfortable";
}

export function CourseCard({
  course,
  onFavoriteToggle,
  size = "default",
}: CourseCardProps) {
  const {
    id,
    title,
    imageUrl,
    price,
    instructorName,
    instructorAvatar,
    isFavorite = false,
    description,
    rating,
    language,
  } = course;

  return (
    <CatalogCourseCard
      courseId={id}
      title={title}
      description={description}
      coverUrl={imageUrl}
      price={price}
      rating={rating}
      authorName={instructorName}
      authorAvatarUrl={instructorAvatar}
      language={language ?? undefined}
      isFavorite={isFavorite}
      onFavoriteToggle={
        onFavoriteToggle ? (cid) => onFavoriteToggle(String(cid)) : undefined
      }
      size={size}
    />
  );
}

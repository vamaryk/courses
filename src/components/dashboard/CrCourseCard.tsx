import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";

interface CrCourseCardProps {
  id: string | number;
  title: string;
  image: string;
  /** Если не задан — карточка без кнопки управления (чужой профиль) */
  manageHref?: string;
}

const CrCourseCard = ({ id, title, image, manageHref }: CrCourseCardProps) => {
  return (
    <CatalogCourseCard
      courseId={id}
      title={title}
      coverUrl={image}
      manageHref={manageHref}
      profileMinimal
      hideDescription
      size="compact"
    />
  );
};

export default CrCourseCard;

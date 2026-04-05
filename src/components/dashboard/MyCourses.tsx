import { useState, useEffect } from "react";
import CourseCard from "./CourseCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getCoverImageUrl } from "@/shared/utils/courseTransform";

const API_URL = import.meta.env.VITE_API_URL || '';
const defaultCourseImage = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop';

interface Course {
  id?: number | string;
  title: string;
  image: string | null;
  progress: number;
  isCompleted?: boolean;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  courseAuthorId?: string | null;
}

function asRecord(x: unknown): Record<string, unknown> {
  return x != null && typeof x === "object" ? (x as Record<string, unknown>) : {};
}

/** Ответ API: camelCase или snake_case */
function normalizeProfileCourse(raw: unknown): Course {
  const r = asRecord(raw);
  const authorName =
    (r.authorName as string | undefined) ??
    (r.author_name as string | undefined) ??
    null;
  const authorAvatarUrl =
    (r.authorAvatarUrl as string | undefined) ??
    (r.author_avatar_url as string | undefined) ??
    null;
  const courseAuthorIdRaw =
    r.courseAuthorId ?? r.course_author_id ?? r.author_profile_id;
  return {
    id: r.id as number | string,
    title: String(r.title ?? ""),
    image: (r.image as string | null) ?? null,
    progress: Number(r.progress) || 0,
    isCompleted: Boolean(r.isCompleted ?? r.is_completed),
    authorName,
    authorAvatarUrl,
    courseAuthorId:
      courseAuthorIdRaw != null && courseAuthorIdRaw !== ""
        ? String(courseAuthorIdRaw)
        : null,
  };
}

interface MyCoursesProps {
  profileId?: string;
}

// Хук для определения количества видимых элементов в зависимости от ширины экрана
const useCarouselBreakpoint = (): number => {
  const [visibleItems, setVisibleItems] = useState(5);

  useEffect(() => {
    const calculateVisibleItems = () => {
      if (window.innerWidth >= 1024) return 5;
      if (window.innerWidth >= 768) return 3;
      return 2;
    };

    setVisibleItems(calculateVisibleItems());

    const handleResize = () => {
      setVisibleItems(calculateVisibleItems());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return visibleItems;
};

const MyCourses = ({ profileId }: MyCoursesProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  
  const visibleItems = useCarouselBreakpoint();

  useEffect(() => {
    if (!carouselApi) return;

    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    updateScrollState();
    carouselApi.on('select', updateScrollState);
    carouselApi.on('reInit', updateScrollState);

    return () => {
      carouselApi.off('select', updateScrollState);
      carouselApi.off('reInit', updateScrollState);
    };
  }, [carouselApi]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const url = profileId
          ? `${API_URL}/api/users/${profileId}/courses`
          : `${API_URL}/api/users/profile/courses`;
        const response = await fetch(url, {
          credentials: 'include',
        });
        if (response.ok) {
          const data: unknown = await response.json();
          setCourses(
            Array.isArray(data) ? data.map(normalizeProfileCourse) : [],
          );
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [profileId]);

  // Показываем стрелки только если элементов больше, чем видно, и есть куда скроллить
  const showArrows = courses.length > visibleItems && (canScrollPrev || canScrollNext);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Обучение</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Обучение</h2>
        </div>
        <div className="text-sm text-muted-foreground py-4">
          {profileId
            ? 'Пользователь пока не записан ни на один курс.'
            : 'У вас пока нет записанных курсов'}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Обучение</h2>
      </div>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
        setApi={setCarouselApi}
      >
        <CarouselContent className="-ml-1 md:-ml-2">
          {courses.map((course) => (
            <CarouselItem key={course.id ?? course.title} className="pl-1 md:pl-2 basis-1/2 md:basis-1/3 lg:basis-1/5">
              <CourseCard
                courseId={course.id}
                title={course.title}
                image={getCoverImageUrl(course.image) || defaultCourseImage}
                progress={course.progress}
                isCompleted={course.isCompleted}
                authorName={course.authorName}
                authorAvatarUrl={course.authorAvatarUrl}
                courseAuthorId={course.courseAuthorId}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {showArrows && (
          <>
            <CarouselPrevious 
              className="sm:flex -left-4 h-10 w-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            />
            <CarouselNext 
              className="sm:flex -right-4 h-10 w-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            />
          </>
        )}
      </Carousel>
    </section>
  );
};

export default MyCourses;
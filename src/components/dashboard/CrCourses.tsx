import { useState, useEffect } from "react";
import CrCourseCard from "./CrCourseCard";
import CreateCourseCard from "./CreateCourse";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getCoverImageUrl } from "@/shared/utils/courseTransform";

const API_URL = import.meta.env.VITE_API_URL || '';
const defaultCourseImage = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop';

interface CreatedCourse {
  id: string | number;
  title: string;
  description: string;
  cover_image?: string | null;
  image?: string;
  favoritesCount: number;
  studentsCount: number;
  is_public: boolean;
  createdAt: string;
}

interface CrCoursesProps {
  profileId?: string;
}

const CrCourses = ({ profileId }: CrCoursesProps) => {
  const [courses, setCourses] = useState<CreatedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatedCourses = async () => {
      try {
        const url = profileId
          ? `${API_URL}/api/users/${profileId}/courses/authored`
          : `${API_URL}/api/courses/my`;
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Необходима авторизация');
          } else if (response.status === 403) {
            setError('Доступ запрещен');
          } else {
            setError('Ошибка при загрузке курсов');
          }
          return;
        }

        const data = await response.json();
        setCourses(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching created courses:', err);
        setError('Ошибка сети. Проверьте подключение.');
      } finally {
        setLoading(false);
      }
    };

    fetchCreatedCourses();
  }, []);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Созданные курсы</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Созданные курсы</h2>
        </div>
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Созданные курсы</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-1/2 lg:w-1/5">
            <CreateCourseCard />
          </div>
          <p className="text-sm text-gray-500 p-4">
            У вас пока нет созданных курсов
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Созданные курсы</h2>
      </div>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-1 md:-ml-2">
          {/* Create course card - always first */}
          <CarouselItem className="pl-1 md:pl-2 basis-1/2 lg:basis-1/5">
            <CreateCourseCard />
          </CarouselItem>
          
          {/* Created courses */}
          {courses.map((course) => (
            <CarouselItem key={course.id} className="pl-1 md:pl-2 basis-1/2 lg:basis-1/5">
              <CrCourseCard
                id={course.id}
                title={course.title}
                image={getCoverImageUrl(course.cover_image || course.image) || defaultCourseImage}
                favoritesCount={course.favoritesCount || 0}
                studentsCount={course.studentsCount || 0}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="sm:flex -left-4" />
        <CarouselNext className="sm:flex -right-4" />
      </Carousel>
    </section>
  );
};

export default CrCourses;
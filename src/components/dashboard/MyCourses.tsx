import { useState, useEffect } from "react";
import CourseCard from "./CourseCard";
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

interface Course {
  id?: number;
  title: string;
  image: string | null;
  progress: number;
  isCompleted?: boolean;
}
interface MyCoursesProps {
  profileId?: string;
}

const MyCourses = ({ profileId }: MyCoursesProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
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
          const data = await response.json();
          setCourses(data);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [profileId]);
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
          У вас пока нет записанных курсов
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
      >
        <CarouselContent className="-ml-1 md:-ml-2">
          {courses.map((course) => (
            <CarouselItem key={course.id ?? course.title} className="pl-1 md:pl-2 basis-1/2 md:basis-1/3 lg:basis-1/5">
              <CourseCard
                title={course.title}
                image={getCoverImageUrl(course.image) || defaultCourseImage}
                progress={course.progress}
                isCompleted={course.isCompleted}
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
export default MyCourses;

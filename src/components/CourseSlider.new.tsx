import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CourseCard } from './CourseCard';
import type { CourseWithAuthor } from '@/widgets/HomePage';

interface CourseSliderProps {
  courses: CourseWithAuthor[];
  title?: string;
  className?: string;
}

export const CourseSlider = ({ 
  courses = [], 
  title, 
  className = '' 
}: CourseSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState(4);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Update number of cards to show based on container width
  useEffect(() => {
    const updateCardsToShow = () => {
      const width = window.innerWidth;
      if (width < 640) setCardsToShow(1);
      else if (width < 768) setCardsToShow(2);
      else if (width < 1024) setCardsToShow(3);
      else setCardsToShow(4);
    };

    updateCardsToShow();
    window.addEventListener('resize', updateCardsToShow);
    return () => window.removeEventListener('resize', updateCardsToShow);
  }, []);

  const nextSlide = () => {
    setCurrentIndex(prev => 
      prev >= Math.max(0, courses.length - cardsToShow) ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex(prev => 
      prev <= 0 ? Math.max(0, courses.length - cardsToShow) : prev - 1
    );
  };

  // Don't render if no courses
  if (!courses.length) return null;

  // Calculate the visible courses based on currentIndex and cardsToShow
  const visibleCourses = [...courses, ...courses.slice(0, cardsToShow - 1)]
    .slice(currentIndex, currentIndex + cardsToShow);

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {courses.length > cardsToShow && (
            <div className="flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                aria-label="Предыдущий слайд"
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                aria-label="Следующий слайд"
                disabled={currentIndex >= courses.length - cardsToShow}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="relative w-full overflow-hidden">
        <div 
          ref={sliderRef}
          className="flex gap-6 transition-transform duration-300 ease-in-out"
        >
          {visibleCourses.map((course, index) => (
            <div 
              key={`${course.id}-${index}`} 
              className="flex-shrink-0"
              style={{ width: `calc((100% - ${(cardsToShow - 1) * 1.5}rem) / ${cardsToShow})` }}
            >
              <CourseCard course={{
                id: course.id,
                title: course.title,
                description: course.description,
                author: course.author,
                rating: course.rating || 0,
                price: course.price || 0,
                category: course.category || 'Без категории',
                language: course.language || 'Русский',
                authorId: course.author?.id?.toString(),
                cover_image: course.cover_image,
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

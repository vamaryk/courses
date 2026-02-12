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
      category: 'Маркетинг',
      language: 'Русский',
      price: 13990
    },
    {
      id: 8,
      title: 'Python для начинающих',
      description: 'Основы программирования на Python',
      author: 'Михаил Петров',
      rating: 4.7,
      image: '/course8.jpg',
      category: 'Программирование',
      language: 'Русский',
      price: 11990
    },
    // Slide 3
    {
      id: 9,
      title: 'Веб-дизайн с нуля',
      description: 'Основы веб-дизайна и работа в Figma',
      author: 'Алиса Смирнова',
      rating: 4.8,
      image: '/course9.jpg',
      category: 'Дизайн',
      language: 'Русский',
      price: 14990
    },
    {
      id: 10,
      title: 'Мобильный дизайн',
      description: 'UI/UX дизайн мобильных приложений',
      author: 'Артем Васильев',
      rating: 4.6,
      image: '/course10.jpg',
      category: 'Дизайн',
      language: 'Русский',
      price: 15990
    },
    {
      id: 11,
      title: 'JavaScript продвинутый',
      description: 'Продвинутые техники JavaScript',
      author: 'Сергей Николаев',
      rating: 4.9,
      image: '/course11.jpg',
      category: 'Frontend',
      language: 'Русский',
      price: 17990
    },
    {
      id: 12,
      title: 'Базы данных SQL',
      description: 'Работа с базами данных и SQL',
      author: 'Андрей Кузнецов',
      rating: 4.7,
      image: '/course12.jpg',
      category: 'Базы данных',
      language: 'Русский',
      price: 13990
    }
  ];

  // Split courses into slides (4 courses per slide)
  const slides: CourseCardProps[][] = [];
  for (let i = 0; i < allCourses.length; i += 4) {
    slides.push(allCourses.slice(i, i + 4));
  }

  const totalSlides = slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };
  
  // Clean up duplicate useEffect
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 10000);

    return () => clearInterval(timer);
  }, [currentSlide, isPaused, slides.length]);

  // Auto slide effect
  useEffect(() => {
    const timer = setTimeout(() => {
      nextSlide();
    }, 10000);

    return () => clearTimeout(timer);
  }, [currentIndex]);

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
                ...course,
                author: course.author?.name || 'Автор не указан',
                rating: course.rating || 0,
                price: course.price || 0,
                category: course.category || 'Без категории',
                language: course.language || 'Русский',
                authorId: course.author?.id?.toString()
              }} />
            </div>
          ))}
        </div>
      </div>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-2 shadow-lg z-10 transition-all duration-200"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center mt-6 space-x-2">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

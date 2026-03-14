import { Users, Star, BookOpen, Search, ChevronDown, Palette, Megaphone, Briefcase, Database, MessageSquare, Heart, CreditCard, X, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { coursesApi, type Course } from '@/shared/api/courses';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import heroFallbackCover from '@/assets/course-python-1.jpg';
import FilterContent from '@/components/courses/FilterContent';
import { useAuth } from '@/app/providers/AuthProvider';

const API_URL = import.meta.env.VITE_API_URL || '';

interface CourseWithAuthor extends Omit<Course, 'author_id'> {
  author_id: string | number;
  is_public: boolean;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  authorId?: string;
  level?: 'Начинающий' | 'Средний' | 'Продвинутый';
  language?: 'Русский' | 'Английский';
  price?: number;
  durationHours?: number;
  rating?: number;
  studentsCount?: number;
}

// Константы для диапазонов
const DURATION_MIN = 0;
const DURATION_MAX_DEFAULT = 100;

// Структура для направлений и подкатегорий
const CATEGORIES = [
  { id: 'development', label: 'Разработка', icon: BookOpen, keywords: ['разработка', 'программирование', 'код', 'javascript', 'python', 'react', 'go', 'php'], subcategories: ['JavaScript', 'Python', 'React', 'Go', 'PHP'], gradient: 'from-violet-500 to-purple-600', hoverGradient: 'from-purple-600 to-violet-700' },
  { id: 'design', label: 'Дизайн', icon: Palette, keywords: ['дизайн', 'ui', 'ux', 'figma'], subcategories: [], gradient: 'from-pink-500 to-rose-600', hoverGradient: 'from-rose-600 to-pink-700' },
  { id: 'marketing', label: 'Маркетинг', icon: Megaphone, keywords: ['маркетинг', 'seo', 'smm', 'реклама'], subcategories: [], gradient: 'from-amber-500 to-orange-600', hoverGradient: 'from-orange-600 to-amber-700' },
  { id: 'business', label: 'Бизнес', icon: Briefcase, keywords: ['бизнес', 'менеджмент', 'стартап'], subcategories: [], gradient: 'from-emerald-500 to-teal-600', hoverGradient: 'from-teal-600 to-emerald-700' },
  { id: 'data_science', label: 'Data Science', icon: Database, keywords: ['данные', 'аналитика', 'data science', 'ai', 'ml'], subcategories: [], gradient: 'from-cyan-500 to-blue-600', hoverGradient: 'from-blue-600 to-cyan-700' },
  { id: 'soft_skills', label: 'Soft Skills', icon: MessageSquare, keywords: ['soft skills', 'общение', 'лидерство'], subcategories: [], gradient: 'from-fuchsia-500 to-indigo-600', hoverGradient: 'from-indigo-600 to-fuchsia-700' },
];

const sortOptionsList = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'price', label: 'По цене' },
  { value: 'rating', label: 'По рейтингу' },
];

const roundPriceToTenThousand = (price: number): number => {
  return Math.ceil(price / 1000) * 1000;
};

// Компонент анимированной частицы для фона
const FloatingParticle = ({ 
  delay, 
  duration, 
  size, 
  left, 
  top,
  className = "animate-float"
}: { 
  delay: number; 
  duration: number; 
  size: number; 
  left: string; 
  top: string;
  className?: string;
}) => (
  <div
    className={`absolute rounded-full bg-white/20 ${className}`}
    style={{
      width: size,
      height: size,
      left,
      top,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      filter: 'blur(1px)',
    }}
  />
);

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<CourseWithAuthor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const [priceMax, setPriceMax] = useState<number>(100000);
  const [durationMax, setDurationMax] = useState<number>(DURATION_MAX_DEFAULT);

  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [durationRange, setDurationRange] = useState<[number, number]>([DURATION_MIN, DURATION_MAX_DEFAULT]);

  const [sortOption, setSortOption] = useState('popularity');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const [favorites, setFavorites] = useState<Set<string | number>>(new Set());

  // Загрузка избранного
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        if (isAuthenticated) {
          const response = await coursesApi.getFavorites?.();
          if (Array.isArray(response)) {
            const favoriteIds = new Set<string | number>(
              response.map((f: any) => f.courseId || f.id || f.course_id)
            );
            setFavorites(favoriteIds);
          }
        } else {
          const saved = localStorage.getItem('courseFavorites');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setFavorites(new Set(parsed));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load favorites:', err);
        const saved = localStorage.getItem('courseFavorites');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setFavorites(new Set(parsed));
          }
        }
      }
    };
    loadFavorites();
  }, [isAuthenticated]);

  const handleFavoriteToggle = async (id: number) => {
    const courseId = id;
    const isCurrentlyFavorite = favorites.has(courseId);
    const newFavoriteStatus = !isCurrentlyFavorite;
    
    setFavorites(prev => {
      const next = new Set(prev);
      if (newFavoriteStatus) next.add(courseId);
      else next.delete(courseId);
      return next;
    });
    
    try {
      if (isAuthenticated) {
        if (newFavoriteStatus) await coursesApi.addToFavorites?.(courseId);
        else await coursesApi.removeFromFavorites?.(courseId);
      } else {
        const updatedFavorites = Array.from(
          newFavoriteStatus 
            ? new Set([...favorites, courseId]) 
            : new Set([...favorites].filter(fid => fid != courseId))
        );
        localStorage.setItem('courseFavorites', JSON.stringify(updatedFavorites));
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
      setFavorites(prev => {
        const next = new Set(prev);
        if (isCurrentlyFavorite) next.add(courseId);
        else next.delete(courseId);
        return next;
      });
    }
  };

  const isCourseFavorite = (courseId: string | number): boolean => favorites.has(courseId);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesApi.getAllCourses();
        const allCourses = Array.isArray(response) ? response as unknown as CourseWithAuthor[] : [];
        const publicCourses = allCourses.filter(course =>
          course && course.is_public === true && course.id && course.title
        );
        
        setCourses(publicCourses);

        const maxPrice = publicCourses.reduce((max, course) => {
          const price = course.price || 0;
          return price > max ? price : max;
        }, 0);
        const calculatedPriceMax = roundPriceToTenThousand(maxPrice);
        setPriceMax(calculatedPriceMax);
        setPriceRange([0, calculatedPriceMax]);

        const maxDuration = publicCourses.reduce((max, course) => {
          const duration = course.durationHours || 0;
          return duration > max ? duration : max;
        }, 0);
        const calculatedDurationMax = maxDuration > 0 ? maxDuration : DURATION_MAX_DEFAULT;
        setDurationMax(calculatedDurationMax);
        setDurationRange([DURATION_MIN, calculatedDurationMax]);

      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };
    fetchCourses();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const isCurrentlySelected = prev.includes(id);
      if (id === 'development' && isCurrentlySelected) {
        setSelectedSubcategories([]);
        return prev.filter(c => c !== id);
      }
      return isCurrentlySelected ? prev.filter(c => c !== id) : [...prev, id];
    });
  };

  const toggleSubcategory = (sub: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const filteredCourses = courses.filter(course => {
    if (!course.id || !course.title) return false;
    if (!course.is_public) return false;

    const searchLower = searchQuery.toLowerCase();
    const courseTitleLower = course.title.toLowerCase();
    const courseDescLower = (course.description || '').toLowerCase();

    const matchesSearch = searchQuery === '' ||
      courseTitleLower.includes(searchLower) ||
      courseDescLower.includes(searchLower);

    const matchesLevel = selectedLevels.length === 0 ||
      (course.level && selectedLevels.includes(course.level));

    const matchesLanguage = selectedLanguages.length === 0 ||
      (course.language && selectedLanguages.includes(course.language));

    const coursePrice = course.price || 0;
    const matchesPrice = coursePrice >= priceRange[0] && coursePrice <= priceRange[1];

    const courseDuration = course.durationHours || 0;
    const matchesDuration = courseDuration >= durationRange[0] && courseDuration <= durationRange[1];

    let matchesCategory = true;
    if (selectedCategories.length > 0 || selectedSubcategories.length > 0) {
      matchesCategory = false;
      if (selectedSubcategories.length > 0) {
        const subKeywords = selectedSubcategories.map(s => s.toLowerCase());
        if (subKeywords.some(keyword => courseTitleLower.includes(keyword) || courseDescLower.includes(keyword))) {
          matchesCategory = true;
        }
      }
      if (!matchesCategory && selectedCategories.length > 0) {
        const activeKeywords: string[] = [];
        selectedCategories.forEach(id => {
          const category = CATEGORIES.find(c => c.id === id);
          if (category) {
            if (id === 'development') {
              activeKeywords.push('разработка', 'программирование', 'код');
            } else {
              activeKeywords.push(...category.keywords);
            }
          }
        });
        if (activeKeywords.some(keyword => courseTitleLower.includes(keyword) || courseDescLower.includes(keyword))) {
          matchesCategory = true;
        }
      }
    }

    return matchesSearch && matchesLevel && matchesLanguage && matchesPrice && matchesDuration && matchesCategory;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortOption) {
      case 'price': return (a.price || 0) - (b.price || 0);
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'popularity':
      default: return (b.studentsCount || 0) - (a.studentsCount || 0);
    }
  });

  const popularCourses = [...courses]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const selectedSortLabel = sortOptionsList.find(opt => opt.value === sortOption)?.label || 'По популярности';

  const handlePriceInput = (index: 0 | 1, value: string) => {
    let numValue = parseInt(value);
    if (isNaN(numValue)) numValue = index === 0 ? 0 : priceMax;
    let newMin = priceRange[0];
    let newMax = priceRange[1];
    if (index === 0) newMin = Math.max(0, Math.min(numValue, newMax));
    else newMax = Math.min(priceMax, Math.max(numValue, newMin));
    setPriceRange([newMin, newMax]);
  };

  const handleDurationInput = (index: 0 | 1, value: string) => {
    let numValue = parseInt(value);
    if (isNaN(numValue)) numValue = index === 0 ? DURATION_MIN : durationMax;
    let newMin = durationRange[0];
    let newMax = durationRange[1];
    if (index === 0) newMin = Math.max(DURATION_MIN, Math.min(numValue, newMax));
    else newMax = Math.min(durationMax, Math.max(numValue, newMin));
    setDurationRange([newMin, newMax]);
  };

  const isDevelopmentSelected = selectedCategories.includes('development');

  const filterProps = {
    selectedLevels, setSelectedLevels,
    selectedLanguages, setSelectedLanguages,
    selectedCategories, toggleCategory,
    selectedSubcategories, toggleSubcategory,
    priceRange, setPriceRange,
    durationRange, setDurationRange,
    isDevelopmentSelected,
    handlePriceInput, handleDurationInput,
    priceMax, durationMax,
    categories: CATEGORIES,
  };

  const [currentPage, setCurrentPage] = useState(1);
  const COURSES_PER_PAGE = 15;
  const totalPages = Math.ceil(sortedCourses.length / COURSES_PER_PAGE);
  const paginatedCourses = sortedCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE
  );

  const scrollToCourses = () => {
    document.getElementById('courses-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      scrollToCourses();
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const getShortDescription = (text?: string | null, maxLength: number = 90) => {
    if (!text) return 'Описание отсутствует';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}…`;
  };

  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-background">
      {/* Глобальные стили для анимаций */}
      <style>{`
        @keyframes float {
        0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
        50% { transform: translateY(-20px) translateX(10px); opacity: 1; }
        }
        @keyframes gradient-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        }
        @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); }
        50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); }
        }
        @keyframes slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
        }
        @keyframes border-flow {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
        }
        /* Новая анимация для диагональных частиц */
        @keyframes diagonal-fly {
        0% {
            transform: translate(0, 0);
            opacity: 0;
        }
        10% {
            opacity: 0.4;
        }
        90% {
            opacity: 0.4;
        }
        100% {
            transform: translate(150vw, -150vh);
            opacity: 0;
        }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-gradient {
        background-size: 200% 200%;
        animation: gradient-shift 8s ease infinite;
        }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        .animate-shimmer {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
        }
        .animate-border-flow {
        background-size: 200% 100%;
        animation: border-flow 3s linear infinite;
        }
        /* Класс для диагональных частиц */
        .animate-diagonal {
        animation: diagonal-fly linear infinite;
        }
        .glass-card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .category-card {
        position: relative;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        transition: all 0.5s ease;
        }
        .category-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 2px;
        background: linear-gradient(90deg, #a855f7, #ec4899, #06b6d4, #a855f7);
        background-size: 300% 100%;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: border-flow 3s linear infinite;
        opacity: 0.7;
        }
        .category-card:hover::before {
        opacity: 1;
        padding: 3px;
        }
        .category-card:hover .category-icon {
        transform: scale(1.1) rotate(5deg);
        }
        .category-card:hover .category-arrow {
        transform: translateX(4px);
        opacity: 1;
        }
        `}</style>

      {/* ========== HERO SECTION ========== */}
        <div className="px-4 sm:px-6 lg:px-[20px] pb-4">
        <div ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl px-4 sm:px-6 lg:px-[20px] py-12 sm:py-16 lg:py-20">
            {/* Анимированный фон с частицами */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
            <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-80 sm:h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute bottom-0 right-1/4 w-56 h-56 sm:w-72 sm:h-72 bg-pink-500/25 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-full blur-3xl animate-gradient" />
            
            {/* Оригинальные плавающие частицы */}
            {[...Array(10)].map((_, i) => (
                <FloatingParticle
                key={i}
                delay={i * 0.5}
                duration={8 + i % 4}
                size={3 + (i % 3) * 2}
                left={`${10 + (i % 5) * 18}%`}
                top={`${15 + Math.floor(i / 5) * 40}%`}
                />
            ))}
            
            {/* ДИАГОНАЛЬНЫЕ ЧАСТИЦЫ - больше частиц с разными траекториями */}
            {[...Array(20)].map((_, i) => (
                <FloatingParticle
                key={`diagonal-${i}`}
                delay={i * 0.4}
                duration={12 + (i % 6) * 2}
                size={4 + (i % 3)}
                left={`${5 + (i % 10) * 9}%`}
                top={`${65 + Math.floor(i / 10) * 15}%`}
                className="animate-diagonal"
                />
            ))}
            
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:35px_35px] rounded-xl" />
            </div>

            <div className="relative z-10">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full glass-card mb-4 sm:mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
                <span className="text-xs sm:text-sm font-medium text-white/90"> С ИИ-ассистентом<sup>**</sup> </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-Xolonium text-white leading-tight mb-4 sm:mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                САМАЯ ЛУЧШАЯ<sup>*</sup> <br />
                <span>ПЛОЩАДКА </span>
                    <span className="font-RubikGlitch bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent animate-gradient">
                    ОНЛАЙН-
                    </span>
                <span className="font-RubikGlitch text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300">
                    КУРСОВ
                </span>
                </h1>

                <p className="text-sm sm:text-base lg:text-lg text-purple-100/90 max-w-xl mx-auto mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                Найдите идеальный курс для Вашего развития — от программирования до дизайна и маркетинга. 
                <span className="block mt-2 sm:mt-4 text-purple-200/80 text-xs sm:text-sm">Начните учиться сегодня, измените завтра.</span>
                </p>
            </div>
            </div>
        </div>
        </div>

      {/* ========== КАТЕГОРИИ - С ГРАДИЕНТНОЙ ОБВОДКОЙ ========== */}
        <div className="relative w-full mt-2 lg:mt-4 px-10">

        {/* Декоративная полоса на фоне */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none z-0">
            <div className="h-px bg-gradient-to-r from-transparent via-purple-300/40 to-transparent" />
        </div>

        {/* Сетка категорий: 2 колонки на мобильных, 3 на планшетах, 6 на десктопе */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {CATEGORIES.map((item, index) => (
            <div
                key={index}
                className="animated-gradient animated-gradient-block flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 border-purple/30 backdrop-blur-lg shadow-sm rounded-xl transition-all duration-300 justify-center sm:justify-start"
            >
                {/* Контейнер иконки с фоном */}
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-100/60 flex items-center justify-center border border-purple-200/50">
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                </div>

                {/* Текст справа */}
                <span className="text-xs sm:text-sm font-medium text-gray-700 text-center sm:text-left truncate">
                {item.label}
                </span>
            </div>
            ))}
        </div>
        </div>

      {/* ========== POPULAR COURSES SECTION ========== */}
      <div className="bg-background py-12 lg:py-16">
        <div className="px-4 sm:px-6 lg:px-[40px]">
          <div className="text-center mb-4 lg:mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold font-Xolonium text-gray-900">
              Популярно на этой неделе
            </h2>
            <div className="mt-4 h-1 w-20 bg-gradient-to-r from-purple to-blue mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 lg:gap-4">
            {popularCourses.length > 0 ? popularCourses.map((course) => {
              const coverUrl = course.cover_image
                ? `${API_URL}${course.cover_image}`
                : heroFallbackCover;
              const rawPrice = Number(course.price || 0);
              const priceLabel = rawPrice > 0
                ? `${rawPrice.toLocaleString('ru-RU')} ₽`
                : 'Бесплатно';
              return (
                <div
                  key={course.id}
                  className="bg-background rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-shadow duration-300 flex flex-col"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={coverUrl}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-background/80 backdrop-blur-sm text-purple-600 text-xs font-medium rounded-full">
                        {course.is_public ? 'Публичный' : 'Приватный'}
                      </span>
                    </div>
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleFavoriteToggle(course.id);
                      }}
                      className={`absolute top-2 right-2 p-1 rounded-full transition-all ${
                        isCourseFavorite(course.id)
                          ? 'bg-white text-red-500'
                          : 'bg-white/70 hover:bg-white text-gray-500'
                      }`}
                      aria-label={isCourseFavorite(course.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                      type="button"
                    >
                      <Heart className={`w-4 h-4 ${isCourseFavorite(course.id) ? 'fill-current' : ''}`} />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-xs font-medium text-gray-900">
                          {course.rating ? course.rating.toFixed(1) : '4.8'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-purple text-white px-2 py-1 rounded-full text-xs font-semibold">
                        <CreditCard className="w-3 h-3" />
                        <span>{priceLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 lg:p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                      {getShortDescription(course.description)}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                          <Users className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-xs text-gray-500 line-clamp-1">
                          {course.author?.name || 'Автор не указан'}
                        </span>
                      </div>
                    </div>
                    <Button asChild className="w-full mt-4 bg-purple text-white font-medium hover:bg-purple-600">
                      <Link to={`/courses/${course.id}`}>Подробнее</Link>
                    </Button>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500">Популярные курсы не найдены</h3>
                <p className="text-gray-400 mt-1">Попробуйте изменить параметры поиска</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== MAIN COURSES SECTION ========== */}
      <div className="py-2 sm:py-4 lg:py-6 bg-background">
        <div className="px-4 sm:px-6 lg:px-[40px]">
          <div className="text-center mb-4 sm:mb-5 lg:mb-6">
            <h2 className="text-2xl sm:text-3xl font-semibold font-Xolonium text-gray-900 mb-3 sm:mb-4">Курсы</h2>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              {[
                'Программирование', 'Дизайн', 'Маркетинг', 'Бизнес', 'React',
                'JavaScript', 'Python', 'UI/UX', 'SEO', 'Копирайтинг'
              ].map((tag) => (
                <button
                  key={tag}
                  className="animated-gradient animated-gradient-button px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-purple/30 text-gray-700 font-medium rounded-xl text-xs sm:text-sm hover:shadow-lg transition-all duration-300"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Filters Sidebar (DESKTOP ONLY) */}
            <div className="w-full lg:w-64 flex-shrink-0 hidden lg:block">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 font-Xolonium">Фильтры</h3>
              <FilterContent {...filterProps} />
            </div>
            {/* Courses Grid */}
            <div id="courses-grid" className="flex-1">
              {/* Header: Sort, Filter Button (Mobile), Search */}
              <div className="flex flex-col gap-4 mb-6 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4 w-full lg:w-auto">
                  {/* Custom Sort Dropdown */}
                  <div className="relative flex-1 lg:w-[200px] lg:flex-none">
                    <button
                      type="button"
                      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      className="appearance-none flex items-center justify-between pl-3 sm:pl-4 pr-10 py-2 border border-gray rounded-lg text-xs sm:text-sm w-full text-left"
                    >
                      {selectedSortLabel}
                      <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4 text-gray-500 transition-transform ${isSortDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                    {isSortDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 shadow-lg rounded-lg overflow-hidden">
                        {sortOptionsList.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => {
                              setSortOption(option.value);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`
                              py-2 px-4 cursor-pointer text-xs sm:text-sm
                              hover:bg-gray-100
                              ${option.value === sortOption ? 'bg-gray-50 font-medium' : ''}
                            `}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Mobile Filter Button */}
                  <button
                    type="button"
                    className="flex-1 lg:hidden appearance-none flex items-center justify-center pl-3 sm:pl-4 pr-3 sm:pr-4 py-2 border border-gray rounded-lg text-xs sm:text-sm w-full"
                    onClick={() => setIsMobileFilterOpen(true)}
                  >
                    Фильтры
                  </button>
                </div>
                {/* Search Input */}
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Поиск курсов..."
                    className="pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              {/* Course Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-4">
                {paginatedCourses.length > 0 ? paginatedCourses.map((course) => (
                  <div key={course.id} className="relative bg-background rounded-xl sm:rounded-2xl shadow-md overflow-hidden group hover:shadow-lg transition-shadow duration-300 flex flex-col">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={course.cover_image ? `${API_URL}${course.cover_image}` : heroFallbackCover}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleFavoriteToggle(course.id);
                        }}
                        className={`absolute top-2 right-2 p-1 rounded-full transition-all ${
                          isCourseFavorite(course.id)
                            ? 'bg-white text-red-500'
                            : 'bg-white/70 hover:bg-white text-gray-500'
                        }`}
                        aria-label={isCourseFavorite(course.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                        type="button"
                      >
                        <Heart className={`w-4 h-4 ${isCourseFavorite(course.id) ? 'fill-current' : ''}`} />
                      </button>
                      <div className="absolute top-2 left-2 flex gap-2">
                        {course.language && (
                          <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
                            {course.language}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="block flex-1 p-3 sm:p-4 lg:p-3 flex flex-col"
                    >
                      <h3 className="lg:text-lg sm:text-xs font-semibold text-gray-900 mb-2 line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2 min-h-[40px]">
                        {getShortDescription(course.description)}
                      </p>
                      <div className="border-t border-gray-100 mt-auto pt-1">
                        <div className="pt-1 flex items-center justify-between flex-wrap gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-[120px] flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-xs text-gray-500 line-clamp-1">
                              {course.author?.name || 'Автор не указан'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 border-2 rounded-full px-2 py-1">
                            <CreditCard className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-bold text-gray-900">
                              {course.price && course.price > 0
                                ? `${Number(course.price).toLocaleString('ru-RU')} ₽`
                                : 'Бесплатно'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500">Курсы не найдены</h3>
                    <p className="text-gray-400 mt-1">Попробуйте изменить параметры поиска</p>
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedLevels([]);
                        setSelectedLanguages([]);
                        setSelectedCategories([]);
                        setSelectedSubcategories([]);
                        setPriceRange([0, priceMax]);
                        setDurationRange([DURATION_MIN, durationMax]);
                      }}
                      variant="outline"
                      className="mt-4 cursor-pointer"
                    >
                      Сбросить фильтры
                    </Button>
                  </div>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-8 sm:mt-10 lg:mt-12 gap-1 sm:gap-2 flex-wrap">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-sm font-medium transition-all ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Назад
                  </button>
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 sm:px-4 py-1.5 sm:py-2 text-gray-500 text-sm">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page as number)}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-sm font-medium transition-all ${
                          currentPage === page
                            ? 'bg-purple text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-sm font-medium transition-all ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Далее
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== MOBILE FILTER MODAL ========== */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-102 flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="bg-white w-full max-w-lg p-6 rounded-t-xl shadow-2xl transform transition-transform duration-300 ease-out translate-y-0">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <button onClick={() => setIsMobileFilterOpen(false)} className="ml-auto text-gray-500 hover:text-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2">
              <FilterContent {...filterProps} />
            </div>
            <div className="pt-4 border-t border-gray-200 mt-4">
              <Button
                className="w-full bg-purple text-white font-medium hover:bg-purple-600"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Применить фильтры
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
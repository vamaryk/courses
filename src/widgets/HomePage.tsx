import { Users, Star, BookOpen, Search, ChevronDown, Clock, GraduationCap, Globe, Tag, Palette, Megaphone, Briefcase, Database, MessageSquare, X } from 'lucide-react';
import { useState, useEffect, Dispatch, SetStateAction } from 'react'; // Добавлен Dispatch и SetStateAction для FilterContentProps
import { coursesApi, type Course } from '@/shared/api/courses';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Range, getTrackBackground } from 'react-range';

interface CourseWithAuthor extends Omit<Course, 'author_id'> {
  author_id: string | number;
  is_public: boolean;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  authorId?: string; // For permission checks
  level?: 'Начинающий' | 'Средний' | 'Продвинутый';
  language?: 'Русский' | 'Английский';
  price?: number;
  durationHours?: number;
  rating?: number;
  studentsCount?: number;
}

// Константы для диапазонов
const PRICE_MIN = 0;
const PRICE_MAX = 10000;
const DURATION_MIN = 0;
const DURATION_MAX = 100;

// Структура для направлений и подкатегорий
const CATEGORIES = [
    { id: 'development', label: 'Разработка', icon: BookOpen, keywords: ['разработка', 'программирование', 'код', 'javascript', 'python', 'react', 'go', 'php'], subcategories: ['JavaScript', 'Python', 'React', 'Go', 'PHP'] },
    { id: 'design', label: 'Дизайн', icon: Palette, keywords: ['дизайн', 'ui', 'ux', 'figma'] },
    { id: 'marketing', label: 'Маркетинг', icon: Megaphone, keywords: ['маркетинг', 'seo', 'smm', 'реклама'] },
    { id: 'business', label: 'Бизнес', icon: Briefcase, keywords: ['бизнес', 'менеджмент', 'стартап'] },
    { id: 'data_science', label: 'Data Science', icon: Database, keywords: ['данные', 'аналитика', 'data science', 'ai', 'ml'] },
    { id: 'soft_skills', label: 'Soft Skills', icon: MessageSquare, keywords: ['soft skills', 'общение', 'лидерство'] },
];

const sortOptionsList = [
    { value: 'popularity', label: 'По популярности' },
    { value: 'price', label: 'По цене' },
    { value: 'rating', label: 'По рейтингу' },
];

interface FilterContentProps {
    selectedLevels: string[];
    setSelectedLevels: Dispatch<SetStateAction<string[]>>;
    selectedLanguages: string[];
    setSelectedLanguages: Dispatch<SetStateAction<string[]>>;
    selectedCategories: string[];
    toggleCategory: (id: string) => void;
    selectedSubcategories: string[];
    toggleSubcategory: (sub: string) => void;
    priceRange: [number, number];
    setPriceRange: Dispatch<SetStateAction<[number, number]>>;
    durationRange: [number, number];
    setDurationRange: Dispatch<SetStateAction<[number, number]>>;
    isDevelopmentSelected: boolean;
    handlePriceInput: (index: 0 | 1, value: string) => void;
    handleDurationInput: (index: 0 | 1, value: string) => void;
}

const FilterContent: React.FC<FilterContentProps> = ({
    selectedLevels, setSelectedLevels, selectedLanguages, setSelectedLanguages,
    selectedCategories, toggleCategory, selectedSubcategories, toggleSubcategory,
    priceRange, setPriceRange, durationRange, setDurationRange,
    isDevelopmentSelected, handlePriceInput, handleDurationInput
}) => (
    <>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 font-Xolonium lg:hidden">Фильтры</h3>

        {/* Category Filter */}
        <div className="mb-4 sm:mb-6">
            <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple" />Направления
            </h4>
            <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                    <div key={cat.id}>
                        <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                            <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={selectedCategories.includes(cat.id)}
                                onChange={() => toggleCategory(cat.id)}
                            />
                            <div className="w-4 h-4 bg-purple/50 rounded-md peer-checked:bg-purple-600 peer-checked:border-purple-600 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
                                <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
                            </div>
                            <span>{cat.label}</span>
                        </label>

                        {/* Nested Subcategory Filter */}
                        {cat.id === 'development' && isDevelopmentSelected && (
                            <div className="mt-2 mb-2 pl-4 border-l border-gray-200">
                                <h5 className="font-medium mb-2 text-xs sm:text-sm text-gray-700">Языки/Технологии</h5>
                                <div className="space-y-2">
                                    {cat.subcategories?.map(sub => (
                                        <label key={sub} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={selectedSubcategories.includes(sub)}
                                                    onChange={() => toggleSubcategory(sub)}
                                                />
                                                <div className="w-4 h-4 bg-blue rounded-md peer-checked:bg-blue-400 peer-checked:border-blue-400 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
                                                <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
                                            </div>
                                            <span className="text-gray-600">{sub}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Level Filter */}
        <div className="mb-4 sm:mb-6">
            <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple" />Уровень сложности
            </h4>
            <div className="space-y-2">
                {['Начинающий', 'Средний', 'Продвинутый'].map((level) => (
                    <label key={level} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                    <div className="relative">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={selectedLevels.includes(level)}
                        onChange={(e) => {
                            if (e.target.checked) {
                            setSelectedLevels([...selectedLevels, level]);
                            } else {
                            setSelectedLevels(selectedLevels.filter(l => l !== level));
                            }
                        }}
                    />
                    <div className="w-4 h-4 bg-purple/50 rounded-md peer-checked:bg-purple-600 peer-checked:border-purple-600 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
                        <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
                    </div>
                    <span>{level}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* Language Filter */}
        <div className="mb-4 sm:mb-6">
            <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple" />Язык
            </h4>
            <div className="space-y-2">
                {['Русский', 'Английский'].map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={selectedLanguages.includes(lang)}
                            onChange={(e) => {
                            if (e.target.checked) {
                                setSelectedLanguages([...selectedLanguages, lang]);
                            } else {
                                setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                            }
                            }}
                        />
                        <div className="w-4 h-4 bg-purple/50 rounded-md peer-checked:bg-purple-600 peer-checked:border-purple-600 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
                        <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
                    </div>
                    <span>{lang}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* Price Filter */}
        <div className="mb-4 sm:mb-6">
            <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple" />Цена, ₽
            </h4>
            
            <div className="flex gap-3 mb-1">
                <Input
                    type="number"
                    placeholder="Мин"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    value={priceRange[0]}
                    onChange={(e) => handlePriceInput(0, e.target.value)}
                    className="text-xs sm:text-sm"
                />
                <Input
                    type="number"
                    placeholder="Макс"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    value={priceRange[1]}
                    onChange={(e) => handlePriceInput(1, e.target.value)}
                    className="text-xs sm:text-sm"
                />
            </div>

            <div className="flex justify-center flex-wrap mx-2">
                <Range
                    step={100}
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    values={priceRange}
                    onChange={(values) => setPriceRange(values as [number, number])}
                    renderTrack={({ props, children }) => (
                        <div
                            onMouseDown={props.onMouseDown}
                            onTouchStart={props.onTouchStart}
                            style={{
                                ...props.style,
                                height: '36px',
                                display: 'flex',
                                width: '100%',
                            }}
                        >
                            <div
                                ref={props.ref}
                                style={{
                                    height: '5px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    background: getTrackBackground({
                                        values: priceRange,
                                        colors: ['#ccc', '#B291FF', '#ccc'],
                                        min: PRICE_MIN,
                                        max: PRICE_MAX
                                    }),
                                    alignSelf: 'center'
                                }}
                            >
                                {children}
                            </div>
                        </div>
                    )}
                    renderThumb={({ props }) => (
                        <div
                            {...props}
                            style={{
                                ...props.style,
                                height: '14px',
                                width: '14px',
                                borderRadius: '50%',
                                backgroundColor: '#FFF',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0px 2px 6px #AAA',
                                border: '2px solid #B291FF'
                            }}
                        />
                    )}
                />
            </div>

            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mt-2">
                <span>{priceRange[0]} ₽</span>
                <span>{priceRange[1]} ₽</span>
            </div>
        </div>

        {/* Duration Filter */}
        <div className="mb-4 sm:mb-6">
            <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple" />
                Длительность, ч.
            </h4>
            
            <div className="flex gap-3 mb-1">
                <Input
                    type="number"
                    placeholder="Мин"
                    min={DURATION_MIN}
                    max={DURATION_MAX}
                    value={durationRange[0]}
                    onChange={(e) => handleDurationInput(0, e.target.value)}
                    className="text-xs sm:text-sm"
                />
                <Input
                    type="number"
                    placeholder="Макс"
                    min={DURATION_MIN}
                    max={DURATION_MAX}
                    value={durationRange[1]}
                    onChange={(e) => handleDurationInput(1, e.target.value)}
                    className="text-xs sm:text-sm"
                />
            </div>

            <div className="flex justify-center flex-wrap mx-2">
                <Range
                    step={1}
                    min={DURATION_MIN}
                    max={DURATION_MAX}
                    values={durationRange}
                    onChange={(values) => setDurationRange(values as [number, number])}
                    renderTrack={({ props, children }) => (
                        <div
                            onMouseDown={props.onMouseDown}
                            onTouchStart={props.onTouchStart}
                            style={{
                                ...props.style,
                                height: '36px',
                                display: 'flex',
                                width: '100%',
                            }}
                        >
                            <div
                                ref={props.ref}
                                style={{
                                    height: '5px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    background: getTrackBackground({
                                        values: durationRange,
                                        colors: ['#ccc', '#B291FF', '#ccc'],
                                        min: DURATION_MIN,
                                        max: DURATION_MAX
                                    }),
                                    alignSelf: 'center'
                                }}
                            >
                                {children}
                            </div>
                        </div>
                    )}
                    renderThumb={({ props }) => (
                        <div
                            {...props}
                            style={{
                                ...props.style,
                                height: '14px',
                                width: '14px',
                                borderRadius: '50%',
                                backgroundColor: '#FFF',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0px 2px 6px #AAA',
                                border: '2px solid #B291FF'
                            }}
                        />
                    )}
                />
            </div>

            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mt-2">
                <span>{durationRange[0]} ч.</span>
                <span>{durationRange[1]} ч.</span>
            </div>
        </div>
    </>
);

export default function HomePage() {
  const [courses, setCourses] = useState<CourseWithAuthor[]>([]);
  // Remove unused loading and error states since we're not using them in the UI
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false); 

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesApi.getAllCourses();
        const allCourses = Array.isArray(response) ? response as unknown as CourseWithAuthor[] : [];
        
        // Filter only public courses and ensure they have required fields
        const publicCourses = allCourses.filter(course => 
          course && 
          course.is_public === true && 
          course.id && 
          course.title
        );
        
        console.log('Fetched public courses:', publicCourses);
        setCourses(publicCourses);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };

    fetchCourses();
  }, []);

  // Filter states
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]); 
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]); 
  
  // ИСПРАВЛЕНИЕ: Явно указываем тип кортежа [number, number]
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [durationRange, setDurationRange] = useState<[number, number]>([DURATION_MIN, DURATION_MAX]); 

  // Sort states
  const [sortOption, setSortOption] = useState('popularity');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false); 

  // Toggle handlers for categories/subcategories
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
    // Ensure required fields exist
    if (!course.id || !course.title) return false;
    
    // Only show public courses
    if (!course.is_public) return false;

    const searchLower = searchQuery.toLowerCase();
    const courseTitleLower = course.title.toLowerCase();
    const courseDescLower = (course.description || '').toLowerCase();

    // 1. Apply search filter
    const matchesSearch = searchQuery === '' || 
      courseTitleLower.includes(searchLower) ||
      courseDescLower.includes(searchLower);
    
    // 2. Apply level filter
    const matchesLevel = selectedLevels.length === 0 || 
      (course.level && selectedLevels.includes(course.level));
    
    // 3. Apply language filter
    const matchesLanguage = selectedLanguages.length === 0 || 
      (course.language && selectedLanguages.includes(course.language));
    
    // 4. Apply price filter
    const coursePrice = course.price || 0;
    const matchesPrice = coursePrice >= priceRange[0] && coursePrice <= priceRange[1];

    // 5. Duration filter
    const courseDuration = course.durationHours || 0;
    const matchesDuration = courseDuration >= durationRange[0] && courseDuration <= durationRange[1];
    
    // 6. Category Filter
    let matchesCategory = true; 

    if (selectedCategories.length > 0 || selectedSubcategories.length > 0) {
        matchesCategory = false;
        
        // Проверка подкатегорий (языков)
        if (selectedSubcategories.length > 0) {
            const subKeywords = selectedSubcategories.map(s => s.toLowerCase());
            if (subKeywords.some(keyword => courseTitleLower.includes(keyword) || courseDescLower.includes(keyword))) {
                matchesCategory = true;
            }
        }
        
        // Проверка основных категорий
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

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortOption) {
      case 'price':
        return (a.price || 0) - (b.price || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'popularity':
      default:
        return (b.studentsCount || 0) - (a.studentsCount || 0);
    }
  });

  const selectedSortLabel = sortOptionsList.find(opt => opt.value === sortOption)?.label || 'По популярности';

  // Range Slider Helpers
  const handlePriceInput = (index: 0 | 1, value: string) => {
    let numValue = parseInt(value);
    if (isNaN(numValue)) numValue = index === 0 ? PRICE_MIN : PRICE_MAX;

    let newMin = priceRange[0];
    let newMax = priceRange[1];

    if (index === 0) {
        newMin = Math.max(PRICE_MIN, Math.min(numValue, newMax));
    } else {
        newMax = Math.min(PRICE_MAX, Math.max(numValue, newMin));
    }
    setPriceRange([newMin, newMax]);
  };

  const handleDurationInput = (index: 0 | 1, value: string) => {
    let numValue = parseInt(value);
    if (isNaN(numValue)) numValue = index === 0 ? DURATION_MIN : DURATION_MAX;

    let newMin = durationRange[0];
    let newMax = durationRange[1];

    if (index === 0) {
        newMin = Math.max(DURATION_MIN, Math.min(numValue, newMax));
    } else {
        newMax = Math.min(DURATION_MAX, Math.max(numValue, newMin));
    }
    setDurationRange([newMin, newMax]);
  };

  const isDevelopmentSelected = selectedCategories.includes('development');

  const filterProps = {
    selectedLevels, setSelectedLevels, selectedLanguages, setSelectedLanguages,
    selectedCategories, toggleCategory, selectedSubcategories, toggleSubcategory,
    priceRange, setPriceRange, durationRange, setDurationRange,
    isDevelopmentSelected, handlePriceInput, handleDurationInput
  };

  return (
    <div className="bg-background">
      {/* Hero Section */}
        <div className="relative bg-background px-4 sm:px-6 lg:px-[20px]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
            className="absolute top-10 left-20 w-32 h-32 rounded-full bg-gradient-to-r from-purple to-pink blur-xl"
            ></div>
            <div
            className="absolute top-20 right-20 w-48 h-24 rounded-full bg-gradient-to-r from-pink to-purpleblur-2xl"
            ></div>
            <div
            className="absolute bottom-50 left-1/2 transform -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-purple to-pink blur-3xl"
            ></div>
        </div>

        {/* Основной белый блок с градиентом и блюром */}
        <div className="relative">
            <div className="text-center">
            <div className="bg-gradient-to-r from-white/10 to-white/30 backdrop-blur-lg rounded-3xl px-4 py-35 shadow-lg border border-white/30">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-Xolonium text-gray-800 leading-tight mb-4">
                САМАЯ ЛУЧШАЯ <br />
                ПЛОЩАДКА <span className="font-RubikGlitch">ОНЛАЙН-</span>КУРСОВ
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-4">
                Найдите идеальный курс для Вашего развития — от программирования до дизайна и маркетинга.
                </p>
            </div>
            </div>

            {/* Шесть блоков с градиентной обводкой и иконками */}
            <div className="mt-8 sm:mt-12">
            <div className="flex flex-wrap justify-center gap-2">
                {CATEGORIES.map((item, index) => (
                <div
                    key={index}
                    className={`flex items-center justify-center p-4 sm:p-5 rounded-xl border-2 border-purple/30 bg-gradient-to-r from-white/10 to-white/30 backdrop-blur-lg transition-all duration-300 transform hover:scale-105 cursor-pointer`}
                >
                    <item.icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700" />
                    <span className="ml-2 text-xs sm:text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                ))}
            </div>
            </div>
        </div>
        </div>

      {/* Popular Courses Section */}
      <div className="bg-background py-12 lg:py-16">
        <div className="px-4 sm:px-6 lg:px-[40px]">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold font-Xolonium text-gray-900">
              Популярно на этой неделе
            </h2>
            <div className="mt-4 h-1 w-20 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full"></div>
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.length > 0 ? filteredCourses.slice(0, 4).map((course) => (
              <div 
                key={course.id} 
                className="bg-background rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="aspect-video bg-gradient-to-r from-purple-100 to-blue-100 relative p-4">
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-background/80 backdrop-blur-sm text-purple-700 text-xs font-medium rounded-full">
                      {course.is_public ? 'Публичный' : 'Приватный'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description || 'Описание отсутствует'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-xs text-gray-500">
                        {course.author?.name || 'Автор не указан'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium ml-1">
                         {course.rating ? course.rating.toFixed(1) : '4.8'} 
                      </span>
                    </div>
                  </div>
                  
                  <Button asChild className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                    <Link to={`/courses/${course.id}`}>
                      Подробнее
                    </Link>
                  </Button>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500">Популярные курсы не найдены</h3>
                <p className="text-gray-400 mt-1">Попробуйте изменить параметры поиска</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Courses Section */}
      <div className="py-8 sm:py-12 lg:py-16 bg-background">
        <div className="px-4 sm:px-6 lg:px-[40px]">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold font-Xolonium text-gray-900 mb-3 sm:mb-4">Курсы</h2>

            {/* Course tags as buttons */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              {[
                'Программирование', 'Дизайн', 'Маркетинг', 'Бизнес', 'React',
                'JavaScript', 'Python', 'UI/UX', 'SEO', 'Копирайтинг'
              ].map((tag) => (
                <button
                  key={tag}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium rounded-full text-xs sm:text-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105"
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
            <div className="flex-1">
              
              {/* Header: Sort, Filter Button (Mobile), Search */}
              <div className="flex flex-col gap-4 mb-6 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
                
                {/* Sort + Filter Button container (Mobile/Tablet) */}
                <div className="flex gap-4 w-full lg:w-auto">
                    {/* 1. Custom Sort Dropdown */}
                    <div className="relative flex-1 lg:w-[200px] lg:flex-none">
                        <button
                            type="button"
                            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                            className="appearance-none flex items-center justify-between pl-3 sm:pl-4 pr-10 py-2 border border-gray rounded-lg text-xs sm:text-sm w-full text-left"
                        >
                            {selectedSortLabel}
                            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4 text-gray-500 transition-transform ${isSortDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                        </button>

                        {/* Custom Dropdown Options List */}
                        {isSortDropdownOpen && (
                            <div 
                                className="absolute z-20 mt-1 w-full bg-white border border-gray-300 shadow-lg rounded-lg overflow-hidden" 
                            >
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

                    {/* Mobile Filter Button (Visible only below lg) */}
                    <button 
                        type="button"
                        className="flex-1 lg:hidden appearance-none flex items-center justify-center pl-3 sm:pl-4 pr-3 sm:pr-4 py-2 border border-gray rounded-lg text-xs sm:text-sm w-full"
                        onClick={() => setIsMobileFilterOpen(true)}
                    >
                        Фильтры
                    </button>
                </div>

                {/* 2. Search Input */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {sortedCourses.length > 0 ? sortedCourses.map((course) => (
                  <div key={course.id} className="relative bg-background rounded-xl sm:rounded-2xl shadow-md overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                    {/* Course Image - Full block */}
                    <div className="aspect-video bg-gradient-to-r from-purple-100 to-blue-100 relative">
                      <div className="absolute top-2 left-2 flex gap-2">
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                          {course.is_public ? 'Публичный' : 'Приватный'}
                        </span>
                        {course.language && (
                          <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
                            {course.language}
                          </span>
                        )}
                      </div>
                      {course.durationHours && course.durationHours > 0 && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
                            <Clock className="w-3 h-3" />
                            <span>{course.durationHours} ч</span>
                        </div>
                      )}
                    </div>

                    {/* Course Content */}
                    <div className="p-4 sm:p-6 flex-1 flex flex-col">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {course.description || 'Описание отсутствует'}
                      </p>
                      
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-xs text-gray-500">
                              {course.author?.name || 'Автор не указан'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">
                              {course.rating?.toFixed(1) || 'Нет оценок'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-lg font-bold text-gray-900">
                            {course.price ? `${course.price}₽` : 'Бесплатно'}
                          </span>
                          <Link 
                            to={`/courses/${course.id}`}
                            className="text-sm font-medium text-purple-600 hover:text-purple-700"
                          >
                            Подробнее
                          </Link>
                        </div>
                      </div>
                    </div>
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
                        setPriceRange([PRICE_MIN, PRICE_MAX]);
                        setDurationRange([DURATION_MIN, DURATION_MAX]);
                      }}
                      variant="outline"
                      className="mt-4"
                    >
                      Сбросить фильтры
                    </Button>
                  </div>
                )}
              </div>

              {sortedCourses.length > 0 && (
                <div className="flex items-center justify-center mt-8 sm:mt-10 lg:mt-12 gap-2">
                  <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                    Назад
                  </button>
                  <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-600 text-white rounded text-sm">
                    1
                  </button>
                  <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                    2
                  </button>
                  <span className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-500 text-sm">
                    ...
                  </span>
                  <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                    Дальше
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MOBILE FILTER MODAL (Всплывающее окно снизу) */}
      {/* ================================================================= */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileFilterOpen(false)}
          />

          {/* Modal Content (Drawer) */}
          <div className="bg-white w-full max-w-lg p-6 rounded-t-xl shadow-2xl transform transition-transform duration-300 ease-out translate-y-0">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold font-Xolonium">Фильтры</h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="text-gray-500 hover:text-gray-800">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Filter Content (Scrollable) */}
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2">
                <FilterContent {...filterProps} />
            </div>

            {/* Footer / Action Button */}
            <div className="pt-4 border-t border-gray-200 mt-4">
                <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
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
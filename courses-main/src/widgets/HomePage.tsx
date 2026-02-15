import { Users, Star, BookOpen, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { coursesApi, type Course } from '@/shared/api/courses';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface CourseWithAuthor extends Omit<Course, 'author_id'> {
  author_id: number;
  is_public: boolean;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  authorId?: string; // For permission checks
  level?: 'Начинающий' | 'Средний' | 'Продвинутый';
  language?: 'Русский' | 'Английский';
  price?: number;
  rating?: number;
  studentsCount?: number;
  created_at?: string;
  updated_at?: string;
}

export default function HomePage() {
  const [courses, setCourses] = useState<CourseWithAuthor[]>([]);
  // Remove unused loading and error states since we're not using them in the UI
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Fetch all courses and filter only public ones
        const response = await coursesApi.getUserCourses();
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

  // Filter courses based on search query and selected filters
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortOption, setSortOption] = useState('popularity');

  const filteredCourses = courses.filter(course => {
    // Ensure required fields exist
    if (!course.id || !course.title) return false;
    
    // Only show public courses
    if (!course.is_public) return false;

    // Apply search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchLower) ||
      (course.description && course.description.toLowerCase().includes(searchLower));
    
    // Apply level filter
    const matchesLevel = selectedLevels.length === 0 || 
      (course.level && selectedLevels.includes(course.level));
    
    // Apply language filter
    const matchesLanguage = selectedLanguages.length === 0 || 
      (course.language && selectedLanguages.includes(course.language));
    
    // Apply price filter
    const coursePrice = course.price || 0;
    const matchesPrice = coursePrice >= priceRange[0] && coursePrice <= priceRange[1];
    
    return matchesSearch && matchesLevel && matchesLanguage && matchesPrice;
  });

  // Debug: Log filtered courses
  console.log('Filtered courses:', filteredCourses);

  // Sort courses based on selected option
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black font-xolonium text-gray-900 leading-tight">
                    САМАЯ
                  </h1>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black font-xolonium text-gray-900 leading-tight">
                    ХАЙПОВАЯ
                  </h1>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black font-xolonium text-gray-900 leading-tight">
                    ПЛОЩАДКА
                  </h1>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black font-xolonium text-gray-900 leading-tight">
                    ОНЛАЙН-
                  </h1>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black font-xolonium text-gray-900 leading-tight">
                    КУРСОВ
                  </h1>
                </div>
              </div>

              {/* Decorative gradient blocks */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg opacity-90 shadow-lg"></div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg opacity-90 shadow-lg"></div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg opacity-90 shadow-lg"></div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg opacity-90 shadow-lg"></div>
              </div>
            </div>

            {/* Right Column - Image Placeholder */}
            <div className="relative hidden lg:block">
              <div className="aspect-square bg-gradient-to-br from-purple-400 via-cyan-400 to-blue-400 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                <div className="text-center">
                  <div className="w-32 h-32 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-20 h-20 text-white" />
                  </div>
                  <p className="text-lg font-medium">Изображение человека<br />с монитором на голове</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Courses Section */}
      <div className="bg-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-xolonium text-gray-900">
              Популярно на этой неделе
            </h2>
            <div className="mt-4 h-1 w-20 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full"></div>
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.length > 0 ? filteredCourses.slice(0, 4).map((course) => (
              <div 
                key={course.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="aspect-video bg-gradient-to-r from-purple-100 to-blue-100 relative p-4">
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-white/80 backdrop-blur-sm text-purple-700 text-xs font-medium rounded-full">
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
                      <span className="text-sm font-medium ml-1">4.8</span>
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
      <div className="py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-white via-purple-50/30 to-cyan-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-xolonium text-gray-900 mb-3 sm:mb-4">Курсы</h2>

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
            {/* Filters Sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 font-xolonium">Фильтры</h3>

              {/* Level Filter */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Уровень сложности</h4>
                <div className="space-y-2">
                  {['Начинающий', 'Средний', 'Продвинутый'].map((level) => (
                    <label key={level} className="flex items-center gap-2 text-xs sm:text-sm">
                      <input 
                        type="checkbox" 
                        className="rounded text-purple-600 focus:ring-purple-500"
                        checked={selectedLevels.includes(level)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLevels([...selectedLevels, level]);
                          } else {
                            setSelectedLevels(selectedLevels.filter(l => l !== level));
                          }
                        }}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Language Filter */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Язык</h4>
                <div className="space-y-2">
                  {['Русский', 'Английский'].map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-xs sm:text-sm">
                      <input 
                        type="checkbox" 
                        className="rounded text-purple-600 focus:ring-purple-500"
                        checked={selectedLanguages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLanguages([...selectedLanguages, lang]);
                          } else {
                            setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                          }
                        }}
                      />
                      <span>{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Цена, ₽</h4>
                <div className="space-y-2">
                  <div className="px-2">
                    <input 
                      type="range" 
                      className="w-full" 
                      min="0" 
                      max="10000" 
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    />
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>{priceRange[0]} ₽</span>
                    <span>{priceRange[1]} ₽</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-4">
                  <select 
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="popularity">По популярности</option>
                    <option value="price">По цене</option>
                    <option value="rating">По рейтингу</option>
                  </select>
                </div>
              </div>

              {/* Search and Sort */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Поиск курсов..."
                    className="pl-10 w-full max-w-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Course Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {sortedCourses.length > 0 ? sortedCourses.map((course) => (
                  <div key={course.id} className="relative bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden group hover:shadow-lg transition-shadow duration-300">
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
                        setPriceRange([0, 10000]);
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Направления</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Программирование</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Дизайн</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Маркетинг</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Бизнес</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">О платформе</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">О нас</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Команда</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Карьера</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Контакты</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Проекты</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Блог</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Подкаст</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Сообщество</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Поддержка</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Помощь</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Документация</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Статус</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Безопасность</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 lg:mt-12 pt-4 sm:pt-6 lg:pt-8 text-center text-gray-400">
            <p className="text-sm sm:text-base">&copy; 2024 MCourse. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

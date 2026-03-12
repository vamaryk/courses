import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/courses/SearchBar";
import { CategoryPills } from "@/components/courses/CategoryPills";
import { CourseCard, Course } from "@/components/courses/CourseCard";
import { FilterPanel } from "@/components/courses/FilterPanel";
import { coursesApi } from "@/shared/api/courses";
import { transformCoursesToCardCourses } from "@/shared/utils/courseTransform";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";

const baseCategories = [
  "Все курсы",
  "Избранное",
  "Программирование",
  "Анализ данных",
  "Дизайн",
  "Маркетинг",
];

// Extended course type with original API data for filtering
interface CourseWithApiData extends Course {
  apiData?: {
    id: number;
    title: string;
    description?: string;
    tags?: string[];
    specialty?: string;
    target_audience?: string;
    about_course?: string;
  };
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [activeNavItem, setActiveNavItem] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все курсы");
  const [courses, setCourses] = useState<CourseWithApiData[]>([]);
  const [apiCoursesData, setApiCoursesData] = useState<Map<number, any>>(new Map());
  const [myCourseIds, setMyCourseIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [difficulty, setDifficulty] = useState("all"); // Changed default to "all"
  // Диапазон по умолчанию: до 100 млн ₽, чтобы не скрывать дорогие курсы
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100_000_000]);
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 240]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Build categories list with "Мои курсы" if authenticated
  const categories = isAuthenticated 
    ? [...baseCategories, "Мои курсы"]
    : baseCategories;

  // Load courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all courses (public + user's courses if authenticated)
        const apiCourses = await coursesApi.getAllCourses();
        
        // Store API data for filtering
        const apiDataMap = new Map();
        apiCourses.forEach(course => {
          apiDataMap.set(course.id, {
            id: course.id,
            title: course.title,
            description: course.description,
            tags: course.tags || [],
            specialty: course.specialty,
            target_audience: course.target_audience,
            about_course: course.about_course,
          });
        });
        setApiCoursesData(apiDataMap);
        
        // Transform to CourseCard format
        const transformedCourses = transformCoursesToCardCourses(apiCourses);
        
        // If authenticated, fetch user's courses and favorites
        if (isAuthenticated) {
          try {
            const [myCourses, favorites] = await Promise.all([
              coursesApi.getMyCourses(),
              coursesApi.getFavorites()
            ]);
            
            const myIds = new Set(myCourses.map(c => c.id));
            setMyCourseIds(myIds);
            
            const favoriteIds = new Set(favorites.map(c => c.id));
            
            // Update courses with favorite status and API data
            const coursesWithFavorites = transformedCourses.map(course => ({
              ...course,
              isFavorite: favoriteIds.has(Number(course.id)),
              apiData: apiDataMap.get(Number(course.id)),
            }));
            
            setCourses(coursesWithFavorites);
          } catch (err) {
            console.error('Error fetching my courses or favorites:', err);
            // Continue without my courses/favorites filter if it fails
            const coursesWithApiData = transformedCourses.map(course => ({
              ...course,
              isFavorite: false,
              apiData: apiDataMap.get(Number(course.id)),
            }));
            setCourses(coursesWithApiData);
          }
        } else {
          // For non-authenticated users, use localStorage for favorites
          const favorites = JSON.parse(localStorage.getItem('courseFavorites') || '[]');
          const coursesWithFavorites = transformedCourses.map(course => ({
            ...course,
            isFavorite: favorites.includes(course.id),
            apiData: apiDataMap.get(Number(course.id)),
          }));
          setCourses(coursesWithFavorites);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Не удалось загрузить курсы. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [isAuthenticated]);

  const handleFavoriteToggle = async (id: string) => {
    const courseId = Number(id);
    const currentCourse = courses.find(c => c.id === id);
    const newFavoriteStatus = !currentCourse?.isFavorite;
    
    // Optimistically update UI
    setCourses((prev) => {
      return prev.map((course) =>
        course.id === id
          ? { ...course, isFavorite: newFavoriteStatus }
          : course
      );
    });
    
    // Update backend if authenticated, otherwise use localStorage
    if (isAuthenticated) {
      try {
        if (newFavoriteStatus) {
          await coursesApi.addToFavorites(courseId);
        } else {
          await coursesApi.removeFromFavorites(courseId);
        }
      } catch (err) {
        console.error('Error updating favorite:', err);
        // Revert on error
        setCourses((prev) => {
          return prev.map((course) =>
            course.id === id
              ? { ...course, isFavorite: !newFavoriteStatus }
              : course
          );
        });
      }
    } else {
      // For non-authenticated users, use localStorage
      const updated = courses.map((course) =>
        course.id === id
          ? { ...course, isFavorite: newFavoriteStatus }
          : course
      );
      const favorites = updated
        .filter(course => course.isFavorite)
        .map(course => course.id);
      localStorage.setItem('courseFavorites', JSON.stringify(favorites));
    }
  };

  // Helper function to determine course category from tags/specialty
  const getCourseCategory = (course: CourseWithApiData): string => {
    if (!course.apiData) return "";
    
    const tags = (course.apiData.tags || []).map(t => t.toLowerCase());
    const specialty = (course.apiData.specialty || "").toLowerCase();
    const title = (course.apiData.title || "").toLowerCase();
    const description = (course.apiData.description || "").toLowerCase();
    
    const allText = `${title} ${description} ${specialty} ${tags.join(" ")}`.toLowerCase();
    
    if (allText.includes("программир") || allText.includes("python") || allText.includes("javascript") || 
        allText.includes("java") || allText.includes("react") || allText.includes("разработк")) {
      return "Программирование";
    }
    if (allText.includes("анализ") || allText.includes("data") || allText.includes("аналитик") || 
        allText.includes("sql") || allText.includes("bi")) {
      return "Анализ данных";
    }
    if (allText.includes("дизайн") || allText.includes("design") || allText.includes("ux") || 
        allText.includes("ui") || allText.includes("figma")) {
      return "Дизайн";
    }
    if (allText.includes("маркетинг") || allText.includes("marketing") || allText.includes("продвижен")) {
      return "Маркетинг";
    }
    
    return "";
  };

  // Helper function to determine difficulty from course data
  const getCourseDifficulty = (course: CourseWithApiData): string => {
    const totalHours = course.hoursPractice + course.hoursTheory;
    const contentBlocks = totalHours; // Approximate based on hours
    
    if (contentBlocks <= 20) {
      return "beginner";
    } else if (contentBlocks <= 60) {
      return "intermediate";
    } else {
      return "pro";
    }
  };

  // Helper function to check if course matches skills filter
  const matchesSkills = (course: CourseWithApiData, selectedSkills: string[]): boolean => {
    if (selectedSkills.length === 0) return true;
    
    if (!course.apiData) return false;
    
    const tags = (course.apiData.tags || []).map(t => t.toLowerCase());
    const title = (course.apiData.title || "").toLowerCase();
    const description = (course.apiData.description || "").toLowerCase();
    const specialty = (course.apiData.specialty || "").toLowerCase();
    
    const allText = `${title} ${description} ${specialty} ${tags.join(" ")}`.toLowerCase();
    
    // Map skill filter values to search terms
    const skillMap: Record<string, string[]> = {
      "python": ["python", "питон"],
      "sql": ["sql"],
      "data-science": ["data science", "машинное обучение", "ml", "ai"],
      "bi-analytics": ["bi", "аналитик", "анализ"],
      "figma": ["figma"],
      "copywriting": ["копирайтинг", "copywriting"],
      "marketing": ["маркетинг", "marketing", "продвижен"],
      "testing": ["тестирование", "testing", "qa"],
      "marketing-analyst": ["маркетолог", "аналитик"],
    };
    
    return selectedSkills.some(skill => {
      const searchTerms = skillMap[skill] || [skill];
      return searchTerms.some(term => allText.includes(term));
    });
  };

  const filteredCourses = courses.filter((course) => {
    // Search filter - search in title and description
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = course.title.toLowerCase().includes(query);
      const descriptionMatch = course.apiData?.description?.toLowerCase().includes(query) || false;
      const tagsMatch = (course.apiData?.tags || []).some(tag => 
        tag.toLowerCase().includes(query)
      );
      
      if (!titleMatch && !descriptionMatch && !tagsMatch) {
        return false;
      }
    }
    
    // Category filter
    if (activeCategory === "Избранное") {
      if (!course.isFavorite) {
        return false;
      }
    } else if (activeCategory === "Мои курсы") {
      // Filter to show only courses created by the user
      if (!myCourseIds.has(Number(course.id))) {
        return false;
      }
    } else if (activeCategory !== "Все курсы") {
      // Filter by category (Программирование, Анализ данных, Дизайн, Маркетинг)
      const courseCategory = getCourseCategory(course);
      if (courseCategory !== activeCategory) {
        return false;
      }
    }
    
    // Difficulty filter
    if (difficulty !== "all") {
      const courseDifficulty = getCourseDifficulty(course);
      if (courseDifficulty !== difficulty) {
        return false;
      }
    }
    
    // Skills filter
    if (skills.length > 0 && !matchesSkills(course, skills)) {
      return false;
    }
    
    // Price filter
    if (course.price < priceRange[0] || course.price > priceRange[1]) {
      return false;
    }
    
    // Duration filter (total hours = practice + theory)
    const totalHours = course.hoursPractice + course.hoursTheory;
    if (totalHours < durationRange[0] || totalHours > durationRange[1]) {
      return false;
    }
    
    // Document types filter - this is a placeholder as we don't have this data yet
    // You can extend this when document types are added to the database
    if (documentTypes.length > 0) {
      // For now, we'll skip this filter as we don't have document type data
      // You can add logic here when document types are available in the API
    }
    
    return true;
  });

  return (
    <div className="bg-background">
      <main className="mt-[4em] lg:ml-[100px] md:ml-[100px] sm:ml-0 pb-8 px-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header with Create Course button */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-foreground">Курсы</h1>
              {isAuthenticated && (
                <Button
                  onClick={() => navigate('/courses/create')}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Создать свой курс
                </Button>
              )}
            </div>

            {/* Search and categories */}
            <div className="space-y-4 mb-8">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Поиск по курсам"
              />
              <CategoryPills
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </div>
            
            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-16">
                <p className="text-destructive mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-purple-dark transition-colors"
                >
                  Обновить страницу
                </button>
              </div>
            )}

            {/* Course grid */}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
                
                {filteredCourses.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">Курсы не найдены</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Filter panel */}
          <FilterPanel
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            durationRange={durationRange}
            onDurationRangeChange={setDurationRange}
            documentTypes={documentTypes}
            onDocumentTypesChange={setDocumentTypes}
            skills={skills}
            onSkillsChange={setSkills}
          />
        </div>
      </main>
    </div>
  );
}

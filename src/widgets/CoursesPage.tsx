import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, X, Plus } from "lucide-react";
import { CourseCard, Course } from "@/components/courses/CourseCard";
import FilterContent from "@/components/courses/FilterContent";
import { coursesApi } from "@/shared/api/courses";
import { transformCoursesToCardCourses } from "@/shared/utils/courseTransform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  COURSE_DIRECTION_CATEGORIES,
  DURATION_MIN,
  DURATION_MAX_DEFAULT,
  matchesDirectionFilters,
  roundPriceToTenThousand,
} from "@/shared/courseCatalogFilters";

const sortOptionsList = [
  { value: "popularity", label: "По популярности" },
  { value: "price", label: "По цене" },
  { value: "rating", label: "По рейтингу" },
];

type ScopeTab = "all" | "favorites" | "mine";

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
  rating?: number;
  studentsCount?: number;
  language?: string | null;
}

function mapHoursToLevelLabel(course: Course): "Начинающий" | "Средний" | "Продвинутый" {
  const totalHours = course.hoursPractice + course.hoursTheory;
  if (totalHours <= 20) return "Начинающий";
  if (totalHours <= 60) return "Средний";
  return "Продвинутый";
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const sortRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [scopeTab, setScopeTab] = useState<ScopeTab>("all");

  const [priceMax, setPriceMax] = useState<number>(100_000);
  const [durationMax, setDurationMax] = useState<number>(DURATION_MAX_DEFAULT);

  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100_000]);
  const [durationRange, setDurationRange] = useState<[number, number]>([
    DURATION_MIN,
    DURATION_MAX_DEFAULT,
  ]);

  const [sortOption, setSortOption] = useState("popularity");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const [courses, setCourses] = useState<CourseWithApiData[]>([]);
  const [myCourseIds, setMyCourseIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const COURSES_PER_PAGE = 15;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    scopeTab,
    selectedLevels,
    selectedLanguages,
    selectedCategories,
    selectedSubcategories,
    priceRange,
    durationRange,
    sortOption,
  ]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiCourses = await coursesApi.getAllCourses();

        const apiDataMap = new Map<number, CourseWithApiData["apiData"]>();
        apiCourses.forEach((course) => {
          apiDataMap.set(course.id, {
            id: course.id,
            title: course.title,
            description: course.description,
            tags: course.tags || [],
            specialty: course.specialty ?? undefined,
            target_audience: course.target_audience ?? undefined,
            about_course: course.about_course ?? undefined,
          });
        });

        const transformedCourses = transformCoursesToCardCourses(apiCourses);

        const merged: CourseWithApiData[] = transformedCourses.map((course) => {
          const raw = apiCourses.find((c) => c.id === Number(course.id));
          const ad = apiDataMap.get(Number(course.id));
          return {
            ...course,
            description: ad?.description,
            apiData: ad,
            rating: Number(raw?.rating) || 0,
            studentsCount: Number((raw as { studentsCount?: number })?.studentsCount) || 0,
            language: (raw as { language?: string | null })?.language ?? null,
          };
        });

        if (isAuthenticated) {
          try {
            const [myCourses, favorites] = await Promise.all([
              coursesApi.getMyCourses(),
              coursesApi.getFavorites(),
            ]);

            const myIds = new Set(myCourses.map((c) => c.id));
            setMyCourseIds(myIds);

            const favoriteIds = new Set(favorites.map((c) => c.id));

            setCourses(
              merged.map((course) => ({
                ...course,
                isFavorite: favoriteIds.has(Number(course.id)),
              })),
            );
          } catch {
            setCourses(
              merged.map((course) => ({
                ...course,
                isFavorite: false,
              })),
            );
          }
        } else {
          const favorites = JSON.parse(
            localStorage.getItem("courseFavorites") || "[]",
          ) as string[];
          setCourses(
            merged.map((course) => ({
              ...course,
              isFavorite: favorites.includes(course.id),
            })),
          );
        }

        const publicForRanges = apiCourses.filter((c) => c && c.is_public);
        const maxPrice = publicForRanges.reduce((max, course) => {
          const price = Number(course.price) || 0;
          return price > max ? price : max;
        }, 0);
        const calculatedPriceMax =
          maxPrice > 0 ? roundPriceToTenThousand(maxPrice) : 100_000;
        setPriceMax(calculatedPriceMax);
        setPriceRange([0, calculatedPriceMax]);

        const maxDuration = publicForRanges.reduce((max, course) => {
          const hp = Number((course as { hoursPractice?: number }).hoursPractice) || 0;
          const ht = Number((course as { hoursTheory?: number }).hoursTheory) || 0;
          const total = hp + ht;
          return total > max ? total : max;
        }, 0);
        const calculatedDurationMax =
          maxDuration > 0 ? Math.ceil(maxDuration) : DURATION_MAX_DEFAULT;
        setDurationMax(calculatedDurationMax);
        setDurationRange([DURATION_MIN, calculatedDurationMax]);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError("Не удалось загрузить курсы. Попробуйте обновить страницу.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [isAuthenticated]);

  const handleFavoriteToggle = async (id: string) => {
    const courseId = Number(id);
    const currentCourse = courses.find((c) => c.id === id);
    const newFavoriteStatus = !currentCourse?.isFavorite;

    setCourses((prev) =>
      prev.map((course) =>
        course.id === id ? { ...course, isFavorite: newFavoriteStatus } : course,
      ),
    );

    if (isAuthenticated) {
      try {
        if (newFavoriteStatus) {
          await coursesApi.addToFavorites(courseId);
        } else {
          await coursesApi.removeFromFavorites(courseId);
        }
      } catch (err) {
        console.error("Error updating favorite:", err);
        setCourses((prev) =>
          prev.map((course) =>
            course.id === id
              ? { ...course, isFavorite: !newFavoriteStatus }
              : course,
          ),
        );
      }
    } else {
      const updated = courses.map((course) =>
        course.id === id
          ? { ...course, isFavorite: newFavoriteStatus }
          : course,
      );
      const favorites = updated
        .filter((course) => course.isFavorite)
        .map((course) => course.id);
      localStorage.setItem("courseFavorites", JSON.stringify(favorites));
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const isCurrentlySelected = prev.includes(id);
      if (id === "development" && isCurrentlySelected) {
        setSelectedSubcategories([]);
        return prev.filter((c) => c !== id);
      }
      return isCurrentlySelected ? prev.filter((c) => c !== id) : [...prev, id];
    });
  };

  const toggleSubcategory = (sub: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const handlePriceInput = (index: 0 | 1, value: string) => {
    let numValue = parseInt(value, 10);
    if (Number.isNaN(numValue)) numValue = index === 0 ? 0 : priceMax;
    let newMin = priceRange[0];
    let newMax = priceRange[1];
    if (index === 0) newMin = Math.max(0, Math.min(numValue, newMax));
    else newMax = Math.min(priceMax, Math.max(numValue, newMin));
    setPriceRange([newMin, newMax]);
  };

  const handleDurationInput = (index: 0 | 1, value: string) => {
    let numValue = parseInt(value, 10);
    if (Number.isNaN(numValue))
      numValue = index === 0 ? DURATION_MIN : durationMax;
    let newMin = durationRange[0];
    let newMax = durationRange[1];
    if (index === 0)
      newMin = Math.max(DURATION_MIN, Math.min(numValue, newMax));
    else newMax = Math.min(durationMax, Math.max(numValue, newMin));
    setDurationRange([newMin, newMax]);
  };

  const isDevelopmentSelected = selectedCategories.includes("development");

  const filterProps = {
    selectedLevels,
    setSelectedLevels,
    selectedLanguages,
    setSelectedLanguages,
    selectedCategories,
    toggleCategory,
    selectedSubcategories,
    toggleSubcategory,
    priceRange,
    setPriceRange,
    durationRange,
    setDurationRange,
    isDevelopmentSelected,
    handlePriceInput,
    handleDurationInput,
    priceMax,
    durationMax,
    categories: COURSE_DIRECTION_CATEGORIES,
  };

  const filteredCourses = courses.filter((course) => {
    if (scopeTab === "favorites" && !course.isFavorite) return false;
    if (scopeTab === "mine" && !myCourseIds.has(Number(course.id))) return false;

    const searchLower = searchQuery.toLowerCase();
    const titleLower = course.title.toLowerCase();
    const descLower = (course.apiData?.description || "").toLowerCase();
    const tagsLower = (course.apiData?.tags || []).join(" ").toLowerCase();
    const specLower = (course.apiData?.specialty || "").toLowerCase();
    const aboutLower = (course.apiData?.about_course || "").toLowerCase();
    const combinedForSearch = `${titleLower} ${descLower} ${tagsLower} ${specLower} ${aboutLower}`;

    const matchesSearch =
      searchQuery === "" ||
      titleLower.includes(searchLower) ||
      descLower.includes(searchLower) ||
      tagsLower.includes(searchLower) ||
      combinedForSearch.includes(searchLower);

    const levelLabel = mapHoursToLevelLabel(course);
    const matchesLevel =
      selectedLevels.length === 0 || selectedLevels.includes(levelLabel);

    const lang = course.language;
    const matchesLanguage =
      selectedLanguages.length === 0 ||
      (lang != null && lang !== "" && selectedLanguages.includes(lang)) ||
      ((lang == null || lang === "") && selectedLanguages.includes("Русский"));

    const coursePrice = course.price || 0;
    const matchesPrice =
      coursePrice >= priceRange[0] && coursePrice <= priceRange[1];

    const totalHours = course.hoursPractice + course.hoursTheory;
    const matchesDuration =
      totalHours >= durationRange[0] && totalHours <= durationRange[1];

    const matchesCategory = matchesDirectionFilters(
      titleLower,
      `${descLower} ${tagsLower} ${specLower} ${aboutLower}`,
      selectedCategories,
      selectedSubcategories,
    );

    return (
      matchesSearch &&
      matchesLevel &&
      matchesLanguage &&
      matchesPrice &&
      matchesDuration &&
      matchesCategory
    );
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortOption) {
      case "price":
        return (a.price || 0) - (b.price || 0);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "popularity":
      default:
        return (b.studentsCount || 0) - (a.studentsCount || 0);
    }
  });

  const totalPages = Math.ceil(sortedCourses.length / COURSES_PER_PAGE) || 1;
  const paginatedCourses = sortedCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE,
  );

  const selectedSortLabel =
    sortOptionsList.find((opt) => opt.value === sortOption)?.label ||
    "По популярности";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedLevels([]);
    setSelectedLanguages([]);
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setPriceRange([0, priceMax]);
    setDurationRange([DURATION_MIN, durationMax]);
    setScopeTab("all");
  };

  const scopePills: { id: ScopeTab; label: string }[] = [
    { id: "all", label: "Все курсы" },
    { id: "favorites", label: "Избранное" },
    ...(isAuthenticated ? [{ id: "mine" as const, label: "Мои курсы" }] : []),
  ];

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ✅ Новые функции для навигации
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="bg-background w-full min-w-0 overflow-x-clip">
      <div className="pb-8 px-4 sm:px-6 md:px-8 2xl:px-10">
        <div className="max-w-[min(1920px,100%)] mx-auto w-full">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold font-Xolonium text-foreground">
              Курсы
            </h1>
            {isAuthenticated && (
              <Button
                onClick={() => navigate("/courses/create")}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Создать свой курс
              </Button>
            )}
          </div>

          <div className="flex flex-col min-[1200px]:flex-row gap-6 min-[1200px]:gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex gap-3 w-full sm:w-auto sm:flex-shrink-0">
                  <div className="relative sm:w-[200px]" ref={sortRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setIsSortDropdownOpen(!isSortDropdownOpen)
                      }
                      className="appearance-none flex items-center justify-between pl-3 pr-10 py-2.5 border border-border rounded-xl text-sm w-full text-left bg-card hover:bg-muted/40 transition-colors"
                    >
                      {selectedSortLabel}
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform ${isSortDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isSortDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-border shadow-lg rounded-xl overflow-hidden">
                        {sortOptionsList.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setSortOption(option.value);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`block w-full text-left py-2.5 px-4 text-sm hover:bg-muted ${option.value === sortOption ? "bg-muted/60 font-medium" : ""}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex-1 min-[1200px]:hidden appearance-none flex items-center justify-center px-4 py-2.5 border border-border rounded-xl text-sm bg-card"
                    onClick={() => setIsMobileFilterOpen(true)}
                  >
                    Фильтры
                  </button>
                </div>
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Поиск курсов..."
                    className="pl-10 h-11 rounded-xl border-border bg-card"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {scopePills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setScopeTab(pill.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                      scopeTab === pill.id
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                </div>
              )}

              {error && !loading && (
                <div className="text-center py-16">
                  <p className="text-destructive mb-4">{error}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Обновить страницу
                  </button>
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                    {paginatedCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onFavoriteToggle={handleFavoriteToggle}
                        size="default"
                      />
                    ))}
                  </div>

                  {sortedCourses.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground mb-4">
                        Курсы не найдены
                      </p>
                      <Button variant="outline" onClick={resetFilters}>
                        Сбросить фильтры
                      </Button>
                    </div>
                  )}

                  {/* ✅ Обновлённая пагинация */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center my-4 sm:mt-4 min-[1200px]:mt-10 gap-1 sm:gap-2 flex-wrap">
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
                </>
              )}
            </div>

            <div className="w-full min-[1200px]:w-[300px] flex-shrink-0 hidden min-[1200px]:block">
              <div className="sticky top-[calc(6rem+env(safe-area-inset-top,0px))] rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-soft-xl">
                <h3 className="text-lg font-semibold mb-4 font-Xolonium text-foreground">
                  Фильтры
                </h3>
                <FilterContent {...filterProps} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[102] flex items-end justify-center min-[1200px]:hidden pb-[env(safe-area-inset-bottom,0px)]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
            aria-hidden
          />
          <div className="relative bg-background w-full max-w-lg rounded-t-2xl shadow-2xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-end items-center px-5 pt-4 pb-2 border-b border-border">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Закрыть"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterContent {...filterProps} />
            </div>
            <div className="px-5 pt-2 pb-4 border-t border-border bg-background">
              <Button
                className="w-full bg-primary text-primary-foreground"
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
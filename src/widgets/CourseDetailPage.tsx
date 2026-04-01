import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { coursesApi, type Course, type Chapter, type Subchapter, type ContentBlock } from '@/shared/api/courses';
import { getCoverImageUrl, resolveProfileMediaUrl } from '@/shared/utils/courseTransform';
import HeroHeader from "@/components/dashboard/HeroHeader";
// import CourseProgress from "@/components/dashboard/CourseProgress";
import CourseModules from "@/components/dashboard/CourseModules";
import ActivitySection from "@/components/dashboard/ActivitySection";
import AboutCourse from "@/components/dashboard/AboutCourse";
import ResumeSection from "@/components/dashboard/ResumeSection";
import { Button } from "@/components/ui/button";
import { Edit, Star } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { progressApi } from '@/shared/api/progress';
import axios from 'axios';

interface CourseWithChapters extends Course {
  chapters?: Array<Chapter & {
    subchapters?: Array<Subchapter & {
      content_blocks?: ContentBlock[];
    }>;
  }>;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  studentsCount?: number;
  totalLessons?: number;
  totalDuration?: number;
  language?: string;
}

const formatStudyMinutes = (minutes?: number | null) => {
  if (minutes == null || !Number.isFinite(Number(minutes)) || Number(minutes) <= 0) {
    return undefined;
  }

  const totalMinutes = Math.round(Number(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const restMinutes = totalMinutes % 60;

  if (hours > 0 && restMinutes > 0) {
    return `${hours} ч ${restMinutes} мин`;
  }

  if (hours > 0) {
    return `${hours} ч`;
  }

  return `${restMinutes} мин`;
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<{
    stats: { today: string; week: string; total: string };
    chartData: Array<{ day: string; value: number }>;
  } | null>(null);
  // Реальный процент прогресса по курсу
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  // Рейтинг курса и оценка текущего пользователя (для блока "Оценить курс")
  const [courseRating, setCourseRating] = useState<number | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  
  // Track time spent on page
  const pageLoadTime = useRef<number>(Date.now());
  const trackingInterval = useRef<number | null>(null);

  // Check if current user is the author of the course
  const isAuthor = course && user && course.author_id && user.id && course.author_id === user.id;
  const isEnrolled = Boolean(course?.is_enrolled);
  const canRate = isAuthenticated && isEnrolled && !isAuthor;

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const courseData = await coursesApi.getCourse(parseInt(id));
        
        // Calculate total lessons and duration
        let totalLessons = 0;
        let totalDuration = 0;
        
        if (courseData.chapters) {
          courseData.chapters.forEach(chapter => {
            if (chapter.subchapters) {
              chapter.subchapters.forEach(subchapter => {
                if (subchapter.content_blocks) {
                  totalLessons += subchapter.content_blocks.length;
                  // Assuming each content block takes 15 minutes by default
                  totalDuration += subchapter.content_blocks.length * 15;
                }
              });
            }
          });
        }

        setCourse({
          ...courseData,
          studentsCount: Number(courseData.studentsCount || 0),
          totalLessons,
          totalDuration
        });
        setCourseRating(courseData.rating != null ? Number(courseData.rating) : null);
        setMyRating(courseData.my_rating != null ? Number(courseData.my_rating) : null);
      } catch (err) {
        console.error('Error fetching course:', err);
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('Курс не найден');
        } else if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('У вас нет доступа к этому курсу');
        } else {
          setError('Не удалось загрузить информацию о курсе. Попробуйте позже.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  // Загружаем прогресс по курсу из backend
  useEffect(() => {
    const loadProgress = async () => {
      if (!id || !isAuthenticated) return;
      try {
        const result = await progressApi.getCourseProgress(parseInt(id, 10));
        const pct = result?.completion?.progress_percentage ?? 0;
        setProgressPercentage(pct);
      } catch (err) {
        console.error('Error fetching course progress:', err);
      }
    };
    loadProgress();
  }, [id, isAuthenticated]);

  // Fetch activity data and track time spent
  useEffect(() => {
    if (!id || !isAuthenticated || !course) return;

    const fetchActivity = async () => {
      try {
        const activity = await coursesApi.getCourseActivity(parseInt(id));
        setActivityData(activity);
      } catch (err) {
        console.error('Error fetching activity:', err);
      }
    };

    fetchActivity();

    // Track time spent on page (update every minute)
    trackingInterval.current = window.setInterval(async () => {
      const timeSpent = Math.floor((Date.now() - pageLoadTime.current) / 1000 / 60); // in minutes
      if (timeSpent > 0) {
        try {
          await coursesApi.trackActivity(parseInt(id), timeSpent);
          pageLoadTime.current = Date.now(); // Reset timer after tracking
        } catch (err) {
          console.error('Error tracking activity:', err);
        }
      }
    }, 60000); // Every minute

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
        // Track final time before leaving
        const finalTime = Math.floor((Date.now() - pageLoadTime.current) / 1000 / 60);
        if (finalTime > 0) {
          coursesApi.trackActivity(parseInt(id), finalTime).catch(console.error);
        }
      }
    };
  }, [id, isAuthenticated, course]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{error || 'Курс не найден'}</h2>
          <p className="text-gray-600 mb-6">{error || 'Не удалось загрузить информацию о курсе. Пожалуйста, попробуйте позже.'}</p>
        </div>
      </div>
    );
  }

  // Count theory and practice content blocks
  const theoryCount = course.chapters?.reduce((sum, chapter) => {
    if (!chapter.subchapters) return sum;
    return sum + chapter.subchapters.reduce((subSum, subchapter) => {
      if (!subchapter.content_blocks) return subSum;
      return subSum + subchapter.content_blocks.filter(block => block.type === 'theory').length;
    }, 0);
  }, 0) || 0;
  
  const practiceCount = course.chapters?.reduce((sum, chapter) => {
    if (!chapter.subchapters) return sum;
    return sum + chapter.subchapters.reduce((subSum, subchapter) => {
      if (!subchapter.content_blocks) return subSum;
      return subSum + subchapter.content_blocks.filter(block => block.type === 'task').length;
    }, 0);
  }, 0) || 0;

  // Convert chapters to sections format for CourseModules
  const sections = course.chapters?.map((chapter, chapterIndex) => ({
    id: String(chapter.id),
    title: `${chapterIndex + 1}. ${chapter.title}`,
    chapterId: chapter.id,
    firstSubchapterId: chapter.subchapters?.[0]?.id,
    description: chapter.shortDescription || undefined,
    duration: formatStudyMinutes(chapter.studyMinutes),
    modules: chapter.subchapters?.map((subchapter, subIndex) => ({
      id: `${chapter.id}-${subchapter.id}`,
      subchapterId: subchapter.id,
      title: subchapter.title,
      duration: subchapter.content_blocks 
        ? `${Math.ceil((subchapter.content_blocks.length * 15) / 60)} : ${(subchapter.content_blocks.length * 15) % 60}`
        : undefined,
      isCompleted: false, // TODO: Get from user progress
      isPlaying: chapterIndex === 0 && subIndex === 0, // TODO: Get from user progress
      hasFireIcon: false,
    })) || [],
  })) || [];

  // Prepare progress data
//   const progressData = [
//     { value: String(Math.ceil((course.totalDuration || 0) / 60)), label: "часов", progress: 45, color: "purple" as const },
//     { value: `${progressPercentage}%`, label: "пройдено", progress: progressPercentage, color: "blue" as const },
//     { value: String(course.totalLessons || 0), label: "лекций", progress: 78, color: "green" as const },
//     { value: String(course.studentsCount || 0), label: "процесс", progress: 60, color: "orange" as const },
//   ];

  // Prepare stats for HeroHeader
  const stats = {
    tests: String(practiceCount),
    programs: "0/5",
    lectures: `${theoryCount}/${course.totalLessons || 0}`,
    progress: `${progressPercentage}%`
  };

  // Prepare tags
  const tags = course.language ? [course.language, course.is_public ? 'Публичный' : 'Приватный'] : [];
  const numericPrice = Number((course as any).price ?? 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="px-4 sm:px-6 lg:px-[20px] mb-5">
        <div>
          {/* Header with Edit button */}
          <div className="flex items-center justify-between">
            {isAuthor && (
              <Button
                onClick={() => navigate(`/courses/${id}/manage`)}
                className="flex items-center gap-2 mb-2 cursor-pointer"
                variant="outline"
              >
                <Edit className="w-4 h-4" />
                Редактировать курс
              </Button>
            )}
          </div>

          {/* Hero */}
          <HeroHeader 
            courseTitle={course.title}
            courseDescription={course.description || ''}
            authorName={course.instructor_name || course.author?.name || 'Неизвестный автор'}
            authorAvatar={resolveProfileMediaUrl(course.instructor_avatar) ?? null}
            coverImage={getCoverImageUrl(course.cover_image)}
            price={Number.isFinite(numericPrice) ? numericPrice : 0}
            rating={course.rating != null ? Number(course.rating) : undefined}
            stats={stats}
            tags={tags}
            progress={progressPercentage}
            onAuthorClick={course.author_id ? () => navigate(`/profile/${course.author_id}`) : undefined}
          />
          <div className="bg-white rounded-xl shadow p-5">
          {/* Main grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column - Course content */}
            <div className="lg:col-span-3 space-y-6">
              {/* <CourseProgress progressData={progressData} /> */}
              <h2 className="text-lg font-semibold text-foreground mb-2">Программа курса</h2>
              <CourseModules
                sections={sections}
                canViewSubitems
                onStartChapter={(chapterId, subchapterId) =>
                  navigate(`/courses/${id}/learn/${chapterId}/${subchapterId}`)
                }
              />
            </div>
            
            {/* Right column - Activity & About */}
            <div className="lg:col-span-2">
              {canRate && (
                <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Оценить курс</h3>
                  <p className="text-xs text-muted-foreground mb-3">Вы записаны на курс. Поставьте оценку от 1 до 5.</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={ratingSubmitting}
                        onClick={async () => {
                          if (!id) return;
                          setRatingSubmitting(true);
                          try {
                            const res = await coursesApi.rateCourse(parseInt(id, 10), value);
                            setMyRating(value);
                            setCourseRating(res.rating);
                            setCourse((prev) => prev ? { ...prev, rating: res.rating, my_rating: value } : null);
                          } catch (err) {
                            console.error('Failed to rate course:', err);
                          } finally {
                            setRatingSubmitting(false);
                          }
                        }}
                        className="p-1 rounded hover:bg-amber-100 transition-colors disabled:opacity-50"
                        aria-label={`Оценка ${value}`}
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            (myRating ?? 0) >= value ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {(myRating != null && myRating > 0) && (
                    <p className="text-xs text-muted-foreground mt-2">Ваша оценка: {myRating}</p>
                  )}
                </div>
              )}
              <ActivitySection 
                activityStats={activityData ? [
                  { value: activityData.stats.today, label: "сегодня" },
                  { value: activityData.stats.week, label: "на этой неделе" },
                  { value: activityData.stats.total, label: "всего" },
                ] : undefined}
                chartData={activityData?.chartData}
              />
              <AboutCourse 
                aboutText={course.about_course || course.description || ''}
              />
            </div>
          </div>
          
          {/* Resume section - Full width */}
          <ResumeSection
            skills={course.course_skills}
            tools={course.course_tools}
            certificateText={course.certificate_text || undefined}
            jobTitle={course.job_title || undefined}
          />
        </div>
        </div>
      </main>
    </div>
  );
}
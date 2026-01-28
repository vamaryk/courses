import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { coursesApi, type Course, type Chapter, type Subchapter, type ContentBlock } from '@/shared/api/courses';
import Header from "@/widgets/navigation/Header/Header";
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar";
import HeroHeader from "@/components/dashboard/HeroHeader";
import CourseProgress from "@/components/dashboard/CourseProgress";
import CourseModules from "@/components/dashboard/CourseModules";
import ActivitySection from "@/components/dashboard/ActivitySection";
import AboutCourse from "@/components/dashboard/AboutCourse";
import ResumeSection from "@/components/dashboard/ResumeSection";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";

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
  
  // Track time spent on page
  const pageLoadTime = useRef<number>(Date.now());
  const trackingInterval = useRef<number | null>(null);

  // Check if current user is the author of the course
  const isAuthor = course && user && course.author_id && user.id && course.author_id === user.id;

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
          studentsCount: 128, // Mock data
          totalLessons,
          totalDuration
        });
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Не удалось загрузить информацию о курсе');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

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
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Курс не найден</h2>
          <p className="text-gray-600 mb-6">Не удалось загрузить информацию о курсе. Пожалуйста, попробуйте позже.</p>
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

  // Calculate progress percentage
  const progressPercentage = course.totalLessons && course.totalLessons > 0 
    ? Math.round((1 / course.totalLessons) * 100) 
    : 1;

  // Convert chapters to sections format for CourseModules
  const sections = course.chapters?.map((chapter, chapterIndex) => ({
    id: String(chapter.id),
    title: `${chapterIndex + 1}. ${chapter.title}`,
    modules: chapter.subchapters?.map((subchapter, subIndex) => ({
      id: `${chapter.id}-${subchapter.id}`,
      title: subchapter.title,
      description: subchapter.description,
      duration: subchapter.content_blocks 
        ? `${Math.ceil((subchapter.content_blocks.length * 15) / 60)} : ${(subchapter.content_blocks.length * 15) % 60}`
        : undefined,
      isCompleted: false, // TODO: Get from user progress
      isPlaying: chapterIndex === 0 && subIndex === 0, // TODO: Get from user progress
      hasFireIcon: false,
    })) || [],
  })) || [];

  // Prepare progress data
  const progressData = [
    { value: String(Math.ceil((course.totalDuration || 0) / 60)), label: "часов", progress: 45, color: "purple" as const },
    { value: `${progressPercentage}%`, label: "пройдено", progress: progressPercentage, color: "blue" as const },
    { value: String(course.totalLessons || 0), label: "лекций", progress: 78, color: "green" as const },
    { value: String(course.studentsCount || 0), label: "процесс", progress: 60, color: "orange" as const },
  ];

  // Prepare stats for HeroHeader
  const stats = {
    tests: String(practiceCount),
    programs: "0/5",
    lectures: `${theoryCount}/${course.totalLessons || 0}`,
    progress: `${progressPercentage}%`
  };

  // Prepare tags
  const tags = course.language ? [course.language, course.is_public ? 'Публичный' : 'Приватный'] : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MenuSidebar />
      {/* Main content */}
      <main className="mt-[4em] lg:ml-[100px] md:ml-[100px] sm:ml-0 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Edit button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
            {isAuthor && (
              <Button
                onClick={() => navigate(`/courses/${id}/manage`)}
                className="flex items-center gap-2"
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
            stats={stats}
            tags={tags}
            progress={progressPercentage}
          />
          
          {/* Main grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column - Course content */}
            <div className="lg:col-span-3 space-y-6">
              <CourseProgress progressData={progressData} />
              <CourseModules sections={sections} />
            </div>
            
            {/* Right column - Activity & About */}
            <div className="lg:col-span-2">
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
          <ResumeSection />
        </div>
      </main>
    </div>
  );
}

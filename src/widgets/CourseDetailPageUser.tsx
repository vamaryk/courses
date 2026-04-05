import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  coursesApi,
  type Course,
  type Chapter,
  type Subchapter,
  type ContentBlock,
  type CourseContentStats,
} from '@/shared/api/courses';
import { getCoverImageUrl, resolveProfileMediaUrl } from '@/shared/utils/courseTransform';
import HeroHeaderUser from "@/components/dashboard/HeroHeaderUser";
import CourseModulesUser from "@/components/dashboard/CourseModulesUser";
import CourseStats from "@/components/dashboard/CourseStats";
import AboutCourse from "@/components/dashboard/AboutCourse";
import ResumeSection from "@/components/dashboard/ResumeSection";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
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

interface CourseDetailPageUserProps {
  onEnrolled?: () => void;
}

export default function CourseDetailPageUser({ onEnrolled }: CourseDetailPageUserProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [contentStats, setContentStats] = useState<CourseContentStats>({
    lectures: { completed: 0, total: 0 },
    assignments: { completed: 0, total: 0 },
  });

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

        const mappedCourse = {
          ...courseData,
          studentsCount: Number(courseData.studentsCount || 0),
          totalLessons,
          totalDuration
        };

        setCourse(mappedCourse);
        setContentStats(
          courseData.contentStats ?? {
            lectures: { completed: 0, total: 0 },
            assignments: { completed: 0, total: 0 },
          },
        );

        if (isAuthenticated) {
          try {
            const favoriteStatus = await coursesApi.getFavoriteStatus(parseInt(id));
            setIsFavorite(Boolean(favoriteStatus.isFavorite));
          } catch (favoriteErr) {
            console.error('Error fetching favorite status:', favoriteErr);
            setIsFavorite(false);
          }
        } else {
          setIsFavorite(false);
        }
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
  }, [id, isAuthenticated]);

  const handleToggleFavorite = async () => {
    if (!id) return;

    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      setFavoriteLoading(true);
      if (isFavorite) {
        await coursesApi.removeFromFavorites(parseInt(id));
        setIsFavorite(false);
      } else {
        await coursesApi.addToFavorites(parseInt(id));
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleBuyCourse = async () => {
    if (!id) return;

    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      setBuyLoading(true);
      await coursesApi.enrollToCourse(parseInt(id));
      onEnrolled?.();
    } catch (err) {
      console.error('Error enrolling to course:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/auth');
      }
    } finally {
      setBuyLoading(false);
    }
  };

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

  // Prepare tags
  const tags = course.language ? [course.language, course.is_public ? 'Публичный' : 'Приватный'] : [];

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
                className="flex items-center gap-2 cursor-pointer mb-2"
                variant="outline"
              >
                <Edit className="w-4 h-4" />
                Редактировать курс
              </Button>
            )}
          </div>

          {/* Hero */}
          <HeroHeaderUser 
            courseTitle={course.title}
            courseDescription={course.description || ''}
            authorName={course.instructor_name || course.author?.name || 'Неизвестный автор'}
            authorAvatar={resolveProfileMediaUrl(course.instructor_avatar) ?? null}
            coverImage={getCoverImageUrl(course.cover_image)}
            stats={{
              lectures: contentStats.lectures,
              assignments: contentStats.assignments,
            }}
            tags={tags}
            price={Number((course as CourseWithChapters & { price?: number }).price || 0)}
            isFavorite={isFavorite}
            isFavoriteLoading={favoriteLoading}
            isBuyLoading={buyLoading}
            onToggleFavorite={handleToggleFavorite}
            onBuy={handleBuyCourse}
            onAuthorClick={course.author_id ? () => navigate(`/profile/${course.author_id}`) : undefined}
          />
          <div className="bg-white rounded-xl shadow p-5">
          
          {/* Main grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column - Course content */}
            <div className="lg:col-span-3 space-y-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">Программа курса</h2>      
                <CourseModulesUser
                  sections={sections}
                  canViewSubitems={Boolean(course.is_enrolled) || Boolean(isAuthor)}
                  hideChapterOverview={Boolean(isAuthor || course.is_enrolled || course.has_access)}
                  onStartChapter={(chapterId, subchapterId) =>
                    navigate(`/courses/${id}/learn/${chapterId}/${subchapterId}`)
                  }
                />
            </div>
            
            {/* Right column - Stats & About */}
            <div className="lg:col-span-2 space-y-6">
                <CourseStats
                  rating={course.rating != null ? Number(course.rating) : null}
                  ratingsCount={Number(course.ratingsCount ?? 0) || 0}
                  studentsCount={Number(course.studentsCount ?? 0) || 0}
                  theoryHours={Number(course.hoursTheory ?? 0) || 0}
                  practiceHours={Number(course.hoursPractice ?? 0) || 0}
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
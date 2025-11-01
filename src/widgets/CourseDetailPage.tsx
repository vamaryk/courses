import { BookOpen, BookText, FileText, Clock, Users, ChevronRight } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { coursesApi, type Course, type Chapter, type Subchapter, type ContentBlock } from '@/shared/api/courses';
import { Button } from '@/components/ui/button';

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
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Курс не найден</h2>
          <p className="text-gray-600 mb-6">Не удалось загрузить информацию о курсе. Пожалуйста, попробуйте позже.</p>
          <Button asChild>
            <Link to="/">Вернуться на главную</Link>
          </Button>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Course Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                  {course.is_public ? 'Публичный' : 'Приватный'}
                </span>
                {course.language && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {course.language}
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                {course.title}
              </h1>
              
              <p className="text-gray-600 mb-6">
                {course.description || 'Описание курса отсутствует'}
              </p>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{course.studentsCount || 0} студентов</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{theoryCount} теоретических блоков</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <BookText className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{practiceCount} практических заданий</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{Math.ceil((course.totalDuration || 0) / 60)} минут обучения</span>
                </div>
              </div>
              
              <Button className="bg-purple-600 hover:bg-purple-700">
                Начать обучение
              </Button>
            </div>
            
            <div className="w-full md:w-64 lg:w-80 flex-shrink-0">
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center text-gray-400">
                <BookOpen className="w-16 h-16" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Course Content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Содержание курса</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {course.chapters?.map((chapter) => (
              <div key={chapter.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {chapter.title}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {chapter.subchapters?.reduce((sum, sub) => sum + (sub.content_blocks?.length || 0), 0) || 0} уроков • 
                    {Math.ceil((chapter.subchapters?.reduce((sum, sub) => 
                      sum + ((sub.content_blocks?.length || 0) * 15), 0) || 0) / 60)} мин
                  </span>
                </div>
                
                <div className="space-y-2">
                  {chapter.subchapters?.map((subchapter) => (
                    <div key={subchapter.id} className="ml-4">
                      <h4 className="text-md font-medium text-gray-800 mb-2">
                        {subchapter.title}
                      </h4>
                      <div className="space-y-2">
                        {subchapter.content_blocks?.map((block) => (
                          <div 
                            key={block.id}
                            className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                              {block.type === 'theory' ? (
                                <FileText className="w-4 h-4 text-purple-600" />
                              ) : (
                                <BookText className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {block.type === 'theory' ? 'Теория' : 'Практическое задание'}
                              </p>
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="capitalize">
                                  {block.type === 'theory' ? 'Теория' : 'Практика'}
                                </span>
                                <span className="mx-2">•</span>
                                <span>15 минут</span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Course Instructor */}
        {course.author && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Преподаватель</h2>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl font-medium">
                {course.author.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{course.author.name}</h3>
                <p className="text-gray-600 text-sm">{course.author.email}</p>
                <p className="text-gray-600 mt-2">
                  Опытный преподаватель с многолетним стажем работы в области.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

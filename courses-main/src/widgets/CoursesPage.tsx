import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, BookOpen, Users, Clock, Plus, Edit, BarChart3 } from 'lucide-react';
import { coursesApi, type Course } from '@/shared/api/courses';
import { CourseCreateModal } from '@/components/CourseCreateModal';

export default function CoursesPage() {
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Загружаем созданные пользователем курсы
        const userCourses = await coursesApi.getUserCourses();
        setCreatedCourses(userCourses);

        // TODO: Загрузить курсы, в которых пользователь записан
        // Пока оставляем пустым массивом
        setEnrolledCourses([]);
      } catch (err) {
        setError('Ошибка при загрузке курсов');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCreateCourse = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateCourseSuccess = async () => {
    // Перезагружаем курсы после успешного создания
    try {
      const userCourses = await coursesApi.getUserCourses();
      setCreatedCourses(userCourses);
    } catch (err) {
      // Error handled by UI state
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditCourse = (courseId: number) => {
    navigate(`/courses/${courseId}/manage`);
  };

  const handleCourseStats = (courseId: number) => {
    navigate(`/courses/${courseId}/statistics`);
  };

  const handleContinueCourse = (_courseId: number) => {
    // TODO: Перейти к изучению курса
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header аналогично календарю */}
      <header className="h-16 flex items-center justify-between px-[40px] z-[10] bg-gray-50/90 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold font-xolonium">LOGO</div>
        </div>
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <Users className="w-8 h-8 bg-gray-200 rounded-full p-1" />
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 min-w-0 md:ml-[120px] px-[20px] md:px-0 mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 min-w-0 space-y-6">
              {/* My Courses Block */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6" style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div className="flex items-center">
                      <button className="flex items-center text-gray-600 text-[12px] font-montserrat hover:text-gray-900 mr-4">
                        ← Мои курсы
                      </button>
                    </div>
                    <button
                      onClick={handleCreateCourse}
                      className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить курс
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-[24px] font-xolonium">Мои курсы</h1>
                    <BookOpen className="w-5 h-5 text-gray-500" />
                  </div>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <p className="text-red-600 mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Попробовать снова
                      </button>
                    </div>
                  ) : enrolledCourses.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Нет записей на курсы</h3>
                      <p className="text-gray-500 mb-4">Вы пока не записаны ни на один курс</p>
                      <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Найти курсы
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {enrolledCourses.map((course) => (
                        <div key={course.id} className="bg-white/70 rounded-lg p-6 hover:bg-white/90 transition-all duration-300 hover:shadow-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                              <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              course.is_public ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {course.is_public ? 'Публичный' : 'Приватный'}
                            </span>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Создан: {new Date(course.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleContinueCourse(course.id)}
                            className="w-full bg-[#B291FF] text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                          >
                            Продолжить изучение
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* My Created Courses Block */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6" style={{ background: 'radial-gradient(circle, #D8E6FF, #F7C8FF)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div className="flex items-center">
                      <h2 className="text-[24px] font-xolonium">Мои созданные курсы</h2>
                      <BookOpen className="w-5 h-5 text-gray-500 ml-2" />
                    </div>
                    <button
                      onClick={handleCreateCourse}
                      className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Создать курс
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <p className="text-red-600 mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Попробовать снова
                      </button>
                    </div>
                  ) : createdCourses.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Нет созданных курсов</h3>
                      <p className="text-gray-500 mb-4">Вы пока не создали ни одного курса</p>
                      <button
                        onClick={handleCreateCourse}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Создать первый курс
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {createdCourses.map((course) => (
                        <div key={course.id} className="bg-white/70 rounded-lg p-6 hover:bg-white/90 transition-all duration-300 hover:shadow-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                              <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              course.is_public ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {course.is_public ? 'Публичный' : 'Приватный'}
                            </span>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Создан: {new Date(course.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCourse(course.id)}
                              className="flex-1 bg-white text-[#B291FF] border border-[#B291FF] py-2 px-4 rounded-lg hover:bg-[#B291FF] hover:text-white transition-colors text-sm font-medium"
                            >
                              <Edit className="w-4 h-4 inline mr-1" />
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleCourseStats(course.id)}
                              className="flex-1 bg-[#B291FF] text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                            >
                              <BarChart3 className="w-4 h-4 inline mr-1" />
                              Статистика
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Course Create Modal */}
      <CourseCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateCourseSuccess}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { statisticsApi, CourseStatistics } from '@/shared/api/statistics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

type PieData = {
  name: string;
  value: number;
};

type ChapterTimeData = {
  name: string;
  time: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function CourseStatisticsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [stats, setStats] = useState<CourseStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!courseId || isNaN(Number(courseId))) {
        setError('Неверный идентификатор курса');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching statistics for course:', courseId);
        const data = await statisticsApi.getCourseStatistics(Number(courseId));
        console.log('Received statistics data:', data);
        setStats(data);
      } catch (err: any) {
        console.error('Error fetching statistics:', err);
        const errorMessage = err.response?.data?.error || err.message || 'Не удалось загрузить статистику курса';
        setError(`Ошибка: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-gray-600">Загрузка статистики курса...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 rounded-lg">
        <div className="text-red-600 font-medium mb-2">Ошибка загрузки статистики</div>
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center p-4">Нет данных для отображения</div>;
  }

  // Prepare data for charts
  const completionData = [
    { name: 'Завершили', value: stats.totalCompleted },
    { name: 'В процессе', value: stats.totalEnrolled - stats.totalCompleted }
  ];

  const chapterTimeData = stats.chapterStats.map(chapter => ({
    name: chapter.chapterTitle,
    time: chapter.averageTimeSpent / 60 // Convert to minutes
  }));

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Статистика курса</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Всего студентов</h3>
          <p className="text-3xl font-bold">{stats.totalEnrolled}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Завершили курс</h3>
          <p className="text-3xl font-bold">{stats.totalCompleted}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Процент завершения</h3>
          <p className="text-3xl font-bold">{stats.completionRate}%</p>
        </div>
      </div>

      {/* Completion Rate Pie Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Прогресс прохождения</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={completionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {completionData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} студентов`, 'Количество']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Spent per Chapter */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Среднее время на главу (минуты)</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chapterTimeData}
              margin={{
                top: 5, right: 30, left: 20, bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Минуты', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => [`${value} мин`, 'Среднее время']} />
              <Legend />
              <Bar dataKey="time" name="Среднее время" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chapter-wise Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Статистика по главам</h2>
        <div className="space-y-6">
          {stats.chapterStats.map((chapter, index) => (
            <div key={chapter.chapterId} className="border rounded-lg p-4">
              <h3 className="font-medium text-lg mb-2">{chapter.chapterTitle}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Среднее время</p>
                  <p className="font-medium">{(chapter.averageTimeSpent / 60).toFixed(1)} мин</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Процент завершения</p>
                  <p className="font-medium">{chapter.completionRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Подразделы</p>
                  <p className="font-medium">{chapter.subchapterStats.length}</p>
                </div>
              </div>
              
              {/* Subchapters */}
              <div className="mt-4 space-y-2">
                {chapter.subchapterStats.map((subchapter, subIndex) => (
                  <div key={subchapter.subchapterId} className="pl-4 border-l-2 border-gray-200">
                    <h4 className="font-medium">{subchapter.subchapterTitle}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <span>Время: {(subchapter.averageTimeSpent / 60).toFixed(1)} мин</span>
                      <span>Завершено: {subchapter.completionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface TopCourse {
  name: string;
  students: number;
  percentage: number;
}

const TopCourses = () => {
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopCourses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/top-courses`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTopCourses(data);
        } else {
          console.error('Не удалось получить топ курсов:', response.statusText);
          setTopCourses([]);
        }
      } catch (error) {
        console.error('Ошибка при получении топ курсов:', error);
        setTopCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCourses();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (topCourses.length === 0) {
    return (
      <div className="rounded-3xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Топ 5 курсов</h3>
        </div>
        <div className="text-sm text-muted-foreground text-center py-8">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Топ 5 курсов</h3>
      </div>
      <div className="space-y-3">
        {topCourses.map((course, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div 
                className="h-8 rounded-lg bg-primary/40 flex items-center px-3"
                style={{ width: `${Math.max(course.percentage, 30)}%` }}
              >
                <span className="text-sm text-foreground truncate">
                  {index + 1}. {course.name}
                </span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground text-right flex-shrink-0">
              {course.students} учеников
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopCourses;
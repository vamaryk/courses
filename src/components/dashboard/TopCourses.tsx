import type { AuthorDashboard } from "@/shared/api/authorDashboard";

interface TopCoursesProps {
  authorDashboard?: AuthorDashboard | null;
  authorDashboardLoading?: boolean;
}

const TopCourses = ({ authorDashboard, authorDashboardLoading }: TopCoursesProps) => {
  const loading = Boolean(authorDashboardLoading);
  const chartBars = authorDashboard?.chart_bars ?? [];

  if (loading) {
    return (
      <div className="rounded-xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (chartBars.length === 0) {
    return (
      <div className="rounded-xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Топ 5 ваших курсов</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          По числу студентов среди созданных вами курсов
        </p>
        <div className="text-sm text-muted-foreground text-center py-8">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Топ 5 ваших курсов</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        По числу студентов среди созданных вами курсов
      </p>
      <div className="space-y-3">
        {chartBars.map((course, index) => (
          <div key={`${course.name}-${index}`} className="flex items-center gap-3">
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

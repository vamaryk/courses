import { useMemo } from "react";
import { Search } from "lucide-react";
import type { MindMapSummary } from "@/shared/api/gollossary";

interface RightSidebarProps {
  currentCourse: string;
  onCourseChange: (id: string) => void;
  userCourses: Array<{ id: number; title: string }>;
  mindmaps: MindMapSummary[];
  activeStage: number;
  onStageChange: (stage: number) => void;
  unlockedStages?: Set<number>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isCourseOwner?: boolean;
  onCreateMindmap?: () => void;
  isCreatingMindmap?: boolean;
  jobsStatus?: { total: number; done: number; failed: number } | null;
}

const RightSidebar = ({
  currentCourse,
  onCourseChange,
  userCourses,
  mindmaps,
  activeStage,
  onStageChange,
  unlockedStages,
  searchQuery,
  onSearchChange,
  isCourseOwner,
  onCreateMindmap,
  isCreatingMindmap = false,
  jobsStatus,
}: RightSidebarProps) => {
  const lectures = useMemo(
    () =>
      mindmaps.map((mm, index) => ({
        id: mm._id,
        index: index + 1,
        title: mm.topic || mm.lecture_number || `Лекция ${index + 1}`,
      })),
    [mindmaps],
  );

  return (
    <div className="pt-4 pr-4">
      <div className="bg-white text-foreground rounded-2xl shadow-sm border border-border p-5">
        {/* Search */}
        <div className="mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск понятий..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-gray-50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Courses */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Курсы
          </h3>
          <div className="space-y-1">
            {userCourses.map((c) => (
              <button
                key={c.id}
                onClick={() => onCourseChange(String(c.id))}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentCourse === String(c.id)
                    ? "bg-primary/10 text-foreground font-medium border border-primary/40"
                    : "bg-gray-50 text-foreground hover:bg-gray-100"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Lectures */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Лекции
          </h3>
          <div className="space-y-2">
            {lectures.map((lec) => (
              <button
                key={lec.id}
                onClick={() => onStageChange(lec.index)}
                className={`w-full text-left px-3 py-2 rounded-full text-sm transition-all border flex items-center justify-between gap-2 ${
                  activeStage === lec.index
                    ? "bg-primary/10 text-foreground font-medium border-primary/50 shadow-sm"
                    : "bg-gray-50 text-foreground border-border hover:bg-gray-100"
                }`}
              >
                <span className="truncate">
                  {lec.index}. {lec.title}
                </span>
                {unlockedStages?.has(lec.index) ? (
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">
                    open
                  </span>
                ) : (
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                    lock
                  </span>
                )}
              </button>
            ))}
          </div>

          {isCourseOwner && onCreateMindmap && (
            <div className="mt-4 space-y-2">
              <button
                onClick={onCreateMindmap}
                disabled={isCreatingMindmap}
                className={`w-full px-3 py-2 rounded-lg text-sm transition-colors border ${
                  isCreatingMindmap
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary/10 text-foreground hover:bg-primary/15 border-primary/30"
                }`}
                title="Сгенерировать mindmap по лекциям курса"
              >
                {isCreatingMindmap ? "Генерация..." : "Создать mindmap"}
              </button>

              {/* Прогресс генерации */}
              {isCreatingMindmap && jobsStatus && (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Обработано лекций</span>
                    <span className="font-medium text-foreground">
                      {jobsStatus.done}/{jobsStatus.total}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: jobsStatus.total > 0
                          ? `${Math.round((jobsStatus.done / jobsStatus.total) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>

                  {jobsStatus.failed > 0 && (
                    <p className="text-destructive">
                      Ошибок: {jobsStatus.failed}
                    </p>
                  )}
                  <p className="text-muted-foreground leading-tight">
                    Следите за логами в терминале lecture-processor (порт 8001)
                  </p>
                </div>
              )}

              {/* Завершено без активной генерации */}
              {!isCreatingMindmap && jobsStatus && jobsStatus.done > 0 && (
                <p className="text-xs text-emerald-600 text-center">
                  ✓ Создано {jobsStatus.done} mindmap
                  {jobsStatus.failed > 0 && `, ошибок: ${jobsStatus.failed}`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;

import { motion } from "framer-motion";

interface StageBarProps {
  stages: number[];
  activeStage: number;
  onStageChange: (stage: number) => void;
  lectureNames?: Record<number, string>;
  progressPercent?: number;
  completedLectures?: number;
}

const StageBar = ({
  stages,
  activeStage,
  onStageChange,
  lectureNames,
  progressPercent = 0,
  completedLectures = 0,
}: StageBarProps) => {
  const totalLectures = stages.length;

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Прогресс по лекциям
          </p>
          <p className="text-xs sm:text-sm text-foreground truncate">
            Текущая: {activeStage}. {lectureNames?.[activeStage] || `Лекция ${activeStage}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm sm:text-base font-semibold text-foreground">
            {progressPercent}%
          </p>
          <p className="text-[11px] text-muted-foreground">
            {completedLectures}/{totalLectures}
          </p>
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => onStageChange(s)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              activeStage === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-accent"
            }`}
            title={lectureNames?.[s] || `Лекция ${s}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StageBar;


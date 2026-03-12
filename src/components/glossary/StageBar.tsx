import { motion } from "framer-motion";

interface StageBarProps {
  stages: number[];
  activeStage: number;
  onStageChange: (stage: number) => void;
  lectureNames?: Record<number, string>;
}

const StageBar = ({ stages, activeStage, onStageChange, lectureNames }: StageBarProps) => {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2 shrink-0">
        Лекция:
      </span>
      {stages.map((s) => (
        <button key={s} onClick={() => onStageChange(s)} className="relative flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all shrink-0 ${
              activeStage === s
                ? "bg-primary text-primary-foreground shadow-md"
                : s < activeStage
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {s}
          </span>
          {lectureNames?.[s] && (
            <span
              className={`text-xs whitespace-nowrap transition-colors ${
                activeStage === s ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {lectureNames[s]}
            </span>
          )}
          {activeStage === s && (
            <motion.div
              layoutId="stage-indicator"
              className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-primary"
            />
          )}
        </button>
      ))}
      <div className="flex-1 ml-4 h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${(activeStage / stages.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};

export default StageBar;


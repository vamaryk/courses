interface CourseDurationCardProps {
  hoursPractice: number;
  hoursTheory: number;
  onHoursPracticeChange: (value: number) => void;
  onHoursTheoryChange: (value: number) => void;
}

const clampHours = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 1000) return 1000;
  return Math.floor(value);
};

const parseHours = (raw: string): number => {
  const cleaned = raw.replace(/\s/g, "");
  if (cleaned === "") return 0;
  const num = Number(cleaned.replace(",", "."));
  return clampHours(num);
};

const CourseDurationCard = ({
  hoursPractice,
  hoursTheory,
  onHoursPracticeChange,
  onHoursTheoryChange,
}: CourseDurationCardProps) => {
  return (
    <div
      className="border rounded-xl p-4 bg-white animate-fade-in"
      style={{ animationDelay: "0.18s" }}
    >
      <h3 className="text-foreground font-semibold mb-4">
        Продолжительность курса
      </h3>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="block text-xs text-muted-foreground mb-1">
            Часы практики
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0 — 1000"
              className="input-field w-32 text-center"
              value={hoursPractice === 0 ? "" : hoursPractice.toString()}
              onChange={(e) => onHoursPracticeChange(parseHours(e.target.value))}
              maxLength={4}
            />
            <span className="text-foreground text-sm">ч</span>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-muted-foreground mb-1">
            Часы теории
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0 — 1000"
              className="input-field w-32 text-center"
              value={hoursTheory === 0 ? "" : hoursTheory.toString()}
              onChange={(e) => onHoursTheoryChange(parseHours(e.target.value))}
              maxLength={4}
            />
            <span className="text-foreground text-sm">ч</span>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs mt-2">
        Эти значения будут показываться в списке курсов и использоваться в
        фильтрах по длительности.
      </p>
    </div>
  );
};

export default CourseDurationCard;


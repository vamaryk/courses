interface CourseStatsProps {
  /** Средняя оценка студентов (1–5), если есть оценки */
  rating?: number | null;
  ratingsCount?: number;
  studentsCount?: number;
  theoryHours?: number;
  practiceHours?: number;
}

const ratingCaption = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} оценка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} оценки`;
  return `${n} оценок`;
};

const CourseStats = ({
  rating,
  ratingsCount = 0,
  studentsCount = 0,
  theoryHours = 0,
  practiceHours = 0,
}: CourseStatsProps) => {
  const rc = Number(ratingsCount) || 0;
  const rNum = rating == null ? NaN : Number(rating);
  const hasRatings = rc > 0 && Number.isFinite(rNum) && rNum > 0;
  const ratingLabel = hasRatings ? rNum.toFixed(1) : '—';

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">Статистика курса</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded-lg p-3 md:p-4 flex flex-col gap-0.5 min-h-[4.5rem] justify-center">
          <div className="text-[12px] md:text-xs text-muted-foreground">Рейтинг студентов</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple tabular-nums">
            {ratingLabel}
          </div>
          {hasRatings ? (
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">
              {ratingCaption(rc)}
            </div>
          ) : (
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">
              Пока нет оценок
            </div>
          )}
        </div>

        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">Студентов</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple tabular-nums">
            {studentsCount.toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">Часов теории</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple tabular-nums">
            {theoryHours} ч
          </div>
        </div>

        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">Часов практики</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple tabular-nums">
            {practiceHours} ч
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStats;
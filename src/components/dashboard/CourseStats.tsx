interface CourseStatsProps {
  rating?: number;
  graduates?: number;
  theoryHours?: number;
  practiceHours?: number;
}

const CourseStats = ({ 
  rating = 4.8,
  graduates = 1250,
  theoryHours = 35,
  practiceHours = 65
}: CourseStatsProps) => {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">Статистика курса</h2>
      
      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Rating */}
        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">рейтинг</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple">
            {rating}
          </div>
        </div>
        
        {/* Graduates */}
        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">студентов</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple">
            {graduates.toLocaleString('ru-RU')}
          </div>
        </div>
        
        {/* Theory hours */}
        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">теории</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple">
            {theoryHours} ч.
          </div>
        </div>
        
        {/* Practice hours */}
        <div className="border rounded-lg p-3 md:p-4 flex items-center justify-between">
          <div className="text-[12px] md:text-xs text-muted-foreground whitespace-nowrap">практики</div>
          <div className="text-xs md:text-lg font-bold font-Xolonium text-purple">
            {practiceHours} ч.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStats;
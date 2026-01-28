import { ChevronLeft, ChevronRight } from "lucide-react";

const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const calendarDays = [22, 23, 24, 25, 26];

const CalendarWidget = () => {
  const currentDate = new Date();
  const dayName = currentDate.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dateStr = currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const monthYear = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <aside className="w-72 flex-shrink-0 space-y-4">
      {/* Date Header */}
      <div className="glass-card rounded-3xl p-5">
        <h3 className="text-xl font-semibold text-foreground capitalize">{dayName}</h3>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
      </div>

      {/* Calendar Card */}
      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="font-semibold text-foreground capitalize">{monthYear}</h3>
          <button className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="flex justify-between mb-2">
          {daysOfWeek.map((day, index) => {
            const isToday = index === 2; // Wednesday
            return (
              <div key={day} className={`text-center text-xs font-medium w-8 py-2 ${isToday ? 'text-secondary' : 'text-muted-foreground'}`}>
                {day}
              </div>
            );
          })}
        </div>

        {/* Calendar Days Row */}
        <div className="flex justify-between">
          {calendarDays.map((day, index) => {
            const isToday = day === 22;
            return (
              <button
                key={index}
                className={`w-8 h-8 rounded-xl text-sm font-medium transition-all ${
                  isToday
                    ? "bg-secondary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Task */}
      <div className="glass-card rounded-3xl p-4 bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦄</span>
          <span className="font-medium text-foreground">Daily</span>
        </div>
      </div>

      {/* Empty Slots */}
      {[1, 2, 3, 4].map((_, index) => (
        <div
          key={index}
          className="glass-card rounded-3xl h-16"
        />
      ))}
    </aside>
  );
};

export default CalendarWidget;

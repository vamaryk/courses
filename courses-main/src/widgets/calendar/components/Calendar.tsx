import { format, isSameDay, isPast, areIntervalsOverlapping, endOfDay, startOfDay, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task } from '../types';

interface CalendarProps {
  view: 'week' | 'month';
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

export function Calendar({ view, currentDate, tasks, onEditTask }: CalendarProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  const today = new Date();
  const isMobile = window.innerWidth < 768;

  const splitTaskByDays = (task: Task, date: Date) => {
    if (isSameDay(task.startDate, task.endDate)) {
      return task;
    }

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    if (isSameDay(task.startDate, date)) {
      return {
        ...task,
        endDate: dayEnd,
      };
    } else if (isSameDay(task.endDate, date)) {
      return {
        ...task,
        startDate: dayStart,
      };
    } else if (isWithinInterval(date, { start: task.startDate, end: task.endDate })) {
      return {
        ...task,
        startDate: dayStart,
        endDate: dayEnd,
      };
    }

    return task;
  };

  const getTasksForDay = (date: Date) => {
    return tasks
      .filter(task =>
        isWithinInterval(date, {
          start: startOfDay(task.startDate),
          end: endOfDay(task.endDate)
        })
      )
      .map(task => splitTaskByDays(task, date));
  };

  const getTaskPosition = (task: Task) => {
    const hours = task.startDate.getHours();
    const minutes = task.startDate.getMinutes();
    return `${hours * 60 + minutes}px`;
  };

  const getTaskHeight = (task: Task) => {
    const durationInMinutes = (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60);
    return `${durationInMinutes}px`;
  };

  const isToday = (date: Date) => {
    return isSameDay(date, today);
  };

  const getVisibleDays = () => {
    if (isMobile) {
      return days.slice(0, 2);
    }
    return days;
  };

  const getOverlappingTasks = (tasks: Task[]) => {
    const groups: Task[][] = [];

    tasks.forEach(task => {
      const overlappingGroup = groups.find(group =>
        group.some(existingTask =>
          areIntervalsOverlapping(
            { start: task.startDate, end: task.endDate },
            { start: existingTask.startDate, end: existingTask.endDate }
          )
        )
      );

      if (overlappingGroup) {
        overlappingGroup.push(task);
      } else {
        groups.push([task]);
      }
    });

    return groups;
  };

  const getTaskStyle = (task: Task, tasks: Task[]) => {
    const overlappingGroups = getOverlappingTasks(tasks);
    const group = overlappingGroups.find(g => g.includes(task));

    if (group && group.length > 1) {
      const index = group.indexOf(task);
      const width = 100 / group.length;
      return {
        width: `${width}%`,
        left: `${width * index}%`,
        top: getTaskPosition(task),
        height: getTaskHeight(task),
      };
    }

    return {
      width: '100%',
      left: '0',
      top: getTaskPosition(task),
      height: getTaskHeight(task),
    };
  };

  if (view === 'week') {
    const visibleDays = getVisibleDays();
    const gridCols = isMobile ? 'grid-cols-2' : 'grid-cols-7';

    return (
      <div className="relative flex flex-col rounded-xl overflow-hidden">
        <div className="sticky top-0 z-1 p-4 items-center pl-[60px]">
          <div className={`grid ${gridCols} gap-2`}>
            {visibleDays.map((day, index) => {
              const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate() - currentDate.getDay() + index + 1
              );
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={day}
                  className={`
                    text-center p-4 rounded-2xl transition-all
                    ${isCurrentDay ? 'bg-white' : 'bg-white/50'}
                  `}
                >
                  <div className="flex items-center justify-between px-[0.2em]">
                    <div
                      className={`
                        text-[20px] font-normal font-montserrat leading-5
                        ${isCurrentDay ? 'text-purple-600' : 'text-[#525252]'}
                      `}
                    >
                      {day}
                    </div>
                    <div
                      className={`
                        text-[2.5em] font-semibold font-montserrat leading-none py-[0.2em]
                        ${isCurrentDay ? 'text-purple-600' : 'text-[#525252]'}
                      `}
                    >
                      {format(date, 'd', { locale: ru })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-[590px] overflow-y-auto bg-white rounded-[12px]">
          <div className="grid grid-cols-[auto,1fr] gap-4 h-full px-4">
            <div className="sticky left-0 z-1">
              {hours.map((hour) => (
                <div key={hour} className="text-sm text-gray-500 h-[60px] font-montserrat flex items-center">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            <div className="relative min-w-0">
              <div className={`grid ${gridCols}`}>
                {visibleDays.map((day, index) => {
                  const date = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDate.getDate() - currentDate.getDay() + index + 1
                  );
                  const dayTasks = getTasksForDay(date);

                  return (
                    <div key={day} className="relative min-w-0">
                      <div className="absolute inset-0">
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="border-t border-gray-200/50"
                            style={{ height: '60px' }}
                          />
                        ))}
                      </div>
                      {dayTasks.map((task) => {
                        const isTaskPast = isPast(task.endDate);
                        const taskStyle = getTaskStyle(task, dayTasks);

                        return (
                          <button
                            key={task.id}
                            onClick={() => onEditTask(task)}
                            className={`absolute bg-[#FCE3FC] backdrop-blur-sm shadow-sm rounded-xl p-2 overflow-hidden hover:bg-white transition-colors ${
                              isTaskPast ? 'opacity-50' : ''
                            }`}
                            style={taskStyle}
                          >
                            <div className="text-[#252525] font-medium text-sm text-left truncate">
                              {task.title}
                            </div>
                            <div className="text-[#525252] text-xs text-left truncate">
                              {task.description}
                            </div>
                            <div className="text-[#525252] text-xs text-left mt-1">
                              {format(task.startDate, 'HH:mm', { locale: ru })} -{' '}
                              {format(task.endDate, 'HH:mm', { locale: ru })}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const weeks = Math.ceil((totalDays + startOffset) / 7);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => (
        <div key={day} className="text-center font-montserrat font-medium py-2">
          {day}
        </div>
      ))}
      {Array.from({ length: weeks * 7 }, (_, i) => {
        const dayNumber = i - startOffset + 1;
        const isCurrentMonth = dayNumber > 0 && dayNumber <= totalDays;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
        const dayTasks = isCurrentMonth ? getTasksForDay(date) : [];
        const isCurrentDay = isCurrentMonth && isToday(date);

        return (
          <div
            key={i}
            className={`h-32 border rounded-xl p-2 ${
              isCurrentMonth
                ? isCurrentDay
                  ? 'bg-purple-100'
                  : 'bg-white'
                : 'bg-gray-50'
            }`}
          >
            {isCurrentMonth && (
              <>
                <div className={`text-sm ${isCurrentDay ? 'text-purple-600 font-medium' : 'text-gray-600'}`}>
                  {dayNumber}
                </div>
                <div className="mt-1 space-y-1">
                  {dayTasks.map((task) => {
                    const isTaskPast = isPast(task.endDate);
                    return (
                      <button
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className={`block w-full bg-purple-100 rounded p-1 text-xs hover:bg-purple-200 transition-colors text-left ${
                          isTaskPast ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="text-[#252525] font-medium truncate">
                          {task.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

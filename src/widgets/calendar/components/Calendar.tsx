import { format, isSameDay, isPast, areIntervalsOverlapping, endOfDay, startOfDay, isWithinInterval, addDays, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task } from '../types';
import { useState } from 'react';

interface CalendarProps {
  view: 'week' | 'month';
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  isCompactView: boolean;
}

interface TooltipPosition {
  x: number;
  y: number;
}

export function Calendar({ view, currentDate, tasks, onEditTask, isCompactView }: CalendarProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const today = new Date();
  
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const splitTaskByDays = (task: Task, date: Date) => {
    if (isSameDay(task.startDate, task.endDate)) {
      return task;
    }

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    if (isSameDay(task.startDate, date)) {
      return { ...task, endDate: dayEnd };
    } else if (isSameDay(task.endDate, date)) {
      return { ...task, startDate: dayStart };
    } else if (isWithinInterval(date, { start: task.startDate, end: task.endDate })) {
      return { ...task, startDate: dayStart, endDate: dayEnd };
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
    return hours * 60 + minutes;
  };

  const getTaskHeight = (task: Task) => {
    const durationInMinutes = (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60);
    return Math.max(durationInMinutes, 50);
  };

  const isToday = (date: Date) => isSameDay(date, today);

  // 🔧 Получаем даты для отображения: текущий день + следующий (на мобильных)
  const getDisplayDates = () => {
    if (isCompactView) {
      return [currentDate, addDays(currentDate, 1)];
    }
    
    // Для десктопа: начало недели (понедельник) + 6 дней
    const dayOfWeek = currentDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - diffToMonday);
    
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  };

  // 🔧 Получаем название дня недели для конкретной даты
  const getDayName = (date: Date) => {
    const dayIndex = getDay(date);
    return days[dayIndex];
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
    const top = getTaskPosition(task);
    const height = getTaskHeight(task);

    if (group && group.length > 1) {
      const index = group.indexOf(task);
      const width = 100 / group.length;
      return {
        width: `${width}%`,
        left: `${width * index}%`,
        top: `${top}px`,
        height: `${height}px`,
      };
    }

    return {
      width: 'calc(100% - 16px)',
      left: '8px',
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const handleTaskHover = (task: Task, event: React.MouseEvent) => {
    if (isCompactView) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setHoveredTask(task);
  };

  const handleTaskLeave = () => {
    setHoveredTask(null);
    setTooltipPosition(null);
  };

  const TaskContent = ({ task, taskHeight }: { task: Task; taskHeight: number }) => {
    const startTime = format(task.startDate, 'HH:mm', { locale: ru });
    const endTime = format(task.endDate, 'HH:mm', { locale: ru });

    if (taskHeight < 50) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-[#525252] text-[10px] font-medium whitespace-nowrap">
            {startTime}
          </span>
          {task.description && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          )}
        </div>
      );
    }
    
    if (taskHeight < 80) {
      return (
        <div className="space-y-0.5">
          <div className="text-[#252525] font-medium text-sm truncate">
            {task.title}
          </div>
          <div className="text-[#525252] text-[10px]">
            {startTime} - {endTime}
          </div>
        </div>
      );
    }
    
    if (taskHeight < 120) {
      return (
        <div className="space-y-1">
          <div className="text-[#252525] font-medium text-sm truncate">
            {task.title}
          </div>
          {task.description && (
            <div className="text-[#525252] text-xs line-clamp-2">
              {task.description}
            </div>
          )}
          <div className="text-[#525252] text-[10px]">
            {startTime} - {endTime}
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        <div className="text-[#252525] font-medium text-sm">
          {task.title}
        </div>
        {task.description && (
          <div className="text-[#525252] text-xs line-clamp-3">
            {task.description}
          </div>
        )}
        <div className="text-[#525252] text-xs mt-1">
          {startTime} - {endTime}
        </div>
      </div>
    );
  };

  if (view === 'week') {
    const displayDates = getDisplayDates();
    const gridCols = isCompactView ? 'grid-cols-2' : 'grid-cols-7';

    return (
      <div className="relative flex flex-col rounded-xl overflow-hidden mt-4 bg-white/50">
        <div className="sticky top-0 z-1 p-4 items-center pl-[60px]">
          <div className={`grid ${gridCols} gap-2`}>
            {displayDates.map((date, index) => {
              const isCurrentDay = isToday(date);
              const dayName = getDayName(date);

              return (
                <div
                  key={index}
                  className={`text-center p-4 rounded-2xl transition-all ${
                    isCurrentDay ? 'bg-white' : 'bg-white/50'
                  }`}
                >
                  <div className="flex items-center justify-between px-[0.2em]">
                    <div className={`text-[20px] font-normal font-Montserrat leading-5 ${
                      isCurrentDay ? 'text-purple-600' : 'text-[#525252]'
                    }`}>
                      {dayName}
                    </div>
                    <div className={`text-[2.5em] font-semibold font-Montserrat leading-none py-[0.2em] ${
                      isCurrentDay ? 'text-purple-600' : 'text-[#525252]'
                    }`}>
                      {format(date, 'd', { locale: ru })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-[590px] overflow-y-auto bg-white rounded-b-[12px]">
          <div className="grid grid-cols-[60px_1fr] h-full">
            <div className="sticky left-0 z-1 bg-white border-r border-gray-200/50">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-sm text-gray-500 h-[60px] font-Montserrat flex items-center justify-center"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            <div className="relative min-w-0">
              <div className={`grid ${gridCols} h-full`}>
                {displayDates.map((date, index) => {
                  const dayTasks = getTasksForDay(date);

                  return (
                    <div key={index} className="relative min-w-0 border-l border-gray-200/50">
                      <div className="absolute inset-0">
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="h-[60px] border-t border-gray-200/50"
                          />
                        ))}
                      </div>
                      {dayTasks.map((task) => {
                        const isTaskPast = isPast(task.endDate);
                        const taskStyle = getTaskStyle(task, dayTasks);
                        const taskHeight = getTaskHeight(task);
                        
                        return (
                          <button
                            key={task.id}
                            onClick={() => onEditTask(task)}
                            onMouseEnter={(e) => handleTaskHover(task, e)}
                            onMouseLeave={handleTaskLeave}
                            className={`absolute bg-[#FCE3FC] backdrop-blur-sm shadow-sm rounded-xl hover:bg-white transition-colors border border-purple-100 ${
                              isTaskPast ? 'opacity-50' : ''
                            }`}
                            style={{
                              ...taskStyle,
                              height: `${taskHeight}px`,
                              overflow: 'visible',
                              transition: 'box-shadow 0.2s, background-color 0.2s',
                            }}
                          >
                            <div className={taskHeight < 60 ? 'p-1.5' : 'p-2'}>
                              <TaskContent task={task} taskHeight={taskHeight} />
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

        {!isCompactView && hoveredTask && tooltipPosition && (
          <div
            className="fixed z-[100] bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold mb-1">{hoveredTask.title}</div>
            <div className="text-gray-300 text-xs mb-1">
              {format(hoveredTask.startDate, 'HH:mm', { locale: ru })} -{' '}
              {format(hoveredTask.endDate, 'HH:mm', { locale: ru })}
            </div>
            {hoveredTask.description && (
              <div className="text-gray-300 text-xs mt-2 pt-2 border-t border-gray-700">
                {hoveredTask.description}
              </div>
            )}
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"
            />
          </div>
        )}
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
        <div key={day} className="text-center font-Montserrat font-medium py-2">
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
            className={`h-32 rounded-xl p-2 ${
              isCurrentMonth
                ? isCurrentDay ? 'bg-purple-100' : 'bg-white'
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
                        onMouseEnter={(e) => handleTaskHover(task, e)}
                        onMouseLeave={handleTaskLeave}
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

      {!isCompactView && hoveredTask && tooltipPosition && (
        <div
          className="fixed z-[100] bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold mb-1">{hoveredTask.title}</div>
          <div className="text-gray-300 text-xs mb-1">
            {format(hoveredTask.startDate, 'HH:mm', { locale: ru })} -{' '}
            {format(hoveredTask.endDate, 'HH:mm', { locale: ru })}
          </div>
          {hoveredTask.description && (
            <div className="text-gray-300 text-xs mt-2 pt-2 border-t border-gray-700">
              {hoveredTask.description}
            </div>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"
          />
        </div>
      )}
    </div>
  );
}
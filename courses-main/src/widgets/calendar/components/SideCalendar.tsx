import { format, isSameDay, addDays, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../types';

interface SideCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  tasks: Task[];
}

export function SideCalendar({ currentDate, onDateChange, tasks }: SideCalendarProps) {
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i)
  );

  const getTodaysTasks = () => {
    return tasks.filter(task => isSameDay(task.startDate, today));
  };

  const isToday = (date: Date) => isSameDay(date, today);

  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  // Получение текущего месяца и года
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div className="bg-white fixed t-[4rem] rounded-xl shadow p-6 h-[calc(100vh-4.6rem)] w-[300px]">
      {/* Заголовок */}
      <div className="self-start">
        <h2 className="text-xl font-semibold font-montserrat">
          {capitalizeFirstLetter(format(today, 'EEEE', { locale: ru }))}
        </h2>
        <h3 className="text-gray-600 font-montserrat self-start">
          {format(today, 'd MMMM, yyyy', { locale: ru })}
        </h3>
      </div>

      {/* Навигация по неделям */}
      <div className="p-1 border-[1px] border-solid rounded-[12px] mt-[15px] border-[#E5E5E5]">
      <div className="flex items-center justify-between mb-2 pt-[10px]">
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            onDateChange(newDate);
          }}
        >
          <ChevronLeft className="w-4 h-4 ml-[15px] text-gray-600" />
        </button>

        {/* Месяц и год */}
        <div className="flex flex-col items-center">
          <span className="text-[14px] font-medium font-montserrat">
            {currentMonth} {currentYear}
          </span>
        </div>

        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            onDateChange(newDate);
          }}
        >
          <ChevronRight className="w-4 h-4 mr-[15px] text-gray-600" />
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-2 font-montserrat text-xs text-gray-500 text-center mb-1">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName) => (
          <span key={dayName}>{dayName}</span>
        ))}
      </div>

      {/* Даты */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((date) => {
          const dayNumber = format(date, 'd');
          const isCurrentDay = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center p-2 rounded-full font-montserrat ${
                isCurrentDay ? 'bg-[#D8E6FF] text-[#252525]' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <span className="text-sm">{dayNumber}</span>
            </button>
          );
        })}
      </div>
     </div>

      {/* Задачи на сегодня */}
      <div className="mt-6">
        <h3 className="text-lg font-medium font-montserrat mb-2">Задачи на сегодня</h3>
        <div className="space-y-3">
          {getTodaysTasks().map((task) => (
            <div key={task.id} className="bg-purple-50 p-3 border-[1px] border-solid rounded-[12px] border-[#E5E5E5]">
              <div className="text-[#252525] font-medium mb-1 line-clamp-1">
                {task.title}
              </div>
              <div className="text-[#525252] text-sm line-clamp-2">
                {task.description}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {format(task.startDate, 'HH:mm')} - {format(task.endDate, 'HH:mm')}
              </div>
            </div>
          ))}
          {getTodaysTasks().length === 0 && (
            <p className="text-gray-500 text-sm font-montserrat">Нет задач на сегодня</p>
          )}
        </div>
      </div>
    </div>
  );
}

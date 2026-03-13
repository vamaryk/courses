import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { Calendar } from './components/Calendar';
import { SideCalendar } from './components/SideCalendar';
import { TaskDialog } from './components/TaskDialog';
import { Task } from './types';
import { calendarApi } from '@/shared/api/calendar';
import { toast } from '@/hooks/use-toast';

const monthsInNominative = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  const [isCompactView, setIsCompactView] = useState(false);

  useEffect(() => {
    const checkView = () => {
      setIsCompactView(window.innerWidth < 1200);
    };
    
    checkView();
    window.addEventListener('resize', checkView);
    return () => window.removeEventListener('resize', checkView);
  }, []);

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadEvents() {
      try {
        const events = await calendarApi.getEvents();
        const mappedTasks: Task[] = events.map((event) => ({
          id: String(event.id),
          title: event.title,
          description: event.description || '',
          startDate: new Date(event.start_time),
          endDate: new Date(event.end_time),
        }));
        setTasks(mappedTasks);
      } catch (error) {
        console.error('[CALENDAR] Failed to load events:', error);
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    if (!now || tasks.length === 0) return;

    const tenMinutesMs = 10 * 60 * 1000;

    tasks.forEach((task) => {
      const diff = task.startDate.getTime() - now.getTime();
      if (diff <= tenMinutesMs && diff > tenMinutesMs - 60_000) {
        toast({
          title: 'Скоро задача из календаря',
          description: `${task.title} начнётся через 10 минут`,
        });
      }
    });
  }, [now, tasks]);

  const handleCreateTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      const payload = {
        title: taskData.title,
        description: taskData.description || '',
        start_time: taskData.startDate.toISOString(),
        end_time: taskData.endDate.toISOString(),
        event_type: 'task',
        location: null as string | null,
      };

      if (editingTask) {
        const updatedEvent = await calendarApi.updateEvent(Number(editingTask.id), payload);
        const updatedTask: Task = {
          id: String(updatedEvent.id),
          title: updatedEvent.title,
          description: updatedEvent.description || '',
          startDate: new Date(updatedEvent.start_time),
          endDate: new Date(updatedEvent.end_time),
        };

        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === editingTask.id ? updatedTask : task
          )
        );
        setEditingTask(undefined);
      } else {
        const createdEvent = await calendarApi.createEvent(payload);
        const newTask: Task = {
          id: String(createdEvent.id),
          title: createdEvent.title,
          description: createdEvent.description || '',
          startDate: new Date(createdEvent.start_time),
          endDate: new Date(createdEvent.end_time),
        };
        setTasks((prevTasks) => [...prevTasks, newTask]);
      }
    } catch (error) {
      console.error('[CALENDAR] Failed to save event:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleTaskDialogClose = () => {
    setIsTaskDialogOpen(false);
    setEditingTask(undefined);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    if (view === 'week') {
      setCurrentDate((prev) => 
        isCompactView ? subDays(prev, 2) : subWeeks(prev, 1)
      );
    } else {
      setCurrentDate((prev) => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    if (view === 'week') {
      setCurrentDate((prev) => 
        isCompactView ? addDays(prev, 2) : addWeeks(prev, 1)
      );
    } else {
      setCurrentDate((prev) => addMonths(prev, 1));
    }
  };

  const formatDateInNominative = (date: Date): string => {
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    return `${monthsInNominative[monthIndex]}, ${year}`;
  };
  
  const mainBackgroundStyle = { background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' };


  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <main className="flex-1 min-w-0 px-[20px] mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row lg:items-stretch">
            <div className="flex-1 min-w-0">
              <div 
                className="rounded-xl shadow p-6 h-full flex flex-col"
                style={mainBackgroundStyle}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center mb-6">
                    <button className="flex items-center text-gray-600 text-[12px] hover:text-gray-900">
                      Обучение
                    </button>
                  </div>
                  <button
                    onClick={() => setIsTaskDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Создать
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <h1 className="text-[24px] font-Xolonium">Планер</h1>
                  <CalendarIcon className="w-5 h-5 text-gray-500" />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-xl font-semibold">
                      {formatDateInNominative(currentDate)}
                    </h2>
                    <button
                      onClick={goToToday}
                      className="px-3 py-1 bg-gray-900 text-white rounded-full text-sm"
                    >
                      Сегодня
                    </button>
                    <div className="flex gap-2">
                      <button onClick={handlePrev}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <button onClick={handleNext}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex gap-2 bg-white/50 px-1 py-1 rounded-full">
                      <button
                        className={`px-4 py-1 rounded-full transition-all duration-300 ${
                          view === 'week' ? 'bg-[#B291FF] text-white' : 'text-gray-600'
                        }`}
                        onClick={() => setView('week')}
                      >
                        Неделя
                      </button>
                      <button
                        className={`px-4 py-1 rounded-full transition-all duration-300 ${
                          view === 'month' ? 'bg-[#B291FF] text-white' : 'text-gray-600'
                        }`}
                        onClick={() => setView('month')}
                      >
                        Месяц
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0"> 
                    <Calendar
                        view={view}
                        currentDate={currentDate}
                        tasks={tasks}
                        onEditTask={handleEditTask}
                        isCompactView={isCompactView}
                    />
                </div>
              </div>
            </div>
            
            <div className="w-[300px] flex-shrink-0 hidden lg:block">
              <div 
                className="rounded-xl shadow p-6 h-full bg-white"
              >
                <SideCalendar
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  tasks={tasks}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogClose}
        onSave={handleCreateTask}
        initialTask={editingTask}
      />
    </div>
  );
}

export default CalendarPage;
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Bell, ChevronLeft, ChevronRight, User, Plus } from 'lucide-react';
import { addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Calendar } from './components/Calendar';
import { SideCalendar } from './components/SideCalendar';
import Navigation from './components/Navigation';
import { TaskDialog } from './components/TaskDialog';
import { Task } from './types';

const monthsInNominative = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function App() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      setTasks(tasks.map(task =>
        task.id === editingTask.id
          ? { ...taskData, id: task.id }
          : task
      ));
      setEditingTask(undefined);
    } else {
      const newTask: Task = {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setTasks([...tasks, newTask]);
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
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const formatDateInNominative = (date: Date): string => {
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    return `${monthsInNominative[monthIndex]}, ${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 flex items-center justify-between px-[40px] z-[10] bg-gray-50/90 sticky top-0">
        <div className="flex items-center gap-4">
          <Navigation />
          <div className="text-xl font-bold font-xolonium">LOGO</div>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <User className="w-8 h-8 bg-gray-200 rounded-full p-1" />
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 min-w-0 md:ml-[120px] px-[20px] md:px-0 mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
              <div className="rounded-xl shadow p-6" style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center mb-6">
                    <button className="flex items-center text-gray-600 text-[12px] font-montserrat hover:text-gray-900">
                      <ChevronLeft className="w-3 h-3 mr-1" />
                      Мои курсы
                    </button>
                  </div>
                  <button
                    onClick={() => setIsTaskDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#B291FF] text-white font-montserrat rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Создать
                  </button>
                </div>
      
                <div className="flex items-center gap-4">
                  <h1 className="text-[24px] font-xolonium">Планер</h1>
                  <CalendarIcon className="w-5 h-5 text-gray-500" />
                </div>
                  
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-xl font-semibold font-montserrat">
                      {formatDateInNominative(currentDate)}
                    </h2>
                    <button
                      onClick={goToToday}
                      className="px-3 py-1 bg-gray-900 text-white rounded-full text-sm font-montserrat"
                    >
                      Сегодня
                    </button>
                    <div className="flex gap-2">
                      <button onClick={handlePrev}>
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={handleNext}>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex gap-2 bg-white/50 px-1 py-1 rounded-full">
                      <button
                        className={`px-4 py-1 rounded-full font-montserrat transition-all duration-300 ${
                          view === 'week' ? 'bg-[#B291FF] text-white' : 'text-gray-600'
                        }`}
                        onClick={() => setView('week')}
                      >
                        Неделя
                      </button>
                      <button
                        className={`px-4 py-1 rounded-full font-montserrat transition-all duration-300 ${
                          view === 'month' ? 'bg-[#B291FF] text-white' : 'text-gray-600'
                        }`}
                        onClick={() => setView('month')}
                      >
                        Месяц
                      </button>
                    </div>
                  </div>
                </div>
                <Calendar
                  view={view}
                  currentDate={currentDate}
                  tasks={tasks}
                  onEditTask={handleEditTask}
                />
              </div>
            </div>
            <div className="w-[300px] flex-shrink-0 mr-[40px] hidden lg:block">
              <SideCalendar
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                tasks={tasks}
              />
            </div>
          </div>
        </main>
      </div>

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogClose}
        onSave={handleCreateTask}
        initialTask={editingTask}
        existingTasks={tasks}
      />
    </div>
  );
}

export default App;
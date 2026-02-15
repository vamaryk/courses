import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ProgressData {
  title: string;
  progress: number;
  color: string;
}

interface ProgressRingProps {
  title: string;
  progress: number;
  color: string;
  size?: number;
}

const ProgressRing = ({ title, progress, color, size = 140 }: ProgressRingProps) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Выполнено</span>
          <span className="text-2xl font-bold text-foreground">{progress}%</span>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-foreground text-center max-w-[140px] whitespace-pre-line">{title}</p>
    </div>
  );
};

const ProgressRings = () => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [maxItemsToShowInitially, setMaxItemsToShowInitially] = useState(1);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/profile/courses/progress`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setProgressData(data);
        } else {
          console.error('Не удалось получить прогресс:', response.statusText);
          setProgressData([]);
        }
      } catch (error) {
        console.error('Ошибка при получении прогресса:', error);
        setProgressData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  // Эффект для обновления maxItemsToShowInitially в зависимости от ширины экрана
  useEffect(() => {
    const updateMaxItems = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setMaxItemsToShowInitially(4);
      } else if (width >= 768) {
        setMaxItemsToShowInitially(3);
      } else if (width >= 640) {
        setMaxItemsToShowInitially(2);
      } else {
        setMaxItemsToShowInitially(1);
      }
    };

    updateMaxItems();
    window.addEventListener('resize', updateMaxItems);
    return () => window.removeEventListener('resize', updateMaxItems);
  }, []);

  const progressDataToDisplay = showAll
    ? progressData
    : progressData.slice(0, maxItemsToShowInitially);

  const showToggleButton = progressData.length > maxItemsToShowInitially;

  const handleToggleShowAll = () => {
    setShowAll(prev => !prev);
  };

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Прогресс ваших курсов</h2>
        <div className="rounded-3xl p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  if (progressData.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Прогресс ваших курсов</h2>
        <div className="rounded-3xl p-8">
          <div className="text-sm text-muted-foreground text-center py-8">
            У вас пока нет активных курсов
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Прогресс ваших курсов</h2>
        {showToggleButton && (
          <button
            onClick={handleToggleShowAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {showAll ? 'свернуть' : 'показать все'}
          </button>
        )}
      </div>
      <div className="rounded-3xl p-8">
        <div className="flex flex-wrap justify-around gap-y-8">
          {progressDataToDisplay.map((data, index) => (
            <ProgressRing key={index} {...data} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgressRings;
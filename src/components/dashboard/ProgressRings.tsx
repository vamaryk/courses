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

import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ProgressData {
  title: string;
  progress: number;
  color: string;
}

const ProgressRings = () => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/profile/courses/progress`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setProgressData(data);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Прогресс ваших курсов</h2>
        <div className="glass-card rounded-3xl p-8">
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
        <div className="glass-card rounded-3xl p-8">
          <div className="text-sm text-muted-foreground text-center py-8">
            У вас пока нет активных курсов
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-6">Прогресс ваших курсов</h2>
      <div className="glass-card rounded-3xl p-8">
        <div className="flex justify-around">
          {progressData.map((data, index) => (
            <ProgressRing key={index} {...data} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgressRings;

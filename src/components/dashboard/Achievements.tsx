import { useState, useEffect } from "react";
import { achievementsApi, Achievement } from "../../shared/api/achievements";

const API_URL = import.meta.env.VITE_API_URL || '';

function resolveAchievementIcon(iconUrl: string | null): string | null {
  if (!iconUrl) return null;
  if (iconUrl.startsWith('/achievement-media/')) {
    return `${API_URL}${iconUrl}`;
  }
  if (iconUrl.startsWith('/icons/achievements/')) {
    const filename = iconUrl.replace('/icons/achievements/', '');
    return `${API_URL}/achievement-media/${filename}`;
  }
  if (iconUrl.startsWith('http') || iconUrl.startsWith('data:')) {
    return iconUrl;
  }
  return `${API_URL}/achievement-media/${iconUrl}`;
}

const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const iconSrc = resolveAchievementIcon(achievement.icon_url);

  return (
  <div className="flex items-center gap-3 bg-white/70 backdrop-blur-xl border-1 border-muted-foreground/30 rounded-2xl px-4 py-3 h-full w-full max-w-full overflow-hidden">
    {iconSrc ? (
      <img
        src={iconSrc}
        alt={achievement.name}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    ) : (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
        {achievement.name.charAt(0)}
      </div>
    )}
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-xs font-medium text-foreground leading-tight truncate">
        {achievement.name}
      </span>
      {achievement.description && (
        <span className="text-xs text-muted-foreground leading-tight mt-1 line-clamp-2">
          {achievement.description}
        </span>
      )}
    </div>
  </div>
  );
};

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const data = await achievementsApi.getUserAchievements();
        setAchievements(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching achievements:', err);
        setError('Не удалось загрузить достижения');
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  // Эффект для определения количества колонок в зависимости от ширины экрана
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setColumns(4);
      } else if (width >= 768) {
        setColumns(2);
      } else {
        setColumns(1);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Максимальное количество элементов для отображения в двух строках
  const maxItemsToShow = columns * 2;
  const achievementsToDisplay = showAll ? achievements : achievements.slice(0, maxItemsToShow);

  // Обработчик для кнопки "показать все" / "свернуть"
  const handleToggleShowAll = () => {
    setShowAll(prev => !prev);
  };

  const showToggleButton = achievements.length > maxItemsToShow;

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Мои достижения</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Мои достижения</h2>
        </div>
        <div className="text-sm text-muted-foreground text-center py-4">
          {error}
        </div>
      </section>
    );
  }

  if (achievements.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Мои достижения</h2>
        </div>
        <div className="text-sm text-muted-foreground py-4">
          У вас пока нет достижений. Начните обучение, чтобы получить первые награды!
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Мои достижения</h2>
        {showToggleButton && ( // Отображаем кнопку только если достижений больше, чем помещается в две строки
          <button
            onClick={handleToggleShowAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {showAll ? 'свернуть' : 'показать все'}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {achievementsToDisplay.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </section>
  );
};

export default Achievements;
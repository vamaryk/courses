import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { achievementsApi, Achievement } from "../../shared/api/achievements";

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        // В случае ошибки показываем пустой массив
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  // Если загрузка или нет достижений, показываем пустое состояние
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
        <div className="text-sm text-muted-foreground text-center py-4">
          У вас пока нет достижений. Начните обучение, чтобы получить первые награды!
        </div>
      </section>
    );
  }

  // Разбиваем достижения на строки по 4 элемента
  const topRow = achievements.slice(0, 4);
  const bottomRow = achievements.slice(4, 8);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Мои достижения</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          показать все
        </button>
      </div>
      <div className="relative">
        <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 rounded-full bg-white/80 shadow-lg flex items-center justify-center hover:bg-white transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <div className="space-y-3">
          {[topRow, bottomRow].map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-3">
              {row.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3 min-w-[200px]"
                >
                  {achievement.icon_url ? (
                    <img
                      src={achievement.icon_url}
                      alt={achievement.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback на дефолтную иконку, если изображение не загрузилось
                        (e.target as HTMLImageElement).src = '/icons/achievements/default.svg';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                      {achievement.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground leading-tight">
                      {achievement.name}
                    </span>
                    {achievement.description && (
                      <span className="text-xs text-muted-foreground leading-tight mt-1">
                        {achievement.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 rounded-full bg-white/80 shadow-lg flex items-center justify-center hover:bg-white transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </section>
  );
};

export default Achievements;

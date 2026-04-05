import { ChevronLeft, BookOpen, FileCheck, Heart, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-robot.jpg";

interface HeroHeaderProps {
  courseTitle?: string;
  courseDescription?: string;
  authorName?: string;
  authorAvatar?: string | null;
  coverImage?: string | null;
  stats?: {
    lectures?: { completed: number; total: number };
    assignments?: { completed: number; total: number };
  };
  tags?: string[];
  price?: number;
  isFavorite?: boolean;
  isFavoriteLoading?: boolean;
  isBuyLoading?: boolean;
  onToggleFavorite?: () => void;
  onBuy?: () => void;
  onAuthorClick?: () => void;
}

const HeroHeaderUser = ({
  courseTitle = "Основы HTML и CSS",
  courseDescription = "Курс для начинающих верстальщиков сайтов на HTML и CSS. Разбираем реальные макеты, изучаем семантику языка, отрабатываем навыки в тренажере. В курсе более 190 заданий. Из них 150 – решение практических задач.",
  authorName = "Иван Иванов",
  authorAvatar,
  coverImage,
  stats = {
    lectures: { completed: 0, total: 0 },
    assignments: { completed: 0, total: 0 },
  },
  tags = ["Программирование", "HTML", "CSS"],
  price = 5900,
  isFavorite = false,
  isFavoriteLoading = false,
  isBuyLoading = false,
  onToggleFavorite,
  onBuy,
  onAuthorClick,
}: HeroHeaderProps) => {
  const navigate = useNavigate();
  const isFreeCourse = !price || price <= 0;
  const lecturePair = stats.lectures ?? { completed: 0, total: 0 };
  const assignmentPair = stats.assignments ?? { completed: 0, total: 0 };
  const lecDone = Number(lecturePair.completed) || 0;
  const lecTot = Number(lecturePair.total) || 0;
  const asgDone = Number(assignmentPair.completed) || 0;
  const asgTot = Number(assignmentPair.total) || 0;

  return (
    <div className="relative rounded-xl overflow-hidden mb-4">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${coverImage || heroImage})` }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />

      <div className="relative z-10 p-6 md:p-8 min-h-[280px] flex flex-col justify-between">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <button
              onClick={() => navigate("/courses")}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm mb-4 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Все курсы
            </button>

            <h1 className="text-2xl md:text-2xl lg:text-3xl font-Xolonium font-bold text-white mb-3">
              {courseTitle}
            </h1>

            <p className="text-white/70 text-sm max-w-lg leading-relaxed mb-6 line-clamp-3 md:line-clamp-4">
              {courseDescription}
            </p>

            <div className="flex items-center gap-3">
              {onAuthorClick ? (
                <button
                  type="button"
                  onClick={onAuthorClick}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden ring-2 ring-white/30 group-hover:ring-white/60 transition">
                    {authorAvatar ? (
                      <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-white text-sm font-medium group-hover:underline">{authorName}</span>
                </button>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden">
                    {authorAvatar ? (
                      <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-white text-sm font-medium">{authorName}</span>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:block flex gap-2 flex-wrap">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs md:text-sm font-medium border border-white/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2 mb-1">
          <div className="flex flex-wrap items-center gap-6 md:gap-8 pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-white/60 shrink-0" />
              <span className="text-white/60 text-xs md:text-sm">лекций:</span>
              <span className="text-white font-semibold text-sm tabular-nums flex items-baseline gap-1">
                <span className="text-emerald-300">{lecDone}</span>
                <span className="text-white/45 font-normal">/</span>
                <span>{lecTot}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-white/60 shrink-0" />
              <span className="text-white/60 text-xs md:text-sm">заданий:</span>
              <span className="text-white font-semibold text-sm tabular-nums flex items-baseline gap-1">
                <span className="text-emerald-300">{asgDone}</span>
                <span className="text-white/45 font-normal">/</span>
                <span>{asgTot}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold text-white">
              {isFreeCourse ? "Бесплатно" : `${price.toLocaleString("ru-RU")} ₽`}
            </div>
            <button
              onClick={onBuy}
              disabled={isBuyLoading}
              className="px-4 py-3 border-2 border-purple text-white rounded-xl font-semibold hover:bg-purple transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
            >
              {isBuyLoading ? (isFreeCourse ? "Запись..." : "Покупка...") : isFreeCourse ? "Записаться на курс" : "Купить"}
            </button>
          </div>

          <button
            onClick={onToggleFavorite}
            disabled={isFavoriteLoading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-600/20 border-2 border-purple hover:bg-purple transition-all duration-200 cursor-pointer"
          >
            {isFavorite ? (
              <>
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="text-white font-medium">{isFavoriteLoading ? "..." : 'В "Избранном"'}</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 text-white/70" />
                <span className="text-white font-medium">{isFavoriteLoading ? "..." : 'В "Избранное"'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="md:hidden absolute bottom-16 left-4 flex gap-2 flex-wrap">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium border border-white/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default HeroHeaderUser;

import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Star,
  CreditCard,
  Heart,
  Pencil,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/AuthProvider";
import heroFallbackCover from "@/assets/course-python-1.jpg";
import { getShortDescription } from "@/shared/utils/courseDescription";
import { resolveProfileMediaUrl } from "@/shared/utils/media";

export type CatalogCourseCardSize = "compact" | "default" | "comfortable";

export interface CatalogCourseCardProps {
  courseId: number | string;
  title: string;
  description?: string | null;
  /** Полный URL обложки */
  coverUrl?: string | null;
  price?: number;
  rating?: number | null;
  authorName?: string | null;
  /** Путь к аватару автора (`/profile-media/...` или полный URL) */
  authorAvatarUrl?: string | null;
  language?: string | null;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: number | string) => void;
  size?: CatalogCourseCardSize;
  className?: string;
  /** Бейдж публичности на обложке (блок «Популярно» на главной) */
  visibility?: "public" | "private";
  /** Прогресс обучения — «Мои курсы», профиль */
  progress?: { percent: number; isCompleted?: boolean };
  /** Редактирование (автор) */
  manageHref?: string;
  /** Статистика для автора/админа */
  statisticsHref?: string;
  courseAuthorId?: string | number;
  /** Вместо рейтинга/цены — счётчики (карусель созданных курсов) */
  authorStats?: { favorites: number; students: number };
  /** Доп. строка под блоком автора/рейтинга (например число учеников в профиле) */
  audienceNote?: string;
  /** Только автор слева, без рейтинга/цены (карточка с прогрессом в профиле) */
  hideCommerceRow?: boolean;
  /** Не показывать абзац описания (компактные карусели) */
  hideDescription?: boolean;
  /**
   * Профиль — созданные курсы: только обложка, название, описание и кнопка
   * перехода к редактированию (без автора, лайков, учеников, рейтинга, цены).
   */
  profileMinimal?: boolean;
}

const sizeStyles: Record<
  CatalogCourseCardSize,
  {
    card: string;
    title: string;
    desc: string;
    body: string;
  }
> = {
  compact: {
    card: "rounded-xl shadow-md",
    title:
      "text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 line-clamp-2 min-h-[2.25rem]",
    desc: "text-[11px] sm:text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2.25rem]",
    body: "p-2 sm:p-3",
  },
  default: {
    card: "rounded-xl sm:rounded-2xl shadow-md",
    title:
      "lg:text-lg sm:text-xs font-semibold text-gray-900 mb-2 line-clamp-1",
    desc: "text-sm text-gray-600 mb-2 line-clamp-2 min-h-[40px]",
    body: "p-3 sm:p-4 lg:p-3",
  },
  comfortable: {
    card: "rounded-2xl shadow-md",
    title:
      "text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2",
    desc: "text-sm text-gray-600 mb-3 line-clamp-3 min-h-[48px]",
    body: "p-4 sm:p-5",
  },
};

export function CatalogCourseCard({
  courseId,
  title,
  description,
  coverUrl,
  price = 0,
  rating,
  authorName,
  authorAvatarUrl,
  language,
  isFavorite = false,
  onFavoriteToggle,
  size = "default",
  className,
  visibility,
  progress,
  manageHref,
  statisticsHref,
  courseAuthorId,
  authorStats,
  audienceNote,
  hideCommerceRow = false,
  hideDescription = false,
  profileMinimal = false,
}: CatalogCourseCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const s = sizeStyles[size];

  const showStatistics =
    statisticsHref &&
    user &&
    (user.role === "admin" ||
      (courseAuthorId != null && String(user.id) === String(courseAuthorId)));

  const cover = coverUrl || heroFallbackCover;
  const authorAvatarResolved = resolveProfileMediaUrl(authorAvatarUrl ?? null);
  const priceLabel =
    price > 0 ? `${Number(price).toLocaleString("ru-RU")} ₽` : "Бесплатно";
  const ratingLabel =
    rating != null && Number(rating) > 0
      ? Number(rating).toFixed(1)
      : "—";

  return (
    <Link
      to={`/courses/${courseId}`}
      className={cn(
        "relative bg-background overflow-hidden group hover:shadow-lg transition-shadow duration-300 flex flex-col block cursor-pointer h-full",
        s.card,
        className,
      )}
    >
      <div className="aspect-video relative overflow-hidden shrink-0">
        <img
          src={cover}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

        {!profileMinimal ? (
          <div className="absolute top-2 left-2 flex flex-wrap gap-2 max-w-[calc(100%-5rem)] z-[1]">
            {visibility != null ? (
              <span className="px-2 py-1 bg-background/80 backdrop-blur-sm text-purple-600 text-xs font-medium rounded-full">
                {visibility === "public" ? "Публичный" : "Приватный"}
              </span>
            ) : null}
            {language ? (
              <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
                {language}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {manageHref ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(manageHref);
              }}
              className="p-1.5 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
              aria-label={
                profileMinimal
                  ? "Редактировать название курса"
                  : "Управление курсом"
              }
            >
              <Pencil className="h-4 w-4 text-white" />
            </button>
          ) : null}
          {onFavoriteToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavoriteToggle(courseId);
              }}
              className={cn(
                "p-1 rounded-full transition-all",
                isFavorite
                  ? "bg-white text-red-500"
                  : "bg-white/70 hover:bg-white text-gray-500",
              )}
              aria-label={
                isFavorite ? "Убрать из избранного" : "Добавить в избранное"
              }
            >
              <Heart
                className={cn(
                  "w-4 h-4",
                  isFavorite ? "fill-current" : "",
                )}
              />
            </button>
          ) : null}
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col min-h-0", s.body)}>
        <h3 className={s.title}>{title}</h3>
        {!hideDescription ? (
          <p className={s.desc}>{getShortDescription(description)}</p>
        ) : null}

        {progress != null ? (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>
                {progress.isCompleted ? "Завершён" : "В процессе"}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 bg-purple rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {!profileMinimal ? (
          <div className="border-t border-gray-100 mt-auto pt-1">
            <div className="pt-1 flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {authorAvatarResolved ? (
                    <img
                      src={authorAvatarResolved}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Users className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <span className="text-xs text-gray-500 line-clamp-1">
                  {authorName || "Автор не указан"}
                </span>
              </div>

              {authorStats ? (
                <div className="flex items-center gap-3 text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-red-500" />
                    <span>{authorStats.favorites}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-gray-500" />
                    <span>{authorStats.students}</span>
                  </div>
                </div>
              ) : hideCommerceRow ? null : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 border border-gray-200 rounded-full px-2 py-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium text-gray-900">
                      {ratingLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 border-2 border-gray-200 rounded-full px-2 py-1">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-900">
                      {priceLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {showStatistics ? (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(statisticsHref);
                  }}
                  className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors"
                  title="Статистика курса"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
            ) : null}
            {audienceNote ? (
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 line-clamp-2">
                {audienceNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

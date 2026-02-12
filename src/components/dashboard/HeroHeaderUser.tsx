import { ChevronLeft, Clock, BookOpen, FileCheck, Heart, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-robot.jpg";

interface HeroHeaderProps {
  courseTitle?: string;
  courseDescription?: string;
  authorName?: string;
  stats?: {
    totalLectures?: number;
    totalPrograms?: number;
    totalTests?: number;
  };
  tags?: string[];
  price?: number;
  isFavorite?: boolean;
  isFavoriteLoading?: boolean;
  isBuyLoading?: boolean;
  onToggleFavorite?: () => void;
  onBuy?: () => void;
}

const HeroHeaderUser = ({ 
  courseTitle = "Основы HTML и CSS",
  courseDescription = "Курс для начинающих верстальщиков сайтов на HTML и CSS. Разбираем реальные макеты, изучаем семантику языка, отрабатываем навыки в тренажере. В курсе более 190 заданий. Из них 150 – решение практических задач.",
  authorName = "Иван Иванов",
  stats = {
    totalLectures: 40,
    totalPrograms: 5,
    totalTests: 15
  },
  tags = ["Программирование", "HTML", "CSS"],
  price = 5900,
  isFavorite = false,
  isFavoriteLoading = false,
  isBuyLoading = false,
  onToggleFavorite,
  onBuy,
}: HeroHeaderProps) => {
  const navigate = useNavigate();
  const isFreeCourse = price <= 0;

  return (
    <div className="relative rounded-xl overflow-hidden mb-4">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 p-6 md:p-8 min-h-[280px] flex flex-col justify-between">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <button 
              onClick={() => navigate("/courses")}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm mb-4"
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">{authorName}</span>
            </div>
          </div>
          
          {/* Tags - only show on medium+ screens */}
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
        
        {/* Stats row - total counts */}
        <div className="mt-2 mb-3">
          <div className="flex items-center gap-6 md:gap-8 pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-white/60" />
              <span className="text-white font-semibold text-sm">{stats.totalLectures || 0}</span>
              <span className="text-white/60 text-xs md:text-sm">лекций</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-white/60" />
              <span className="text-white font-semibold text-sm">{stats.totalPrograms || 0}</span>
              <span className="text-white/60 text-xs md:text-sm">программ</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="text-white font-semibold text-sm">{stats.totalTests || 0}</span>
              <span className="text-white/60 text-xs md:text-sm">тестов</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          {/* Price and Buy button */}
          <div className="flex items-center gap-4">
            {!isFreeCourse && (
              <div className="text-xl font-bold text-white">
                {price.toLocaleString('ru-RU')} ₽
              </div>
            )}
            <button 
              onClick={onBuy}
              disabled={isBuyLoading}
              className="px-4 py-2 border-2 border-purple text-white rounded-full font-semibold hover:bg-purple transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isBuyLoading ? (isFreeCourse ? "Запись..." : "Покупка...") : (isFreeCourse ? "Записаться на курс" : "Купить")}
            </button>
          </div>
          
          {/* Favorite button */}
          <button
            onClick={onToggleFavorite}
            disabled={isFavoriteLoading}
            className="flex items-center gap-2 px-4 py-3 rounded-full border-2 border-white/20 hover:border-white/40 transition-all duration-200"
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
      
      {/* Tags for mobile - shown only on small screens */}
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
import { ChevronLeft, Clock, BookOpen, FileCheck, TrendingUp, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-robot.jpg";

interface HeroHeaderProps {
  courseTitle?: string;
  courseDescription?: string;
  authorName?: string;
  stats?: {
    tests?: string;
    programs?: string;
    lectures?: string;
    progress?: string;
  };
  tags?: string[];
  progress?: number;
}

const HeroHeader = ({ 
  courseTitle = "Основы HTML и CSS",
  courseDescription = "Курс для начинающих верстальщиков сайтов на HTML и CSS. Разбираем реальные макеты, изучаем семантику языка, отрабатываем навыки в тренажере. В курсе более 190 заданий. Из них 150 – решение практических задач.",
  authorName = "Иван Иванов",
  stats = {
    tests: "1/15",
    programs: "0/5",
    lectures: "1/40",
    progress: "1%"
  },
  tags = ["Программирование", "HTML", "CSS"],
  progress = 1
}: HeroHeaderProps) => {
  const navigate = useNavigate();

  const defaultStats = [
    { icon: FileCheck, value: stats.tests || "1/15", label: "тестов" },
    { icon: BookOpen, value: stats.programs || "0/5", label: "программ" },
    { icon: BookOpen, value: stats.lectures || "1/40", label: "лекций" },
    { icon: TrendingUp, value: stats.progress || "1%", label: "прогресс" },
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden mb-6">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 p-8 min-h-[280px] flex flex-col justify-between">
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div>
            <button 
              onClick={() => navigate("/courses")}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Мои курсы
            </button>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {courseTitle}
            </h1>
            
            <p className="text-white/70 text-sm max-w-lg leading-relaxed mb-6">
              {courseDescription}
            </p>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">{authorName}</span>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag, index) => (
              <span 
                key={index}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium border border-white/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center gap-8 pt-4 border-t border-white/10">
          {defaultStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-white/60" />
                <span className="text-white font-semibold">{stat.value}</span>
                <span className="text-white/60 text-sm">{stat.label}</span>
              </div>
            );
          })}
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroHeader;

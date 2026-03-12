import { Heart, Clock, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Course {
  id: string;
  title: string;
  imageUrl: string;
  badge: string;
  hoursPractice: number;
  hoursTheory: number;
  price: number;
  instructorName: string;
  instructorAvatar?: string;
  isFavorite?: boolean;
}

interface CourseCardProps {
  course: Course;
  onFavoriteToggle?: (id: string) => void;
}

export function CourseCard({ course, onFavoriteToggle }: CourseCardProps) {
  const navigate = useNavigate();
  const {
    id,
    title,
    imageUrl,
    badge,
    hoursPractice,
    hoursTheory,
    price,
    instructorName,
    instructorAvatar,
    isFavorite = false,
  } = course;

  const handleCardClick = () => {
    navigate(`/courses/${id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking favorite button
    onFavoriteToggle?.(id);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-soft-xl transition-all duration-300 animate-fade-in cursor-pointer"
    >
      {/* Image container */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        
        {/* Badge */}
        <div className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-soft">
          {badge}
        </div>
        
        {/* Title on image */}
        <h3 className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-primary-foreground leading-tight">
          {title}
        </h3>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-xs text-secondary-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{hoursPractice} ч. практики</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-xs text-secondary-foreground">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{hoursTheory} ч. теории</span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Instructor */}
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={instructorAvatar} alt={instructorName} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {instructorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{instructorName}</span>
          </div>
          
          {/* Price and Favorite */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-semibold text-foreground">
              {price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : "Бесплатно"}
            </span>
            <button
              onClick={handleFavoriteClick}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                isFavorite
                  ? "text-destructive"
                  : "text-muted-foreground hover:text-destructive/70"
              )}
            >
              <Heart
                className="w-5 h-5"
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

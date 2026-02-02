import { Progress } from "@/components/ui/progress";

interface CourseCardProps {
  title: string;
  image: string;
  progress: number;
  isCompleted?: boolean;
}

const CourseCard = ({ title, image, progress, isCompleted = false }: CourseCardProps) => {
  return (
    <div className="course-card w-full">
      <div className="relative h-44 overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="font-semibold text-white text-sm sm:text-base mb-2 sm:mb-3 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center justify-between text-white/80 text-xs mb-1 sm:mb-2">
            <span className="hidden sm:block">Прогресс курса</span>
            <span className="sm:hidden">Прогресс</span>
            <span>{isCompleted ? "Пройден" : `${progress}%`}</span>
          </div>
          <Progress 
            value={progress} 
            className="h-1.5 bg-white/20" 
          />
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
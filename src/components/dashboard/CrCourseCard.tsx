import { Heart, Users, Pencil } from "lucide-react";
import { Link } from "react-router-dom";

interface CrCourseCardProps {
  id: string | number;
  title: string;
  image: string;
  favoritesCount: number;
  studentsCount: number;
}

const CrCourseCard = ({ id, title, image, favoritesCount, studentsCount }: CrCourseCardProps) => {
  return (
    <div className="w-full hover:-translate-y-0.5">
      <div className="relative h-44 overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Edit button */}
        <Link 
          to={`/courses/${id}/manage`}
          className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
        >
          <Pencil className="h-4 w-4 text-white" />
        </Link>
        
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="font-semibold text-white text-sm sm:text-base mb-2 sm:mb-3 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-4 text-white/80 text-xs">
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              <span>{favoritesCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{studentsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrCourseCard;
import { Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
const CreateCourseCard = () => {
  return (
    <Link to="/courses/create" className="block w-full hover:-translate-y-0.5">
      <div className="relative h-44 overflow-hidden rounded-2xl border-2 border-dashed border-muted-foreground/30 shadow-md hover:shadow-lg hover:bg-purple/10 transition-all duration-300 cursor-pointer">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Wand2 className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Создать курс</span>
        </div>
      </div>
    </Link>
  );
};
export default CreateCourseCard;
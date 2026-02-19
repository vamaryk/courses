import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CourseHeaderCardProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

const CourseHeaderCard = ({ title, description, onTitleChange, onDescriptionChange }: CourseHeaderCardProps) => {
  return (
    <div className="border rounded-xl p-4 bg-white animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <h3 className="text-foreground font-semibold mb-4">Шапка курса</h3>
      
      {/* Course Title Input */}
      <input
        type="text"
        placeholder="Введите название курса..."
        className="input-field mb-4"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />

      {/* Description Textarea with AI Icon */}
      <div className="relative mb-4">
        <textarea
          placeholder="Введите описание курса..."
          className="input-field min-h-[120px] resize-none pr-12"
          rows={4}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="absolute top-3 right-4 text-primary hover:scale-110 transition-transform p-1 rounded-md hover:bg-primary/10 cursor-pointer"
                aria-label="Сгенерировать описание с помощью ИИ"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
              <p>Сгенерировать на основе информации в блоке "О чём Ваш курс?"</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Price Input - пока не используется в API */}
      {/* <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm whitespace-nowrap">Стоимость курса</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="0 - 999 999"
            className="input-field w-32 text-center"
          />
          <span className="text-foreground font-medium">₽</span>
        </div>
      </div> */}
    </div>
  );
};

export default CourseHeaderCard;
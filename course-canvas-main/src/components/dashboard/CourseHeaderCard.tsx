import { Sparkles } from "lucide-react";

const CourseHeaderCard = () => {
  return (
    <div className="card-blue animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <h3 className="text-foreground font-semibold mb-4">Шапка курса</h3>
      
      {/* Course Title Input */}
      <input
        type="text"
        placeholder="Введите название курса..."
        className="input-field mb-4"
      />

      {/* Description Textarea with AI Icon */}
      <div className="relative mb-4">
        <textarea
          placeholder="Введите описание курса..."
          className="input-field min-h-[120px] resize-none pr-10"
          rows={4}
        />
        <button className="absolute top-3 right-3 text-primary hover:scale-110 transition-transform">
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Price Input */}
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm whitespace-nowrap">Стоимость курса</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="0 - 999 999"
            className="input-field w-32 text-center"
          />
          <span className="text-foreground font-medium">₽</span>
        </div>
      </div>
    </div>
  );
};

export default CourseHeaderCard;

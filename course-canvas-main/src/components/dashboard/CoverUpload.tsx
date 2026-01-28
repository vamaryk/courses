import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const CoverUpload = () => {
  return (
    <div className="cover-upload bg-popover h-64 relative animate-fade-in">
      {/* User Info - Top Left */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <Avatar className="w-10 h-10 border-2 border-popover">
          <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" />
          <AvatarFallback className="bg-primary text-primary-foreground">ИИ</AvatarFallback>
        </Avatar>
        <span className="text-foreground font-medium">Иван Иванов</span>
      </div>

      {/* Save Button - Top Right */}
      <div className="absolute top-4 right-4">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 rounded-xl">
          Сохранить
        </Button>
      </div>

      {/* Upload Center */}
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-cover-border flex items-center justify-center mb-3 hover:border-primary transition-colors cursor-pointer group">
          <Plus className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
        </div>
        <span className="text-primary font-medium">Добавить обложку</span>
      </div>
    </div>
  );
};

export default CoverUpload;

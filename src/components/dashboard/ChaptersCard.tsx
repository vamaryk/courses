import { Pencil, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { coursesApi, type Chapter } from "@/shared/api/courses";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChaptersCardProps {
  chapters: Chapter[];
  courseId: number;
  onChaptersChange: (chapters: Chapter[]) => void;
  isCreatePage: boolean;
}

const ChaptersCard = ({ chapters, courseId, onChaptersChange, isCreatePage }: ChaptersCardProps) => {
  const navigate = useNavigate();
  const [localChapters, setLocalChapters] = useState<Chapter[]>(chapters);

  useEffect(() => {
    setLocalChapters(chapters);
  }, [chapters]);

  const addChapter = async () => {
    if (isCreatePage) {
      // Если курс еще не создан, просто добавляем локально
      const newChapter: Chapter = {
        id: Date.now(), // временный ID
        course_id: courseId,
        title: "",
        order: localChapters.length + 1,
      };
      const updated = [...localChapters, newChapter];
      setLocalChapters(updated);
      onChaptersChange(updated);
    } else {
      // Если курс создан, создаем главу через API
      try {
        const newChapter = await coursesApi.createChapter(courseId, {
          title: "",
          order: localChapters.length + 1,
        });
        const updated = [...localChapters, newChapter];
        setLocalChapters(updated);
        onChaptersChange(updated);
        toast.success("Глава добавлена");
      } catch (error) {
        console.error("Error creating chapter:", error);
        toast.error("Ошибка при создании главы");
      }
    }
  };

  const handleChapterTitleChange = async (index: number, title: string) => {
    const updated = [...localChapters];
    updated[index].title = title;
    setLocalChapters(updated);
    onChaptersChange(updated);

    // Если глава уже сохранена в БД, обновляем через API
    if (!isCreatePage && updated[index].id && updated[index].id > 0) {
      try {
        await coursesApi.updateChapter(updated[index].id, {
          title,
          order: updated[index].order,
        });
      } catch (error) {
        console.error("Error updating chapter:", error);
        toast.error("Ошибка при обновлении главы");
      }
    }
  };

  const handleEditChapter = async (chapter: Chapter) => {
    if (isCreatePage) {
      toast.error("Сначала сохраните курс");
      return;
    }
    if (!chapter.id || chapter.id <= 0) {
      toast.error("Глава еще не сохранена");
      return;
    }

    // Navigate to subchapter edit page
    navigate(`/courses/${courseId}/chapters/${chapter.id}/subchapters`);
  };

  return (
    <div className="border rounded-xl p-4 bg-white animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <h3 className="text-foreground font-semibold mb-4">Главы</h3>

      {/* Chapter List */}
      <div className="space-y-3 mb-4">
        {localChapters.map((chapter, index) => (
          <div key={chapter.id || index} className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm w-5">{index + 1}.</span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Введите название главы..."
                  className="input-field pr-10"
                  value={chapter.title}
                  onChange={(e) => handleChapterTitleChange(index, e.target.value)}
                />
                
                {/* Edit button with Tooltip */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleEditChapter(chapter)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform p-1 rounded-md hover:bg-primary/10 cursor-pointer"
                        aria-label="Редактировать подглавы"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                      <p>Редактировать подглавы</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Chapter Button */}
      <button
        onClick={addChapter}
        className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border-2 border-primary text-primary font-medium hover:bg-primary/10 transition-colors"
      >
        Добавить главу
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ChaptersCard;
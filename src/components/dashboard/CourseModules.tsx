import { useState } from "react";
import { ChevronDown, CheckCircle2, PlayCircle, FileText, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Module {
  id: string;
  title: string;
  subchapterId?: number;
  description?: string;
  duration?: string;
  isCompleted?: boolean;
  isPlaying?: boolean;
  hasFireIcon?: boolean;
}

interface Section {
  id: string;
  title: string;
  chapterId?: number;
  firstSubchapterId?: number;
  modules: Module[];
}

interface CourseModulesProps {
  sections?: Section[];
  onStartChapter?: (chapterId: number, subchapterId: number) => void;
}

const defaultSections: Section[] = [
  {
    id: "1",
    title: "1. Введение",
    modules: [
      { 
        id: "1-1", 
        title: "Введение в HTML и CSS", 
        isCompleted: true,
        description: "Знакомство с основами веб-разработки. Что такое HTML теги и CSS стили."
      },
      { 
        id: "1-2", 
        title: "Структура документа", 
        isPlaying: true,
        description: "Разбор базовой структуры HTML5 документа: head, body, meta теги."
      },
      { 
        id: "1-3", 
        title: "Задачи верстки и верстальщика",
        description: "Что входит в обязанности фронтенд-разработчика и верстальщика."
      },
    ],
  },
  {
    id: "2",
    title: "2. Базовые понятия интернета",
    modules: [
      { 
        id: "2-1", 
        title: "IP - адрес, домен, DNS",
        description: "В этом блоке курса будут изучены основные понятия IP-адресов, доменных имен и системы DNS.",
        duration: "41 : 40",
        hasFireIcon: true,
      },
      { id: "2-2", title: "HTTP, HTTP2 и HTTPS", description: "Протоколы передачи данных. Различия между версиями протокола." },
      { id: "2-3", title: "Структура HTTP запросов и ответов", description: "Детальный разбор заголовков, методов и кодов состояния." },
    ],
  },
  {
    id: "3",
    title: "3. Основы CSS",
    modules: [
      { id: "3-1", title: "Селекторы и специфичность", description: "Как браузер понимает, какие стили применять к элементам." },
      { id: "3-2", title: "Блочная модель", description: "Margin, padding, border, content. Как элементы занимают место." },
    ],
  },
  {
    id: "4",
    title: "4. Продвинутая верстка",
    modules: [
      { id: "4-1", title: "Flexbox и Grid", description: "Современные методы расположения элементов на странице." },
    ],
  },
];

const CourseModules = ({ sections = defaultSections, onStartChapter }: CourseModulesProps) => {
  const [expandedModules, setExpandedModules] = useState<string[]>(["2-1"]);
  const [showMore, setShowMore] = useState(false);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const visibleSections = showMore ? sections : sections.slice(0, 3);

  return (
    <div>
      <div className="border rounded-lg p-4 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {section.title}
              </h3>
              {section.chapterId && section.firstSubchapterId && onStartChapter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStartChapter(section.chapterId, section.firstSubchapterId)}
                  className="h-8 px-3 cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Пуск
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {section.modules.map((module) => {
                const isExpanded = expandedModules.includes(module.id);
                
                return (
                  <div 
                    key={module.id}
                    className={cn(
                      "rounded-xl border border-border/50 overflow-hidden transition-all duration-200",
                      isExpanded && "bg-muted/30"
                    )}
                  >
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {module.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : module.isPlaying ? (
                          <PlayCircle className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Title */}
                      <span className="flex-1 text-left text-sm font-medium text-foreground">
                        {module.title}
                      </span>
                      
                      {/* Expand icon */}
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} 
                      />
                    </button>
                    
                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="pl-8 border-l-2 border-muted ml-3 py-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Краткая информация
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {module.description || "Описание отсутствует"}
                          </p>
                          
                          <div className="flex items-center gap-4">
                            {module.duration && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-background border rounded-md px-2 py-1 shadow-sm">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                {module.duration}
                              </div>
                            )}
                            {module.hasFireIcon && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-2 py-1">
                                <Flame className="w-3.5 h-3.5 fill-orange-500" />
                                Популярное
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Кнопка Показать все / Скрыть */}
      {sections.length > 3 && (
        <div className="mt-6 flex justify-center">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="px-6 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {showMore ? "свернуть" : "показать все"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseModules;
import { useState } from "react";
import { ChevronDown, CheckCircle2, PlayCircle, FileText, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  isCompleted?: boolean;
  isPlaying?: boolean;
  hasFireIcon?: boolean;
}

interface Section {
  id: string;
  title: string;
  modules: Module[];
}

interface CourseModulesProps {
  sections?: Section[];
}

const defaultSections: Section[] = [
  {
    id: "1",
    title: "1. Введение",
    modules: [
      { id: "1-1", title: "Введение в HTML и CSS", isCompleted: true },
      { id: "1-2", title: "Структура документа", isPlaying: true },
      { id: "1-3", title: "Задачи верстки и верстальщика" },
    ],
  },
  {
    id: "2",
    title: "2. Базовые понятия интернета",
    modules: [
      { 
        id: "2-1", 
        title: "IP - адрес, домен, DNS",
        description: "В этом блоке курса будут изучены основные понятия IP-адресов, доменных имен и системы DNS. Вы узнаете, как работает разрешение доменных имен и как настраивать DNS для эффективного управления сетевыми ресурсами.",
        duration: "41 : 40",
        hasFireIcon: true,
      },
      { id: "2-2", title: "HTTP, HTTP2 и HTTPS" },
      { id: "2-3", title: "Структура HTTP запросов и ответов" },
    ],
  },
];

const CourseModules = ({ sections = defaultSections }: CourseModulesProps) => {
  const [expandedModules, setExpandedModules] = useState<string[]>(["2-1"]);
  const [showMore, setShowMore] = useState(false);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <div className="card-elevated p-6">
      
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {section.title}
            </h3>
            
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
                    {isExpanded && module.description && (
                      <div className="px-4 pb-4 animate-fade-in">
                        <div className="pl-8">
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                            {module.description}
                          </p>
                          
                          <div className="flex items-center gap-4">
                            {module.duration && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {module.duration}
                              </div>
                            )}
                            {module.hasFireIcon && (
                              <Flame className="w-4 h-4 text-orange-400" />
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
      
      <div className="mt-6 flex justify-center">
        <button 
          onClick={() => setShowMore(!showMore)}
          className="px-6 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Показать больше
        </button>
      </div>
    </div>
  );
};

export default CourseModules;

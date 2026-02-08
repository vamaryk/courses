import { useState } from "react";
import { ChevronDown, BookOpen, FileCheck, Lightbulb } from "lucide-react";
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
  description?: string;
  modules: Module[];
  stats?: {
    lectures: number;
    tests: number;
    tasks: number;
  };
}

interface CourseModulesProps {
  sections?: Section[];
}

const defaultSections: Section[] = [
  {
    id: "1",
    title: "1. Введение",
    description: "В этой главе вы познакомитесь с основами веб-разработки и узнаете, что такое HTML и CSS.",
    stats: { lectures: 15, tests: 3, tasks: 10 },
    modules: [
      { id: "1-1", title: "Введение в HTML и CSS", isCompleted: true },
      { id: "1-2", title: "Структура документа", isPlaying: true },
      { id: "1-3", title: "Задачи верстки и верстальщика" },
    ],
  },
  {
    id: "2",
    title: "2. Базовые понятия интернета",
    description: "Изучите основные концепции интернета: протоколы, адресацию и передачу данных.",
    stats: { lectures: 8, tests: 2, tasks: 5 },
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
  {
    id: "3",
    title: "3. HTML основы",
    description: "Освойте основные теги HTML и научитесь создавать структуру веб-страниц.",
    stats: { lectures: 12, tests: 4, tasks: 8 },
    modules: [
      { id: "3-1", title: "Теги и атрибуты HTML" },
      { id: "3-2", title: "Семантические теги" },
      { id: "3-3", title: "Формы и поля ввода" },
    ],
  },
  {
    id: "4",
    title: "4. CSS основы",
    description: "Изучите базовые концепции CSS: селекторы, свойства и значения.",
    stats: { lectures: 10, tests: 3, tasks: 7 },
    modules: [
      { id: "4-1", title: "Селекторы и специфичность" },
      { id: "4-2", title: "Блочная модель" },
      { id: "4-3", title: "Цвета и шрифты" },
    ],
  },
  {
    id: "5",
    title: "5. Адаптивный дизайн",
    description: "Научитесь создавать сайты, которые хорошо выглядят на всех устройствах.",
    stats: { lectures: 9, tests: 2, tasks: 6 },
    modules: [
      { id: "5-1", title: "Медиа-запросы" },
      { id: "5-2", title: "Flexbox" },
      { id: "5-3", title: "Grid Layout" },
    ],
  },
];

const CourseModulesUser = ({ sections = defaultSections }: CourseModulesProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const visibleSections = showMore ? sections : sections.slice(0, 3);

  return (
    <div className="border rounded-lg p-4">
      <div className="space-y-2">
        {visibleSections.map((section) => {
          const isSectionExpanded = expandedSections.includes(section.id);
          
          return (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <h3 className="text-sm font-semibold text-foreground text-left">
                    {section.title}
                  </h3>
                </div>
                
                <ChevronDown 
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    isSectionExpanded && "rotate-180"
                  )} 
                />
              </button>
              
              {isSectionExpanded && (
                <div className="px-4 py-3 bg-background animate-fade-in border-t">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {section.description || "Краткая информация"}
                  </p>
                  
                  <div className="flex gap-4 mb-4">
                    <a 
                      href="#" 
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Лекций: {section.stats?.lectures || 0}</span>
                    </a>
                    <a 
                      href="#" 
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Тестов: {section.stats?.tests || 0}</span>
                    </a>
                    <a 
                      href="#" 
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Заданий: {section.stats?.tasks || 0}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
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

export default CourseModulesUser;
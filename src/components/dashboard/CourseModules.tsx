import { useState } from "react";
import { ChevronDown, PlayCircle, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
  description?: string;
  duration?: string;
  modules: Module[];
}

interface CourseModulesProps {
  sections?: Section[];
  onStartChapter?: (chapterId: number, subchapterId: number) => void;
  canViewSubitems?: boolean;
  /** Не показывать блок «Краткая информация о главе» внутри раскрытой главы (записан / доступ / автор) */
  hideChapterOverview?: boolean;
}

const defaultSections: Section[] = [
  {
    id: "1",
    title: "1. Введение",
    description: "Знакомство с основами веб-разработки и структурой первой главы.",
    duration: "25 мин",
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
    description: "Ключевые сетевые термины и базовые принципы работы интернета.",
    duration: "42 мин",
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
    description: "Базовые стили, селекторы и устройство визуального оформления.",
    modules: [
      { id: "3-1", title: "Селекторы и специфичность", description: "Как браузер понимает, какие стили применять к элементам." },
      { id: "3-2", title: "Блочная модель", description: "Margin, padding, border, content. Как элементы занимают место." },
    ],
  },
  {
    id: "4",
    title: "4. Продвинутая верстка",
    description: "Современные техники построения интерфейсов.",
    modules: [
      { id: "4-1", title: "Flexbox и Grid", description: "Современные методы расположения элементов на странице." },
    ],
  },
];

const CourseModules = ({
  sections = defaultSections,
  onStartChapter,
  canViewSubitems = true,
  hideChapterOverview = false,
}: CourseModulesProps) => {
  const [expandedModules, setExpandedModules] = useState<string[]>(["2-1"]);
  const [showMore, setShowMore] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(() =>
    canViewSubitems ? (sections[0]?.id ? [sections[0].id] : []) : []
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const visibleSections = showMore ? sections : sections.slice(0, 3);
  const isSectionOpen = (sectionId: string) => expandedSections.includes(sectionId);
  const toggleSection = (sectionId: string) => {
    if (!canViewSubitems) return;
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const renderSectionMeta = (section: Section) => {
    if (!section.description && !section.duration) return null;

    return (
      <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Краткая информация о главе
          </h4>
          {section.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {section.description}
            </p>
          ) : null}
          {section.duration ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-foreground bg-background border rounded-md px-2 py-1 shadow-sm w-fit">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {section.duration}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="border rounded-lg p-4 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 transition-colors",
                canViewSubitems ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
              )}
            >
              <h3 className="text-sm font-medium text-muted-foreground">{section.title}</h3>
              {canViewSubitems ? (
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    isSectionOpen(section.id) && "rotate-180"
                  )}
                />
              ) : null}
            </button>

            {canViewSubitems && (
              <div
                className={cn(
                  "overflow-hidden transition-[max-height] duration-300 ease-in-out",
                  isSectionOpen(section.id) ? "max-h-[2000px]" : "max-h-0"
                )}
              >
                <div className="pt-3 space-y-2">
                  {!hideChapterOverview ? renderSectionMeta(section) : null}
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
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleModule(module.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleModule(module.id)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          {section.chapterId && module.subchapterId && onStartChapter && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartChapter(section.chapterId!, module.subchapterId!);
                              }}
                              className="h-7 w-7 rounded-full bg-[#efe9ff] hover:bg-[#e1d5ff] text-[#8f6bf4] cursor-pointer inline-flex items-center justify-center shrink-0"
                              title="Пуск"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          <span className="flex-1 text-left text-sm font-medium text-foreground">
                            {module.title}
                          </span>

                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>

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
            )}

            {!canViewSubitems && (
              <div className="pt-3">
                {renderSectionMeta(section)}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Кнопка Показать все / Скрыть */}
      {sections.length > 3 && (
        <div className="mt-6 flex justify-center">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="px-6 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {showMore ? "свернуть" : "показать все"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseModules;
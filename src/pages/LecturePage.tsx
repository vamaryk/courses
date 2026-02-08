import { useState } from 'react';
import { ChevronLeft, Clock, Video, Menu, X, ChevronRight } from "lucide-react";

// название курса, лекции, время на изучение лекции, есть ли в ней видео,
// если видео есть, то на него будет ссылка в шапке, оно само находится под тестом лекции, но это не реализовано в данный момент
interface HeaderProps {
  courseTitle?: string;
  lectureTitle?: string;
  duration?: string;
  hasVideo?: boolean;
  videoUrl?: string;
}

// Интерфейс для элемента содержания
interface TocItem {
  id: string;
  title: string;
}

const LecturePage = ({
  courseTitle = "Основы HTML и CSS",
  lectureTitle = "1.1 Введение в веб-разработку",
  duration = "28:40",
  hasVideo = true,
  videoUrl = "#",
}: HeaderProps) => {
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Данные для содержания
  const tocItems: TocItem[] = [
  ];

  const handleTocLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href && href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const menuHeight = 64;
        
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - menuHeight;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
    setIsTocOpen(false);
  };

  // Компонент для рендеринга элементов содержания
  const renderTocItems = () => (
    <ul className="space-y-2">
      {tocItems.map((item) => (
        <li key={item.id}>
          <a 
            href={`#${item.id}`} 
            className="block text-purple-700 hover:text-purple-900 hover:underline py-2 transition-colors"
            onClick={handleTocLinkClick}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-[20px]">
        {/* Шапка */}
        <div 
          className="w-full px-6 py-4 md:px-4 md:py-5 rounded-xl mb-1 md:mb-2"
          style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}
        >
          {/* ссылка на страницу данного курса */}
          <div 
            className="flex items-center gap-1 text-darkgrey hover:text-purple-600 transition-colors text-2sm mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            {courseTitle}
          </div>

          {/* название лекции */}
          <h1 className="text-xl md:text-2xl font-Xolonium font-bold text-darkgrey mb-2">
            {lectureTitle}
          </h1>

          {/* время, видео, навигация */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4 text-darkgrey">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-2sm">{duration}</span>
              </div>
              
              {hasVideo && (
                <a 
                  href={videoUrl} 
                  className="flex items-center text-2sm hover:text-purple-600 transition-colors"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Смотреть видеолекцию
                </a>
              )}
            </div>

            <button 
              onClick={() => setIsTocOpen(!isTocOpen)}
              className="flex items-center gap-2 py-2 text-2sm text-darkgrey hover:text-purple-600"
              aria-expanded={isTocOpen}
              aria-controls="lecture-toc"
            >
              {isTocOpen ? (
                <>
                  <X className="w-4 h-4" />
                  <span className="sm:inline">Закрыть навигацию</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4" />
                  <span>Навигация по курсу</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Навигация на Desktop */}
        {isTocOpen && (
          <div className="hidden md:block fixed right-[20px] top-[120px] w-72 bg-white rounded-lg shadow-lg p-5 z-50 border border-gray-200 max-h-[calc(100vh-140px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-darkgrey">Навигация</h2>
              <button 
                onClick={() => setIsTocOpen(false)} 
                className="text-darkgrey hover:text-purple-600 transition-colors"
                aria-label="Закрыть навигацию"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav id="lecture-toc">
              {renderTocItems()}
            </nav>
          </div>
        )}

        {/* Навигация на Mobile */}
        {isTocOpen && (
          <div className="md:hidden bg-white border border-gray-200 rounded-lg mx-4 mb-2 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-darkgrey">Навигация</h2>
            </div>
            <nav>
              {renderTocItems()}
            </nav>
          </div>
        )}

        <main className="px-4 md:px-10 py-2 md:py-4 md:text-justify w-full">
          текст лекции
        </main>

        {/* Кнопка "Далее" */}
        <div className="flex justify-end mt-8 mb-12 px-4 md:px-10">
          <button 
            onClick={() => {
                // Здесь будет логика перехода
                console.log("Переход к следующей лекции");
            }}
            className="group flex items-center gap-2 px-6 py-3 bg-purple text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
            Далее
            <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturePage;
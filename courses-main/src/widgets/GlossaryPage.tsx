import { useState } from 'react';
import { Calendar as CalendarIcon, Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export default function GlossaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<Set<number>>(new Set());

  const glossaryTerms = [
    {
      id: 1,
      term: 'API',
      definition: 'Application Programming Interface - интерфейс прикладного программирования. Набор правил и протоколов, позволяющих разным программам взаимодействовать друг с другом.',
      category: 'Технические термины'
    },
    {
      id: 2,
      term: 'React',
      definition: 'JavaScript-библиотека для создания пользовательских интерфейсов, разработанная Facebook. Позволяет строить веб-приложения с использованием компонентного подхода.',
      category: 'Фреймворки'
    },
    {
      id: 3,
      term: 'Алгоритм',
      definition: 'Последовательность действий или правил для решения задачи. В программировании алгоритмы используются для обработки данных и выполнения вычислений.',
      category: 'Основные понятия'
    },
    {
      id: 4,
      term: 'База данных',
      definition: 'Организованная коллекция данных, хранящаяся в электронном виде. Позволяет эффективно хранить, извлекать и управлять большими объемами информации.',
      category: 'Хранение данных'
    },
    {
      id: 5,
      term: 'CSS',
      definition: 'Cascading Style Sheets - каскадные таблицы стилей. Язык описания внешнего вида документа, написанного с использованием языка разметки HTML.',
      category: 'Веб-технологии'
    },
    {
      id: 6,
      term: 'Git',
      definition: 'Распределенная система управления версиями файлов. Позволяет отслеживать изменения в коде, работать в команде и управлять различными версиями проекта.',
      category: 'Инструменты разработки'
    }
  ];

  const filteredTerms = glossaryTerms.filter(term =>
    term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTerms(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header аналогично календарю */}
      <header className="h-16 flex items-center justify-between px-[40px] z-[10] bg-gray-50/90 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold font-xolonium">LOGO</div>
        </div>
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <div className="w-8 h-8 bg-gray-200 rounded-full p-1"></div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 min-w-0 md:ml-[120px] px-[20px] md:px-0 mb-[20px]">
          <div className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
              <div className="rounded-xl shadow p-6" style={{ background: 'radial-gradient(circle, #F7C8FF, #D8E6FF)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center">
                    <button className="flex items-center text-gray-600 text-[12px] font-montserrat hover:text-gray-900 mr-4">
                      ← Глоссарий
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <h1 className="text-[24px] font-xolonium">Глоссарий</h1>
                  <BookOpen className="w-5 h-5 text-gray-500" />
                </div>

                <div className="bg-white/70 rounded-lg p-6 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Поиск по терминам..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredTerms.map((term) => {
                    const isExpanded = expandedTerms.has(term.id);
                    return (
                      <div key={term.id} className="bg-white/70 rounded-lg overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
                          onClick={() => toggleExpanded(term.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{term.term}</h3>
                              <span className="px-2 py-1 bg-[#B291FF]/20 text-[#B291FF] rounded-full text-xs">
                                {term.category}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-200">
                            <p className="text-gray-700 mt-3 leading-relaxed">
                              {term.definition}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredTerms.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">По вашему запросу ничего не найдено</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

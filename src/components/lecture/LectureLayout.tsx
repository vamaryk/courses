import { BookOpen, Video, Menu } from 'lucide-react';
import type { ReactNode } from 'react';

interface LectureLayoutProps {
  breadcrumb: string;
  title: string;
  meta: string;
  onToggleOutline: () => void;
  children: ReactNode;
  blockType?: 'theory' | 'task' | 'test' | 'code_task';
}

const GRADIENT_MAP: Record<'theory' | 'task' | 'test' | 'code_task', string> = {
  theory: 'radial-gradient(circle, var(--color-pink), var(--color-blue))',
  task: 'radial-gradient(circle, #cdbbfd, var(--color-blue))',
  test: 'radial-gradient(circle, var(--color-blue), #fed4ff)',
  code_task: 'radial-gradient(circle, #cdbbfd, #fed4ff)',
};

const BLOCK_TYPE_LABELS: Record<'theory' | 'task' | 'test' | 'code_task', string> = {
  theory: 'Лекция',
  task: 'Задание',
  test: 'Тест',
  code_task: 'Код',
};

export default function LectureLayout({ 
  breadcrumb, 
  title, 
  meta, 
  onToggleOutline, 
  children,
  blockType = 'theory'
}: LectureLayoutProps) {
  const gradientStyle = GRADIENT_MAP[blockType];
  const blockTypeLabel = BLOCK_TYPE_LABELS[blockType];

  return (
    <div className="min-h-screen bg-[#f3f3f6]">
      <main className="px-4 sm:px-6 lg:px-[20px]">
        <div className="w-full max-w-[1400px] mx-auto">
          <div 
            className="w-full py-4 px-4 md:py-5 rounded-xl mb-1 md:mb-2 transition-all duration-300"
            style={{ background: gradientStyle }}
          >
            <div className="mb-2 text-[15px] text-[#3c3d50]">{breadcrumb}</div>
            
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-xl md:text-2xl font-bold font-Xolonium leading-tight text-[#222431]">
                {title}
              </h1>
              <span className='inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold bg-[#efe9ff] text-[#5f43bb] border-2 border-purple'>
                {blockTypeLabel}
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-[15px] text-[#3c3d50]">
                <span className="mr-4 inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {meta}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Video className="h-4 w-4" />
                  Смотреть видеолекцию
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleOutline}
                className="inline-flex items-center gap-1.5 text-sm text-[#4f4f62] transition hover:text-[#2f2f3f] cursor-pointer"
              >
                <Menu className="h-4 w-4" />
                Содержание
              </button>
            </div>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  );
}
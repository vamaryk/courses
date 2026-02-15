import { BookOpen, Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import Header from '@/widgets/navigation/Header/Header';
import MenuSidebar from '@/widgets/navigation/MenuSidebar/MenuSidebar';

interface LectureLayoutProps {
  breadcrumb: string;
  title: string;
  meta: string;
  onToggleOutline: () => void;
  children: ReactNode;
}

export default function LectureLayout({ breadcrumb, title, meta, onToggleOutline, children }: LectureLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f3f3f6]">
      <Header />
      <MenuSidebar />
      <main className="mt-[4em] lg:ml-[100px] md:ml-[100px] sm:ml-0 px-4 sm:px-6 lg:px-6 py-5">
        <div className="mx-auto max-w-[1080px]">
          <div className="rounded-2xl bg-gradient-to-r from-[#d5ddff] to-[#e6c7ff] px-4 py-5 md:px-5">
            <div className="mb-2 text-[15px] text-[#3c3d50]">{breadcrumb}</div>
            <h1 className="mb-2 text-[34px] font-semibold leading-tight text-[#1f2030]">{title}</h1>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] text-[#3c3d50]">
                <span className="mr-4 inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {meta}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  Смотреть видеолекцию
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleOutline}
                className="inline-flex items-center gap-1.5 text-sm text-[#4f4f62] transition hover:text-[#2f2f3f]"
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

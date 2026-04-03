import { X } from 'lucide-react';
import type { Chapter } from '@/shared/api/courses';

interface LectureOutlineProps {
  isOpen: boolean;
  chapters: Chapter[];
  currentChapterId: number;
  currentSubchapterId: number;
  onClose: () => void;
  onSelect: (chapterId: number, subchapterId: number) => void;
}

export default function LectureOutline({
  isOpen,
  chapters,
  currentChapterId,
  currentSubchapterId,
  onClose,
  onSelect,
}: LectureOutlineProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-grey/25 z-[101]" onClick={onClose}>
      <div
        className="absolute right-5 top-16 w-[min(420px,calc(100vw-2.5rem))] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-[#e6e7f0] bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#2f2f3f]">Содержание курса</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-[#f1f1f5] cursor-pointer" type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {chapters.map((chapter) => (
            <div key={chapter.id}>
              <button
                type="button"
                disabled={!chapter.subchapters?.length}
                onClick={() => {
                  const firstSubchapterId = chapter.subchapters?.[0]?.id;
                  if (firstSubchapterId) {
                    onSelect(chapter.id, firstSubchapterId);
                  }
                }}
                className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  chapter.id === currentChapterId
                    ? 'bg-[#e7dcff] text-[#5138a6]'
                    : 'bg-[#f6f6fa] text-[#3b3b4c] hover:bg-[#ececf6]'
                }`}
              >
                {chapter.title}
              </button>
              <div className="space-y-1">
                {(chapter.subchapters || []).map((subchapter) => {
                  const isCurrent = chapter.id === currentChapterId && subchapter.id === currentSubchapterId;
                  return (
                    <button
                      key={subchapter.id}
                      type="button"
                      onClick={() => onSelect(chapter.id, subchapter.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        isCurrent
                          ? 'bg-[#ede7ff] text-[#5d3fba]'
                          : 'bg-white text-[#4b4b5a] hover:bg-[#f6f6fa]'
                      }`}
                    >
                      {subchapter.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CourseContentProps {
  courseId: number;
  chapters: Array<{
    id: number;
    title: string;
    order: number;
    subchapters?: Array<{
      id: number;
      title: string;
      order: number;
      content_blocks?: Array<{
        id: number;
        type: 'theory' | 'task' | 'test';
        content: string;
        answer?: string | null;
        order: number;
      }>;
    }>;
  }>;
}

type QuizSelectionType = 'single' | 'multiple';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizAnswerPayload {
  format: 'quiz_v1';
  selectionType: QuizSelectionType;
  options: QuizOption[];
}

const parseQuizPayload = (rawAnswer?: string | null): QuizAnswerPayload | null => {
  if (!rawAnswer) return null;
  try {
    const parsed = JSON.parse(rawAnswer) as Partial<QuizAnswerPayload>;
    if (
      parsed?.format === 'quiz_v1' &&
      (parsed.selectionType === 'single' || parsed.selectionType === 'multiple') &&
      Array.isArray(parsed.options)
    ) {
      return {
        format: 'quiz_v1',
        selectionType: parsed.selectionType,
        options: parsed.options.map((option, index) => ({
          id: option.id || `opt-${index + 1}`,
          text: option.text || '',
          isCorrect: Boolean(option.isCorrect),
        })),
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const CourseContent = ({ courseId, chapters }: CourseContentProps) => {
  const navigate = useNavigate();
  const { chapterId, subchapterId } = useParams<{
    chapterId?: string;
    subchapterId?: string;
  }>();

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentSubchapterIndex, setCurrentSubchapterIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedTests, setCheckedTests] = useState<Record<number, boolean>>({});
  const [selectedTestOptions, setSelectedTestOptions] = useState<Record<number, string[]>>({});

  const sortedChapters = useMemo(
    () =>
      [...chapters]
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
          ...chapter,
          subchapters: [...(chapter.subchapters || [])]
            .sort((a, b) => a.order - b.order)
            .map((subchapter) => ({
              ...subchapter,
              content_blocks: [...(subchapter.content_blocks || [])].sort((a, b) => a.order - b.order),
            })),
        })),
    [chapters]
  );

  // Initialize current chapter and subchapter based on URL params
  useEffect(() => {
    if (!sortedChapters.length) {
      setIsLoading(false);
      return;
    }

    let chapterIdx = 0;
    let subchapterIdx = 0;

    if (chapterId) {
      const foundChapterIdx = sortedChapters.findIndex(c => c.id === parseInt(chapterId));
      if (foundChapterIdx >= 0) {
        chapterIdx = foundChapterIdx;
      }
    }

    const currentChapter = sortedChapters[chapterIdx];
    if (currentChapter?.subchapters?.length > 0) {
      if (subchapterId) {
        const foundSubchapterIdx = currentChapter.subchapters.findIndex(
          s => s.id === parseInt(subchapterId)
        );
        if (foundSubchapterIdx >= 0) {
          subchapterIdx = foundSubchapterIdx;
        }
      }
    }

    setCurrentChapterIndex(chapterIdx);
    setCurrentSubchapterIndex(subchapterIdx);
    setIsLoading(false);
  }, [chapterId, subchapterId, sortedChapters]);

  // Track progress
  const currentChapter = sortedChapters[currentChapterIndex];
  const currentSubchapter = currentChapter?.subchapters?.[currentSubchapterIndex];
  const currentContent = currentSubchapter?.content_blocks?.[0];

  const { markAsCompleted } = useCourseProgress({
    courseId,
    chapterId: currentChapter?.id,
    subchapterId: currentSubchapter?.id,
    contentBlockId: currentContent?.id,
    onProgressUpdate: (newProgress) => setProgress(newProgress),
    onCourseComplete: () => {
      // Handle course completion (e.g., show certificate, update user profile)
      console.log('Course completed!');
    },
  });

  // Navigation functions
  const goToNext = async () => {
    if (!currentChapter || !currentSubchapter) return;

    // Mark current content as completed
    await markAsCompleted();

    // Check if there's a next subchapter
    if (currentSubchapterIndex < (currentChapter.subchapters?.length || 0) - 1) {
      // Go to next subchapter in the same chapter
      const nextSubchapter = currentChapter.subchapters?.[currentSubchapterIndex + 1];
      if (!nextSubchapter) return;
      navigate(`/courses/${courseId}/learn/${currentChapter.id}/${nextSubchapter.id}`);
    } else if (currentChapterIndex < sortedChapters.length - 1) {
      // Go to first subchapter of next chapter
      const nextChapter = sortedChapters[currentChapterIndex + 1];
      if ((nextChapter.subchapters?.length || 0) > 0) {
        const firstSubchapterId = nextChapter.subchapters?.[0]?.id;
        if (!firstSubchapterId) return;
        navigate(`/courses/${courseId}/learn/${nextChapter.id}/${firstSubchapterId}`);
      }
    } else {
      // Course completed
      navigate(`/courses/${courseId}`);
    }
  };

  const goToPrevious = () => {
    if (!currentChapter || !currentSubchapter) return;

    if (currentSubchapterIndex > 0) {
      // Go to previous subchapter in the same chapter
      const prevSubchapter = currentChapter.subchapters?.[currentSubchapterIndex - 1];
      if (!prevSubchapter) return;
      navigate(`/courses/${courseId}/learn/${currentChapter.id}/${prevSubchapter.id}`);
    } else if (currentChapterIndex > 0) {
      // Go to last subchapter of previous chapter
      const prevChapter = sortedChapters[currentChapterIndex - 1];
      if ((prevChapter.subchapters?.length || 0) > 0) {
        const lastSubchapterIndex = (prevChapter.subchapters?.length || 1) - 1;
        const targetSubchapterId = prevChapter.subchapters?.[lastSubchapterIndex]?.id;
        if (!targetSubchapterId) return;
        navigate(`/courses/${courseId}/learn/${prevChapter.id}/${targetSubchapterId}`);
      }
    }
  };

  // Calculate progress percentage
  const calculateChapterProgress = (chapter: typeof currentChapter) => {
    if (!chapter?.subchapters?.length) return 0;
    
    const totalSubchapters = chapter.subchapters.length;
    const completedSubchapters = chapter.subchapters.filter(
      sub => sub.content_blocks?.some(block => block.id) // Simplified: assuming if content exists, it's completed
    ).length;
    
    return Math.round((completedSubchapters / totalSubchapters) * 100);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentChapter || !currentSubchapter) {
    return <div>Content not found</div>;
  }

  const handleTestOptionChange = (
    blockId: number,
    optionId: string,
    selectionType: QuizSelectionType,
    checked: boolean
  ) => {
    setSelectedTestOptions((prev) => {
      const existing = prev[blockId] || [];
      if (selectionType === 'single') {
        return { ...prev, [blockId]: checked ? [optionId] : [] };
      }
      if (checked) {
        return { ...prev, [blockId]: [...existing, optionId] };
      }
      return { ...prev, [blockId]: existing.filter((id) => id !== optionId) };
    });
    setCheckedTests((prev) => ({ ...prev, [blockId]: false }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Прогресс курса</span>
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto p-4">
          <h3 className="font-semibold mb-4">Содержание курса</h3>
          <div className="space-y-2">
            {sortedChapters.map((chapter) => (
              <div key={chapter.id} className="mb-2">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    chapter.id === currentChapter.id ? 'text-purple-600' : 'text-gray-800'
                  }`}>
                    {chapter.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {calculateChapterProgress(chapter)}%
                  </span>
                </div>
                
                <div className="ml-3 mt-1 space-y-1">
                  {(chapter.subchapters || []).map((subchapter) => (
                    <div
                      key={subchapter.id}
                      className={`flex items-center py-1 px-2 rounded ${
                        subchapter.id === currentSubchapter.id
                          ? 'bg-purple-50 text-purple-700'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => 
                        navigate(`/courses/${courseId}/learn/${chapter.id}/${subchapter.id}`)
                      }
                    >
                      <div className="w-4 h-4 mr-2 flex-shrink-0">
                        {subchapter.content_blocks?.some(block => block.id) ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                      <span className="text-sm truncate">{subchapter.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold mb-4">{currentChapter.title}</h2>
          <h3 className="text-xl font-semibold mb-6 text-gray-800">{currentSubchapter.title}</h3>
          
          {/* Content area */}
          <div className="space-y-4 mb-8">
            {(currentSubchapter.content_blocks?.length || 0) === 0 && (
              <div className="text-sm text-muted-foreground">В этой лекции пока нет контента.</div>
            )}
            {(currentSubchapter.content_blocks || []).map((block) => {
              const quizPayload = block.type === 'test' ? parseQuizPayload(block.answer) : null;
              const selected = selectedTestOptions[block.id] || [];
              const checked = checkedTests[block.id];

              return (
                <div key={block.id} className="border rounded-lg p-4">
                  <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">
                    {block.type === 'theory' ? 'Теория' : block.type === 'task' ? 'Задание' : 'Тест'}
                  </div>

                  {block.type !== 'test' && block.content && (
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: block.content }}
                    />
                  )}

                  {block.type === 'task' && block.answer && (
                    <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                      <div className="font-medium mb-1">Ответ / ориентир:</div>
                      <div>{block.answer}</div>
                    </div>
                  )}

                  {block.type === 'test' && (
                    <div className="space-y-3">
                      {quizPayload?.options?.length ? (
                        <>
                          <div className="text-sm text-muted-foreground">
                            {quizPayload.selectionType === 'single'
                              ? 'Выберите один правильный ответ'
                              : 'Выберите один или несколько вариантов'}
                          </div>
                          {quizPayload.options.map((option) => {
                            const isSelected = selected.includes(option.id);
                            const showCorrectness = checked;
                            const isCorrect = option.isCorrect;
                            return (
                              <label
                                key={option.id}
                                className={cn(
                                  'flex items-start gap-3 rounded-md border p-3 cursor-pointer',
                                  showCorrectness && isCorrect && 'border-green-500 bg-green-50',
                                  showCorrectness && isSelected && !isCorrect && 'border-red-500 bg-red-50'
                                )}
                              >
                                <input
                                  type={quizPayload.selectionType === 'single' ? 'radio' : 'checkbox'}
                                  name={`test-${block.id}`}
                                  checked={isSelected}
                                  onChange={(event) =>
                                    handleTestOptionChange(
                                      block.id,
                                      option.id,
                                      quizPayload.selectionType,
                                      event.target.checked
                                    )
                                  }
                                />
                                <span className="text-sm">{option.text || 'Без текста варианта'}</span>
                              </label>
                            );
                          })}
                          <Button size="sm" variant="outline" onClick={() => setCheckedTests((prev) => ({ ...prev, [block.id]: true }))}>
                            Проверить
                          </Button>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Данные теста не заполнены.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentChapterIndex === 0 && currentSubchapterIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            
            <Button onClick={goToNext}>
              {currentChapterIndex === sortedChapters.length - 1 &&
              currentSubchapterIndex === (currentChapter.subchapters?.length - 1 || 0)
                ? 'Завершить курс'
                : 'Далее'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

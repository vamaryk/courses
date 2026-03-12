import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi, type Subchapter, type ContentBlock, type Course } from '@/shared/api/courses';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/RichTextEditor';
import { ChevronLeft, Plus, Trash2, Save, List, X, Check, BookOpen, HelpCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type CodeTaskConfig,
  createDefaultCodeTaskConfig,
  parseCodeTaskConfig,
  serializeCodeTaskConfig,
} from '@/shared/codeTasks';

type QuizSelectionType = 'single' | 'multiple';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  selectionType: QuizSelectionType;
  options: QuizOption[];
}

interface QuizAnswerPayload {
  format: 'quiz_v1';
  questions: QuizQuestion[];
}

const createDefaultQuizPayload = (legacyAnswer?: string | null): QuizAnswerPayload => ({
  format: 'quiz_v1',
  questions: [
    {
      id: crypto.randomUUID(),
      question: '',
      selectionType: 'single',
      options: [
        { id: 'opt-1', text: legacyAnswer || '', isCorrect: true },
        { id: 'opt-2', text: '', isCorrect: false },
      ],
    },
  ],
});

const parseQuizPayload = (answer?: string | null): QuizAnswerPayload | null => {
  if (!answer) return null;
  try {
    const parsed = JSON.parse(answer) as any;
    
    // Новый формат: с массивом questions
    if (
      parsed?.format === 'quiz_v1' &&
      Array.isArray(parsed.questions) &&
      parsed.questions.length > 0
    ) {
      return {
        format: 'quiz_v1',
        questions: parsed.questions.map((q: any, qIndex: number) => ({
          id: q.id || `q-${qIndex + 1}`,
          question: q.question || '',
          selectionType: q.selectionType === 'multiple' ? 'multiple' : 'single',
          options: Array.isArray(q.options)
            ? q.options.map((opt: any, oIndex: number) => ({
                id: opt.id || `opt-${oIndex + 1}`,
                text: opt.text || '',
                isCorrect: Boolean(opt.isCorrect),
              }))
            : [
                { id: 'opt-1', text: '', isCorrect: true },
                { id: 'opt-2', text: '', isCorrect: false },
              ],
        })),
      };
    }
    
    // Старый формат: обратная совместимость
    if (
      parsed?.format === 'quiz_v1' &&
      (parsed.selectionType === 'single' || parsed.selectionType === 'multiple') &&
      Array.isArray(parsed.options)
    ) {
      return {
        format: 'quiz_v1',
        questions: [
          {
            id: 'q-1',
            question: '',
            selectionType: parsed.selectionType,
            options: parsed.options.map((opt: any, index: number) => ({
              id: opt.id || `opt-${index + 1}`,
              text: opt.text || '',
              isCorrect: Boolean(opt.isCorrect),
            })),
          },
        ],
      };
    }
    
    return null;
  } catch {
    return null;
  }
};

const serializeQuizPayload = (payload: QuizAnswerPayload): string => JSON.stringify(payload);

function SubchapterEditPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const navigate = useNavigate();
  
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>('Глава');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubchapterId, setSelectedSubchapterId] = useState<number | null>(null);
  const [dirtySubchapters, setDirtySubchapters] = useState<Set<number>>(new Set());
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<number>>(new Set());
  const [contentBlocksMap, setContentBlocksMap] = useState<Map<number, ContentBlock[]>>(new Map());
  const [quizPayloads, setQuizPayloads] = useState<Map<number, QuizAnswerPayload>>(new Map());
  
  const [isMobileSubchaptersOpen, setIsMobileSubchaptersOpen] = useState(false);

  const fetchSubchapters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await coursesApi.getSubchapters(parseInt(chapterId!, 10));
      setSubchapters(data);
      setSelectedSubchapterId((prev) => prev ?? (data[0]?.id || null));
      
      const contentMap = new Map<number, ContentBlock[]>();
      for (const subchapter of data) {
        if (subchapter.content_blocks) {
          contentMap.set(subchapter.id, subchapter.content_blocks);
        } else {
          contentMap.set(subchapter.id, []);
        }
      }
      setContentBlocksMap(contentMap);
    } catch (err: unknown) {
      console.error('Error fetching subchapters:', err);
      const errorMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка при загрузке подглав'
          : 'Ошибка при загрузке подглав';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (chapterId) {
      fetchSubchapters();
    }
  }, [chapterId, fetchSubchapters]);

  useEffect(() => {
    const fetchChapterMeta = async () => {
      if (!courseId || !chapterId) return;
      try {
        const course: Course = await coursesApi.getCourse(parseInt(courseId, 10));
        const foundChapter = course.chapters?.find((ch) => ch.id === parseInt(chapterId, 10));
        if (foundChapter?.title) {
          setChapterTitle(foundChapter.title);
        }
      } catch {
        // Non-blocking
      }
    };
    fetchChapterMeta();
  }, [courseId, chapterId]);

  const handleAddSubchapter = async () => {
    try {
      const newSubchapter = await coursesApi.createSubchapter(parseInt(chapterId!, 10), {
        title: `Новая подглава ${subchapters.length + 1}`,
        order: subchapters.length + 1,
      });
      setSubchapters([...subchapters, newSubchapter]);
      setSelectedSubchapterId(newSubchapter.id);
      setContentBlocksMap(prev => {
        const newMap = new Map(prev);
        newMap.set(newSubchapter.id, []);
        return newMap;
      });
      toast.success('Подглава добавлена');
    } catch (err) {
      console.error('Error creating subchapter:', err);
      toast.error('Ошибка при создании подглавы');
    }
  };

  const handleSubchapterFieldChange = (
    subchapterId: number,
    patch: Partial<Pick<Subchapter, 'title' | 'order'>>
  ) => {
    setSubchapters((prev) => prev.map((s) => (s.id === subchapterId ? { ...s, ...patch } : s)));
    setDirtySubchapters((prev) => new Set(prev).add(subchapterId));
  };

  const handleSaveSubchapter = async (subchapterId: number) => {
    const subchapter = subchapters.find((s) => s.id === subchapterId);
    if (!subchapter) return;

    try {
      await coursesApi.updateSubchapter(subchapterId, {
        title: subchapter.title,
        order: subchapter.order,
      });
      setDirtySubchapters((prev) => {
        const next = new Set(prev);
        next.delete(subchapterId);
        return next;
      });
      toast.success('Подглава сохранена');
    } catch (err) {
      console.error('Error updating subchapter:', err);
      toast.error('Ошибка при обновлении подглавы');
    }
  };

  const handleDeleteSubchapter = async (subchapterId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту подглаву?')) return;
    try {
      await coursesApi.deleteSubchapter(subchapterId);
      const nextSubchapters = subchapters.filter((s) => s.id !== subchapterId);
      setSubchapters(nextSubchapters);
      if (selectedSubchapterId === subchapterId) {
        setSelectedSubchapterId(nextSubchapters[0]?.id || null);
      }
      setContentBlocksMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(subchapterId);
        return newMap;
      });
      toast.success('Подглава удалена');
    } catch (err) {
      console.error('Error deleting subchapter:', err);
      toast.error('Ошибка при удалении подглавы');
    }
  };

  const handleAddContentBlock = async (subchapterId: number) => {
    try {
      const currentBlocks = contentBlocksMap.get(subchapterId) || [];
      const nextOrder =
        currentBlocks.length > 0
          ? Math.max(...currentBlocks.map((block) => Number(block.order) || 0)) + 1
          : 1;
      const newBlock = await coursesApi.createContentBlock(subchapterId, {
        type: 'theory',
        content: '',
        answer: '',
        order: nextOrder,
      });
      
      setContentBlocksMap(prev => {
        const newMap = new Map(prev);
        newMap.set(subchapterId, [...currentBlocks, newBlock]);
        return newMap;
      });
      toast.success('Блок контента добавлен');
    } catch (err) {
      console.error('Error creating content block:', err);
      toast.error('Ошибка при создании блока контента');
    }
  };

  const handleContentBlockFieldChange = (
    blockId: number,
    subchapterId: number,
    updates: Partial<ContentBlock>
  ) => {
    setContentBlocksMap((prev) => {
      const next = new Map(prev);
      const blocks = next.get(subchapterId) || [];
      next.set(
        subchapterId,
        blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
      );
      return next;
    });
    setDirtyBlocks((prev) => new Set(prev).add(blockId));
  };

  const getQuizPayloadForBlock = (block: ContentBlock): QuizAnswerPayload => {
    const cached = quizPayloads.get(block.id);
    if (cached) return cached;
    const parsed = parseQuizPayload(block.answer);
    return parsed || createDefaultQuizPayload(block.answer);
  };

  const updateQuizPayload = (
    blockId: number,
    subchapterId: number,
    updater: (prev: QuizAnswerPayload) => QuizAnswerPayload
  ) => {
    const currentBlock = contentBlocksMap.get(subchapterId)?.find((b) => b.id === blockId);
    if (!currentBlock) return;
    const currentPayload = getQuizPayloadForBlock(currentBlock);
    const nextPayload = updater(currentPayload);

    setQuizPayloads((prev) => {
      const next = new Map(prev);
      next.set(blockId, nextPayload);
      return next;
    });

    handleContentBlockFieldChange(blockId, subchapterId, {
      answer: serializeQuizPayload(nextPayload),
    });
  };

  const getCodeTaskConfigForBlock = (block: ContentBlock): CodeTaskConfig => {
    const parsed = parseCodeTaskConfig(block.answer);
    return parsed || createDefaultCodeTaskConfig();
  };

  const updateCodeTaskConfig = (
    blockId: number,
    subchapterId: number,
    updater: (prev: CodeTaskConfig) => CodeTaskConfig,
  ) => {
    const currentBlock = contentBlocksMap.get(subchapterId)?.find((b) => b.id === blockId);
    if (!currentBlock) return;
    const currentConfig = getCodeTaskConfigForBlock(currentBlock);
    const nextConfig = updater(currentConfig);

    handleContentBlockFieldChange(blockId, subchapterId, {
      answer: serializeCodeTaskConfig(nextConfig),
    });
  };

  const handleSaveContentBlock = async (blockId: number, subchapterId: number) => {
    try {
      const currentBlock = contentBlocksMap.get(subchapterId)?.find((b) => b.id === blockId);
      if (!currentBlock) return;

      if (currentBlock.type === 'test') {
        const payload = parseQuizPayload(currentBlock.answer) || quizPayloads.get(blockId);
        if (!payload) {
          toast.error('Добавьте вопросы для теста');
          return;
        }
        for (const q of payload.questions) {
          const nonEmptyOptions = q.options.filter((opt) => opt.text.trim().length > 0);
          if (nonEmptyOptions.length < 2) {
            toast.error('Для каждого вопроса нужно минимум 2 заполненных варианта');
            return;
          }
          if (!nonEmptyOptions.some((opt) => opt.isCorrect)) {
            toast.error('Отметьте хотя бы один правильный ответ для каждого вопроса');
            return;
          }
        }
      }
      if (currentBlock.type === 'code_task') {
        const config = parseCodeTaskConfig(currentBlock.answer);
        if (!config) {
          toast.error('Настройте параметры проверяемой задачи');
          return;
        }
        if (!config.testCases.length) {
          toast.error('Добавьте хотя бы один тест-кейс для проверяемой задачи');
          return;
        }
        const invalidCase = config.testCases.find(
          (tc) =>
            !tc.input.trim() ||
            !tc.expectedOutputs.some((out) => out.trim().length > 0),
        );
        if (invalidCase) {
          toast.error('Каждый тест-кейс должен содержать input и хотя бы один ожидаемый вывод');
          return;
        }
      }
      if (currentBlock.type === 'task') {
        if (!currentBlock.answer || !currentBlock.answer.trim()) {
          toast.error('Введите правильный ответ для задания');
          return;
        }
      }

      await coursesApi.updateContentBlock(blockId, {
        type: currentBlock.type,
        content: currentBlock.content,
        answer: currentBlock.answer,
        order: currentBlock.order,
      });

      setDirtyBlocks((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
      toast.success('Блок сохранен');
    } catch (err) {
      console.error('Error updating content block:', err);
      toast.error('Ошибка при обновлении блока контента');
    }
  };

  const handleDeleteContentBlock = async (blockId: number, subchapterId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот блок контента?')) return;
    try {
      await coursesApi.deleteContentBlock(blockId);
      setContentBlocksMap(prev => {
        const newMap = new Map(prev);
        const blocks = newMap.get(subchapterId) || [];
        newMap.set(subchapterId, blocks.filter(b => b.id !== blockId));
        return newMap;
      });
      toast.success('Блок контента удален');
    } catch (err) {
      console.error('Error deleting content block:', err);
      toast.error('Ошибка при удалении блока контента');
    }
  };

  const selectedSubchapter = subchapters.find((s) => s.id === selectedSubchapterId) || null;
  const selectedContentBlocks = selectedSubchapterId
    ? contentBlocksMap.get(selectedSubchapterId) || []
    : [];

  // Reusable subchapters list
  const SubchaptersList = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-wrap gap-2 ${isMobile ? '' : ''}`}>
      {subchapters.length === 0 ? (
        <div className="text-sm text-muted-foreground w-full">
          Нет подглав. Добавьте первую подглаву.
        </div>
      ) : (
        subchapters.map((subchapter, index) => {
          const isActive = subchapter.id === selectedSubchapterId;
          const blockCount = (contentBlocksMap.get(subchapter.id) || []).length;
          return (
            <button
              key={subchapter.id}
              type="button"
              onClick={() => {
                setSelectedSubchapterId(subchapter.id);
                if (isMobile) setIsMobileSubchaptersOpen(false);
              }}
              className={`text-left border rounded-lg p-2.5 transition-colors min-w-[140px] flex-1 cursor-pointer ${
                isActive 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:bg-muted/40'
              }`}
            >
              <div className="font-medium text-sm truncate">
                {index + 1}. {subchapter.title || 'Без названия'}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Блоков: {blockCount}
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка подглав...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-[20px] mb-5">
        <main>
          {/* Layout: content left, sidebar right */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Main content area - on LEFT */}
            <div className="flex-1 min-w-0 bg-white rounded-xl shadow p-4">
              {/* Header */}
              <div className="flex mb-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/courses/${courseId}/manage`)}
                  className="flex items-center pl-0 gap-2 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад к редактированию курса
                </Button>
              </div>

              {/* Title */}
              <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                  Редактирование главы{' '}
                  <span className="inline-block px-2 py-1 text-sm bg-purple text-white font-semibold rounded-xl border-2 border-purple">
                  {chapterTitle}
                  </span>
              </h2>
              </div>

              {selectedSubchapter ? (
                <div className="space-y-5">
                  {/* Subchapter settings - Desktop: inline layout */}
                  <div className="border rounded-lg p-4">
                    {/* Desktop: all fields + buttons in one row */}
                    <div className="hidden md:flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-sm mb-1 block">Название подглавы</Label>
                        <Input
                          value={selectedSubchapter.title}
                          onChange={(e) =>
                            handleSubchapterFieldChange(selectedSubchapter.id, {
                              title: e.target.value,
                            })
                          }
                          onBlur={() => {
                            if (dirtySubchapters.has(selectedSubchapter.id)) {
                              void handleSaveSubchapter(selectedSubchapter.id);
                            }
                          }}
                          placeholder="Название подглавы"
                          className="bg-white"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-sm mb-1 block">Порядок</Label>
                        <Input
                          type="number"
                          value={selectedSubchapter.order}
                          onChange={(e) =>
                            handleSubchapterFieldChange(selectedSubchapter.id, {
                              order: Number(e.target.value) || 1,
                            })
                          }
                          onBlur={() => {
                            if (dirtySubchapters.has(selectedSubchapter.id)) {
                              void handleSaveSubchapter(selectedSubchapter.id);
                            }
                          }}
                          className="bg-white text-center"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteSubchapter(selectedSubchapter.id)}
                                className="cursor-pointer p-1 rounded-md hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                              <p>Удалить подглаву</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleSaveSubchapter(selectedSubchapter.id)}
                                disabled={!dirtySubchapters.has(selectedSubchapter.id)}
                                className="cursor-pointer p-1 rounded-md hover:bg-primary/10"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                              <p>Сохранить подглаву</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    {/* Mobile: stacked layout */}
                    <div className="md:hidden space-y-3">
                      <div>
                        <Label className="text-sm mb-1 block">Название подглавы</Label>
                        <Input
                          value={selectedSubchapter.title}
                          onChange={(e) =>
                            handleSubchapterFieldChange(selectedSubchapter.id, {
                              title: e.target.value,
                            })
                          }
                          onBlur={() => {
                            if (dirtySubchapters.has(selectedSubchapter.id)) {
                              void handleSaveSubchapter(selectedSubchapter.id);
                            }
                          }}
                          placeholder="Название подглавы"
                          className="bg-white"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-sm mb-1 block">Порядок</Label>
                          <Input
                            type="number"
                            value={selectedSubchapter.order}
                            onChange={(e) =>
                              handleSubchapterFieldChange(selectedSubchapter.id, {
                                order: Number(e.target.value) || 1,
                              })
                            }
                            onBlur={() => {
                              if (dirtySubchapters.has(selectedSubchapter.id)) {
                                void handleSaveSubchapter(selectedSubchapter.id);
                              }
                            }}
                            className="bg-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteSubchapter(selectedSubchapter.id)}
                                  className="cursor-pointer p-1 rounded-md hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                                <p>Удалить подглаву</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleSaveSubchapter(selectedSubchapter.id)}
                                  disabled={!dirtySubchapters.has(selectedSubchapter.id)}
                                  className="cursor-pointer p-1 rounded-md hover:bg-primary/10"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                                <p>Сохранить подглаву</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content blocks */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold">Блоки контента</h3>
                    </div>

                    {selectedContentBlocks.length === 0 ? (
                      <div className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
                        Для этой подглавы пока нет контента.
                      </div>
                    ) : (
                      selectedContentBlocks.map((block, blockIndex) => (
                        <div key={block.id} className="border rounded-lg p-4">
                          <div className="space-y-3">
                            {/* Block label - kept separate, not inline */}
                            <div className="text-sm text-muted-foreground pt-2">
                              Блок {blockIndex + 1}
                            </div>
                            
                            {/* Desktop: type, order, delete in one row */}
                            <div className="hidden md:flex items-end gap-3 flex-wrap">
                              <div className="w-40">
                            <Label className="text-sm mb-1 block">Тип</Label>
                                <Select
                                  value={block.type}
                              onValueChange={(
                                value: 'theory' | 'task' | 'test' | 'code_task',
                              ) =>
                                handleContentBlockFieldChange(
                                  block.id,
                                  selectedSubchapter.id,
                                  {
                                    type: value,
                                    answer:
                                      value === 'test'
                                        ? serializeQuizPayload(
                                            getQuizPayloadForBlock(block),
                                          )
                                        : value === 'code_task'
                                          ? serializeCodeTaskConfig(
                                              getCodeTaskConfigForBlock(block),
                                            )
                                          : '',
                                  },
                                )
                              }
                                >
                                  <SelectTrigger className="bg-white cursor-pointer">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                  <SelectItem value="theory" className="cursor-pointer">Теория</SelectItem>
                                  <SelectItem value="task" className="cursor-pointer">Задание</SelectItem>
                                  <SelectItem value="test" className="cursor-pointer">Тест</SelectItem>
                                  <SelectItem value="code_task" className="cursor-pointer">Кодовая задача</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-20">
                                <Label className="text-sm mb-1 block">Порядок</Label>
                                <Input
                                  type="number"
                                  value={block.order}
                                  onChange={(e) =>
                                    handleContentBlockFieldChange(block.id, selectedSubchapter.id, {
                                      order: Number(e.target.value) || 1,
                                    })
                                  }
                                  className="bg-white text-center"
                                />
                              </div>
                              <div className="pt-5">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteContentBlock(block.id, selectedSubchapter.id)}
                                        className="cursor-pointer p-1 rounded-md hover:bg-destructive/10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                                      <p>Удалить блок</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            
                            {/* Mobile: stacked layout */}
                            <div className="md:hidden space-y-3">
                              <div>
                                <Label className="text-sm mb-1 block">Тип блока</Label>
                                <Select
                                  value={block.type}
                                  onValueChange={(
                                    value: 'theory' | 'task' | 'test' | 'code_task',
                                  ) =>
                                    handleContentBlockFieldChange(
                                      block.id,
                                      selectedSubchapter.id,
                                      {
                                        type: value,
                                        answer:
                                          value === 'test'
                                            ? serializeQuizPayload(
                                                getQuizPayloadForBlock(block),
                                              )
                                            : value === 'code_task'
                                              ? serializeCodeTaskConfig(
                                                  getCodeTaskConfigForBlock(block),
                                                )
                                              : '',
                                      },
                                    )
                                  }
                                >
                                  <SelectTrigger className="bg-white cursor-pointer">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    <SelectItem value="theory" className="cursor-pointer">Теория</SelectItem>
                                    <SelectItem value="task" className="cursor-pointer">Задание</SelectItem>
                                    <SelectItem value="test" className="cursor-pointer">Тест</SelectItem>
                                    <SelectItem value="code_task" className="cursor-pointer">Кодовая задача</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <Label className="text-sm mb-1 block">Порядок</Label>
                                  <Input
                                    type="number"
                                    value={block.order}
                                    onChange={(e) =>
                                      handleContentBlockFieldChange(block.id, selectedSubchapter.id, {
                                        order: Number(e.target.value) || 1,
                                      })
                                    }
                                    className="bg-white text-center"
                                  />
                                </div>
                                <div className="pt-5">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          onClick={() => handleDeleteContentBlock(block.id, selectedSubchapter.id)}
                                          className="cursor-pointer p-1 rounded-md hover:bg-destructive/10"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                                        <p>Удалить блок</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </div>

                            {block.type !== 'test' && (
                              <div>
                                <Label className="text-sm mb-2 flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                                  Содержание
                                </Label>
                                <RichTextEditor
                                  value={block.content}
                                  onChange={(e) =>
                                    handleContentBlockFieldChange(block.id, selectedSubchapter.id, {
                                      content: e,
                                    })
                                  }
                                  placeholder="Введите содержание блока"
                                />
                              </div>
                            )}

                            {block.type === 'task' && (
                              <div>
                                <Label className="text-sm mb-2">Ответ на задание</Label>
                                <Input
                                  value={block.answer || ''}
                                  onChange={(e) =>
                                    handleContentBlockFieldChange(block.id, selectedSubchapter.id, {
                                      answer: e.target.value,
                                    })
                                  }
                                  placeholder="Введите правильный ответ"
                                  className="bg-white"
                                />
                              </div>
                            )}

                            {block.type === 'code_task' && (
                              <div className="mt-2 rounded-xl border border-[#e7e7f2] bg-white p-4 space-y-4">
                                {(() => {
                                  const config = getCodeTaskConfigForBlock(block);
                                  return (
                                    <>
                                      <div className="flex flex-col md:flex-row gap-3">
                                        <div className="md:w-64">
                                          <Label className="text-sm mb-1 block">
                                            Язык решения
                                          </Label>
                                          <Select
                                            value={config.language}
                                            onValueChange={(value: 'javascript' | 'python') =>
                                              updateCodeTaskConfig(
                                                block.id,
                                                selectedSubchapter.id,
                                                (prev) => ({
                                                  ...prev,
                                                  language: value,
                                                }),
                                              )
                                            }
                                          >
                                            <SelectTrigger className="bg-white cursor-pointer">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                              <SelectItem value="javascript" className="cursor-pointer">
                                                JavaScript
                                              </SelectItem>
                                              <SelectItem value="python" className="cursor-pointer">
                                                Python
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex-1 text-sm text-muted-foreground md:pt-6">
                                          Условие задачи задаётся в поле
                                          &nbsp;
                                          <span className="font-medium">«Содержание»</span>
                                          &nbsp;выше. Ниже настройте тестовые кейсы.
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-sm">Тест‑кейсы</Label>
                                          <span className="text-xs text-muted-foreground">
                                            Ученику будут видны только не скрытые тесты
                                          </span>
                                        </div>

                                        {config.testCases.map((tc, index) => (
                                          <div
                                            key={tc.id}
                                            className="border rounded-lg p-3 space-y-2 bg-muted/20"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium">
                                                Тест #{index + 1}
                                              </span>
                                              <div className="flex items-center gap-2 text-xs">
                                                <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                                                  <input
                                                    type="checkbox"
                                                    checked={tc.hidden}
                                                    onChange={(e) =>
                                                      updateCodeTaskConfig(
                                                        block.id,
                                                        selectedSubchapter.id,
                                                        (prev) => ({
                                                          ...prev,
                                                          testCases: prev.testCases.map((c) =>
                                                            c.id === tc.id
                                                              ? { ...c, hidden: e.target.checked }
                                                              : c,
                                                          ),
                                                        }),
                                                      )
                                                    }
                                                  />
                                                  <span>Скрытый</span>
                                                </label>
                                              </div>
                                            </div>

                                            <div className="grid gap-2 md:grid-cols-2">
                                              <div>
                                                <Label className="text-xs mb-1 block">
                                                  Input (строка, попадёт в solve(input))
                                                </Label>
                                                <Input
                                                  value={tc.input}
                                                  onChange={(e) =>
                                                    updateCodeTaskConfig(
                                                      block.id,
                                                      selectedSubchapter.id,
                                                      (prev) => ({
                                                        ...prev,
                                                        testCases: prev.testCases.map((c) =>
                                                          c.id === tc.id
                                                            ? { ...c, input: e.target.value }
                                                            : c,
                                                        ),
                                                      }),
                                                    )
                                                  }
                                                  className="bg-white"
                                                />
                                              </div>
                                              <div>
                                                <Label className="text-xs mb-1 block">
                                                  Ожидаемые выводы (через «;»)
                                                </Label>
                                                <Input
                                                  value={tc.expectedOutputs.join('; ')}
                                                  onChange={(e) => {
                                                    const parts = e.target.value
                                                      .split(';')
                                                      .map((v) => v.trim())
                                                      .filter((v) => v.length > 0);
                                                    updateCodeTaskConfig(
                                                      block.id,
                                                      selectedSubchapter.id,
                                                      (prev) => ({
                                                        ...prev,
                                                        testCases: prev.testCases.map((c) =>
                                                          c.id === tc.id
                                                            ? { ...c, expectedOutputs: parts.length ? parts : [''] }
                                                            : c,
                                                        ),
                                                      }),
                                                    );
                                                  }}
                                                  className="bg-white"
                                                />
                                              </div>
                                            </div>

                                            <div className="flex justify-end">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  updateCodeTaskConfig(
                                                    block.id,
                                                    selectedSubchapter.id,
                                                    (prev) => ({
                                                      ...prev,
                                                      testCases:
                                                        prev.testCases.length > 1
                                                          ? prev.testCases.filter((c) => c.id !== tc.id)
                                                          : prev.testCases,
                                                    }),
                                                  )
                                                }
                                                disabled={config.testCases.length <= 1}
                                                className="cursor-pointer"
                                              >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Удалить тест
                                              </Button>
                                            </div>
                                          </div>
                                        ))}

                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            updateCodeTaskConfig(
                                              block.id,
                                              selectedSubchapter.id,
                                              (prev) => ({
                                                ...prev,
                                                testCases: [
                                                  ...prev.testCases,
                                                  {
                                                    id: crypto.randomUUID(),
                                                    input: '',
                                                    expectedOutputs: [''],
                                                    hidden: false,
                                                  },
                                                ],
                                              }),
                                            )
                                          }
                                          className="w-full cursor-pointer"
                                        >
                                          <Plus className="w-4 h-4 mr-2" />
                                          Добавить тест‑кейс
                                        </Button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {block.type === 'test' && (
                              <div className="bg-muted/20 space-y-4">
                                {getQuizPayloadForBlock(block).questions.map((question, qIndex) => (
                                  <div key={question.id} className="space-y-3 p-3 bg-white rounded-md border">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm font-medium flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4 text-purple-500" />
                                        Вопрос {qIndex + 1}
                                      </Label>
                                      {getQuizPayloadForBlock(block).questions.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                              ...prev,
                                              questions: prev.questions.filter((q) => q.id !== question.id),
                                            }))
                                          }
                                          className="text-destructive hover:text-destructive cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Удалить вопрос
                                        </Button>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <Label className="text-sm mb-1 block">Текст вопроса</Label>
                                      <Input
                                        value={question.question}
                                        onChange={(e) =>
                                          updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                            ...prev,
                                            questions: prev.questions.map((q) =>
                                              q.id === question.id ? { ...q, question: e.target.value } : q
                                            ),
                                          }))
                                        }
                                        placeholder="Введите текст вопроса"
                                        className="bg-white"
                                      />
                                    </div>

                                    <div>
                                      <Label className="text-sm mb-2">Тип ответа</Label>
                                      <Select
                                        value={question.selectionType}
                                        onValueChange={(value: QuizSelectionType) =>
                                          updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                            ...prev,
                                            questions: prev.questions.map((q) =>
                                              q.id === question.id
                                                ? {
                                                    ...q,
                                                    selectionType: value,
                                                    options:
                                                      value === 'single' && q.options.filter((o) => o.isCorrect).length > 1
                                                        ? q.options.map((o, i) => ({ ...o, isCorrect: i === 0 }))
                                                        : q.options,
                                                  }
                                                : q
                                            ),
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="bg-white cursor-pointer">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                          <SelectItem value="single" className="cursor-pointer">Один правильный ответ</SelectItem>
                                          <SelectItem value="multiple" className="cursor-pointer">Несколько правильных ответов</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-sm mb-1">Варианты ответов</Label>
                                      {question.options.map((option, optionIndex) => (
                                        <div key={option.id} className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                                ...prev,
                                                questions: prev.questions.map((q) =>
                                                  q.id === question.id
                                                    ? {
                                                        ...q,
                                                        options: q.options.map((opt) => {
                                                          if (opt.id !== option.id) {
                                                            return q.selectionType === 'single'
                                                              ? { ...opt, isCorrect: false }
                                                              : opt;
                                                          }
                                                          return {
                                                            ...opt,
                                                            isCorrect:
                                                              q.selectionType === 'single'
                                                                ? true
                                                                : !opt.isCorrect,
                                                          };
                                                        }),
                                                      }
                                                    : q
                                                ),
                                              }))
                                            }
                                            className={`w-8 h-8 rounded border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
                                              option.isCorrect
                                                ? 'bg-purple border-purple text-white'
                                                : 'bg-background border-border hover:border-primary'
                                            }`}
                                            title="Отметить как правильный"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>

                                          <Input
                                            value={option.text}
                                            onChange={(e) =>
                                              updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                                ...prev,
                                                questions: prev.questions.map((q) =>
                                                  q.id === question.id
                                                    ? {
                                                        ...q,
                                                        options: q.options.map((opt) =>
                                                          opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                                        ),
                                                      }
                                                    : q
                                                ),
                                              }))
                                            }
                                            placeholder={`Вариант ${optionIndex + 1}`}
                                            className="flex-1 min-w-[120px] bg-white"
                                          />

                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                                ...prev,
                                                questions: prev.questions.map((q) =>
                                                  q.id === question.id && q.options.length > 2
                                                    ? { ...q, options: q.options.filter((opt) => opt.id !== option.id) }
                                                    : q
                                                ),
                                              }))
                                            }
                                            disabled={question.options.length <= 2}
                                            className="flex-shrink-0 cursor-pointer"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}

                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                          updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                            ...prev,
                                            questions: prev.questions.map((q) =>
                                              q.id === question.id
                                                ? {
                                                    ...q,
                                                    options: [
                                                      ...q.options,
                                                      { id: crypto.randomUUID(), text: '', isCorrect: false },
                                                    ],
                                                  }
                                                : q
                                            ),
                                          }))
                                        }
                                        className="w-full cursor-pointer"
                                      >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Добавить вариант
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                {/* Add new question button */}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                      ...prev,
                                      questions: [
                                        ...prev.questions,
                                        {
                                          id: crypto.randomUUID(),
                                          question: '',
                                          selectionType: 'single',
                                          options: [
                                            { id: 'opt-1', text: '', isCorrect: true },
                                            { id: 'opt-2', text: '', isCorrect: false },
                                          ],
                                        },
                                      ],
                                    }))
                                  }
                                  className="w-full cursor-pointer"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Добавить новый вопрос
                                </Button>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleSaveContentBlock(block.id, selectedSubchapter.id)}
                                      disabled={!dirtyBlocks.has(block.id)}
                                      className="cursor-pointer"
                                    >
                                      <Save className="w-4 h-4 mr-2" />
                                      Сохранить блок
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="end" className="max-w-[200px] bg-white">
                                    <p>Сохранить изменения блока</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Add block button */}
                    <button
                      onClick={() => handleAddContentBlock(selectedSubchapter.id)}
                      className="w-full border-2 border-dashed border-purple-400 rounded-xl p-6 hover:bg-purple-50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary flex items-center justify-center hover:scale-110">
                        <Plus className="w-6 h-6 text-purple-500" />
                      </div>
                      <span className="text-sm font-medium text-purple-600">Добавить блок контента</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  Выберите подглаву для редактирования.
                </div>
              )}
            </div>

            {/* Desktop sidebar: panel on RIGHT */}
            <div className="hidden lg:flex flex-col gap-3 w-[300px] flex-shrink-0">
              {/* Subchapters panel - starts from top of page */}
              <div className="sticky top-[4em] rounded-xl shadow p-6 bg-white border">
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">Подглавы</h3>
                <SubchaptersList />
                {/* Add subchapter button - below the panel */}
                <Button
                  onClick={handleAddSubchapter}
                  className="flex items-center justify-center gap-2 w-full mt-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Добавить подглаву
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile: Floating button */}
      <div className="lg:hidden fixed bottom-4 right-4 bg-purple text-white border-2 border-purple rounded-lg z-40">
        <Button
          onClick={() => setIsMobileSubchaptersOpen(true)}
          className="flex items-center gap-2 shadow-lg font-semibold cursor-pointer"
          size="lg"
        >
          <List className="w-5 h-5" />
          Подглавы
        </Button>
      </div>

      {/* Mobile modal */}
      {isMobileSubchaptersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsMobileSubchaptersOpen(false)}
          />
          <div className="relative w-full sm:w-[400px] max-h-[85vh] bg-background rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Подглавы</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileSubchaptersOpen(false)} className="h-8 w-8 cursor-pointer">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)]">
              <SubchaptersList isMobile />
            </div>
            <div className="sticky bottom-0 bg-background border-t p-4">
              <Button onClick={handleAddSubchapter} className="w-full flex items-center justify-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                Добавить подглаву
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubchapterEditPage;
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from "@/widgets/navigation/Header/Header";
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar";
import { coursesApi, type Subchapter, type ContentBlock, type Course } from '@/shared/api/courses';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/RichTextEditor';
import { ArrowLeft, Plus, Trash2, Save, ChevronRight, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

const createDefaultQuizPayload = (legacyAnswer?: string | null): QuizAnswerPayload => ({
  format: 'quiz_v1',
  selectionType: 'single',
  options: [
    { id: 'opt-1', text: legacyAnswer || '', isCorrect: true },
    { id: 'opt-2', text: '', isCorrect: false },
  ],
});

const parseQuizPayload = (answer?: string | null): QuizAnswerPayload | null => {
  if (!answer) return null;
  try {
    const parsed = JSON.parse(answer) as Partial<QuizAnswerPayload>;
    if (
      parsed &&
      parsed.format === 'quiz_v1' &&
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
        // Non-blocking for page UX: chapter title fallback remains.
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
    if (!confirm('Вы уверены, что хотите удалить эту подглаву?')) {
      return;
    }
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

  const handleSaveContentBlock = async (blockId: number, subchapterId: number) => {
    try {
      const currentBlock = contentBlocksMap.get(subchapterId)?.find((b) => b.id === blockId);
      if (!currentBlock) return;

      if (currentBlock.type === 'test') {
        const payload = parseQuizPayload(currentBlock.answer) || quizPayloads.get(blockId);
        if (!payload) {
          toast.error('Добавьте варианты ответов для теста');
          return;
        }
        const nonEmptyOptions = payload.options.filter((opt) => opt.text.trim().length > 0);
        if (nonEmptyOptions.length < 2) {
          toast.error('Для теста нужно минимум 2 заполненных варианта');
          return;
        }
        if (!nonEmptyOptions.some((opt) => opt.isCorrect)) {
          toast.error('Отметьте хотя бы один правильный ответ');
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
    if (!confirm('Вы уверены, что хотите удалить этот блок контента?')) {
      return;
    }
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
      <Header />
      <MenuSidebar />
      <div className="mt-[4em] lg:ml-[100px] md:ml-[100px] sm:ml-0">
        <main className="max-w-7xl mx-auto px-8 pb-12">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/courses/${courseId}/manage`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад к редактированию курса
            </Button>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Редактирование подглав</h2>
              <Button
                onClick={handleAddSubchapter}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить подглаву
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 border rounded-lg p-4 h-fit">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Подглавы</h3>
                {subchapters.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Нет подглав. Добавьте первую подглаву.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subchapters.map((subchapter, index) => {
                      const isActive = subchapter.id === selectedSubchapterId;
                      const blockCount = (contentBlocksMap.get(subchapter.id) || []).length;
                      return (
                        <button
                          key={subchapter.id}
                          type="button"
                          onClick={() => setSelectedSubchapterId(subchapter.id)}
                          className={`w-full text-left border rounded-lg p-3 transition-colors ${
                            isActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm truncate">
                              {index + 1}. {subchapter.title || 'Без названия'}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Блоков контента: {blockCount}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-8 border rounded-lg p-5">
                {selectedSubchapter ? (
                  <div className="space-y-5">
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Редактируемая глава
                      </div>
                      <div className="text-sm font-semibold">{chapterTitle}</div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-4">
                          <Label className="text-sm mb-2">Название подглавы</Label>
                          <Input
                            value={selectedSubchapter.title}
                            onChange={(e) =>
                              handleSubchapterFieldChange(selectedSubchapter.id, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Название подглавы"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm mb-2">Порядок</Label>
                          <Input
                            type="number"
                            value={selectedSubchapter.order}
                            onChange={(e) =>
                              handleSubchapterFieldChange(selectedSubchapter.id, {
                                order: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteSubchapter(selectedSubchapter.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить подглаву
                        </Button>
                        <Button
                          onClick={() => handleSaveSubchapter(selectedSubchapter.id)}
                          disabled={!dirtySubchapters.has(selectedSubchapter.id)}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Сохранить подглаву
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Блоки контента</h3>
                        <Button
                          variant="outline"
                          onClick={() => handleAddContentBlock(selectedSubchapter.id)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить блок контента
                        </Button>
                      </div>

                      {selectedContentBlocks.length === 0 ? (
                        <div className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
                          Для этой подглавы пока нет контента.
                        </div>
                      ) : (
                        selectedContentBlocks.map((block, blockIndex) => (
                          <div key={block.id} className="border rounded-lg p-4 bg-background">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="text-sm text-muted-foreground pt-2">
                                Блок {blockIndex + 1}
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteContentBlock(block.id, selectedSubchapter.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-sm mb-2">Тип блока</Label>
                                  <Select
                                    value={block.type}
                                    onValueChange={(value: 'theory' | 'task' | 'test') =>
                                      handleContentBlockFieldChange(block.id, selectedSubchapter.id, {
                                        type: value,
                                        answer:
                                          value === 'test'
                                            ? serializeQuizPayload(getQuizPayloadForBlock(block))
                                            : '',
                                      })
                                    }
                                  >
                                    <SelectTrigger className="bg-white opacity-100">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white opacity-100 border shadow-md">
                                      <SelectItem value="theory">Теория</SelectItem>
                                      <SelectItem value="task">Задание</SelectItem>
                                      <SelectItem value="test">Тест</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm mb-2">Порядок</Label>
                                  <Input
                                    type="number"
                                    value={block.order}
                                    onChange={(e) =>
                                      handleContentBlockFieldChange(block.id, selectedSubchapter.id, {
                                        order: Number(e.target.value) || 1,
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              {block.type !== 'test' && (
                                <div>
                                  <Label className="text-sm mb-2">Содержание</Label>
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

                              {block.type === 'test' && (
                                <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                                  <div>
                                    <Label className="text-sm mb-2">Тип теста</Label>
                                    <Select
                                      value={getQuizPayloadForBlock(block).selectionType}
                                      onValueChange={(value: QuizSelectionType) =>
                                        updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                          ...prev,
                                          selectionType: value,
                                          options:
                                            value === 'single' && prev.options.filter((o) => o.isCorrect).length > 1
                                              ? prev.options.map((o, i) => ({ ...o, isCorrect: i === 0 ? o.isCorrect : false }))
                                              : prev.options,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="bg-white opacity-100">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white opacity-100 border shadow-md">
                                        <SelectItem value="single">Один правильный ответ</SelectItem>
                                        <SelectItem value="multiple">Несколько правильных ответов</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-sm mb-1">Варианты ответов</Label>
                                    {getQuizPayloadForBlock(block).options.map((option, optionIndex) => (
                                      <div key={option.id} className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                              ...prev,
                                              options: prev.options.map((opt) => {
                                                if (opt.id !== option.id) {
                                                  return prev.selectionType === 'single'
                                                    ? { ...opt, isCorrect: false }
                                                    : opt;
                                                }
                                                return {
                                                  ...opt,
                                                  isCorrect:
                                                    prev.selectionType === 'single'
                                                      ? true
                                                      : !opt.isCorrect,
                                                };
                                              }),
                                            }))
                                          }
                                          className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${
                                            option.isCorrect
                                              ? 'bg-green-500 border-green-500 text-white'
                                              : 'bg-white border-gray-300 text-gray-400'
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
                                              options: prev.options.map((opt) =>
                                                opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                              ),
                                            }))
                                          }
                                          placeholder={`Вариант ${optionIndex + 1}`}
                                          className="bg-white"
                                        />

                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            updateQuizPayload(block.id, selectedSubchapter.id, (prev) => ({
                                              ...prev,
                                              options: prev.options.length > 2
                                                ? prev.options.filter((opt) => opt.id !== option.id)
                                                : prev.options,
                                            }))
                                          }
                                          disabled={getQuizPayloadForBlock(block).options.length <= 2}
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
                                          options: [
                                            ...prev.options,
                                            { id: crypto.randomUUID(), text: '', isCorrect: false },
                                          ],
                                        }))
                                      }
                                      className="w-full"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Добавить вариант ответа
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <Button
                                  onClick={() => handleSaveContentBlock(block.id, selectedSubchapter.id)}
                                  disabled={!dirtyBlocks.has(block.id)}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Сохранить блок
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Выберите подглаву слева для редактирования.
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

export default SubchapterEditPage;
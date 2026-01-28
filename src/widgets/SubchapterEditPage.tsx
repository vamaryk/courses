import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from "@/widgets/navigation/Header/Header";
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar";
import { coursesApi, type Subchapter, type ContentBlock } from '@/shared/api/courses';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

function SubchapterEditPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubchapters, setExpandedSubchapters] = useState<Set<number>>(new Set());
  const [contentBlocksMap, setContentBlocksMap] = useState<Map<number, ContentBlock[]>>(new Map());

  useEffect(() => {
    if (chapterId) {
      fetchSubchapters();
    }
  }, [chapterId]);

  const fetchSubchapters = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await coursesApi.getSubchapters(parseInt(chapterId!));
      setSubchapters(data);
      
      // Load content blocks for each subchapter
      const contentMap = new Map<number, ContentBlock[]>();
      for (const subchapter of data) {
        if (subchapter.content_blocks) {
          contentMap.set(subchapter.id, subchapter.content_blocks);
        } else {
          contentMap.set(subchapter.id, []);
        }
      }
      setContentBlocksMap(contentMap);
    } catch (err: any) {
      console.error('Error fetching subchapters:', err);
      const errorMessage = err.response?.data?.error || 'Ошибка при загрузке подглав';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubchapter = async () => {
    try {
      const newSubchapter = await coursesApi.createSubchapter(parseInt(chapterId!), {
        title: `Новая подглава ${subchapters.length + 1}`,
        order: subchapters.length + 1,
      });
      setSubchapters([...subchapters, newSubchapter]);
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

  const handleUpdateSubchapterTitle = async (subchapterId: number, title: string, order: number) => {
    try {
      await coursesApi.updateSubchapter(subchapterId, { title, order });
      setSubchapters(prev => 
        prev.map(s => s.id === subchapterId ? { ...s, title } : s)
      );
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
      setSubchapters(prev => prev.filter(s => s.id !== subchapterId));
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
      const newBlock = await coursesApi.createContentBlock(subchapterId, {
        type: 'theory',
        content: '',
        order: currentBlocks.length + 1,
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

  const handleUpdateContentBlock = async (
    blockId: number,
    subchapterId: number,
    updates: Partial<ContentBlock>
  ) => {
    try {
      const currentBlock = contentBlocksMap.get(subchapterId)?.find(b => b.id === blockId);
      if (!currentBlock) return;

      await coursesApi.updateContentBlock(blockId, {
        type: updates.type || currentBlock.type,
        content: updates.content !== undefined ? updates.content : currentBlock.content,
        answer: updates.answer !== undefined ? updates.answer : currentBlock.answer,
        order: updates.order !== undefined ? updates.order : currentBlock.order,
      });

      setContentBlocksMap(prev => {
        const newMap = new Map(prev);
        const blocks = newMap.get(subchapterId) || [];
        newMap.set(
          subchapterId,
          blocks.map(b => (b.id === blockId ? { ...b, ...updates } : b))
        );
        return newMap;
      });
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

  const toggleSubchapterExpanded = (subchapterId: number) => {
    setExpandedSubchapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subchapterId)) {
        newSet.delete(subchapterId);
      } else {
        newSet.add(subchapterId);
      }
      return newSet;
    });
  };

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
          {/* Header */}
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

          {/* Main Content */}
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

            {subchapters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Нет подглав. Нажмите "Добавить подглаву" чтобы создать первую подглаву.
              </div>
            ) : (
              <div className="space-y-4">
                {subchapters.map((subchapter, index) => {
                  const isExpanded = expandedSubchapters.has(subchapter.id);
                  const contentBlocks = contentBlocksMap.get(subchapter.id) || [];

                  return (
                    <div key={subchapter.id} className="border rounded-lg p-4">
                      {/* Subchapter Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-muted-foreground font-medium w-8">
                          {index + 1}.
                        </span>
                        <Input
                          value={subchapter.title}
                          onChange={(e) =>
                            handleUpdateSubchapterTitle(
                              subchapter.id,
                              e.target.value,
                              subchapter.order
                            )
                          }
                          className="flex-1"
                          placeholder="Название подглавы"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSubchapterExpanded(subchapter.id)}
                        >
                          {isExpanded ? 'Скрыть контент' : 'Показать контент'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSubchapter(subchapter.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Content Blocks */}
                      {isExpanded && (
                        <div className="ml-11 space-y-4 border-l-2 border-primary/20 pl-6">
                          {contentBlocks.map((block, blockIndex) => (
                            <div
                              key={block.id}
                              className="border rounded-lg p-4 bg-background"
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <span className="text-muted-foreground text-sm w-8 mt-2">
                                  {blockIndex + 1}.
                                </span>
                                <div className="flex-1 space-y-3">
                                  <div className="flex gap-3">
                                    <div className="flex-1">
                                      <Label className="text-sm mb-2">Тип блока</Label>
                                      <Select
                                        value={block.type}
                                        onValueChange={(value: 'theory' | 'task') =>
                                          handleUpdateContentBlock(block.id, subchapter.id, {
                                            type: value,
                                          })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="theory">Теория</SelectItem>
                                          <SelectItem value="task">Задание</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-sm mb-2">Содержание</Label>
                                    <Textarea
                                      value={block.content}
                                      onChange={(e) =>
                                        handleUpdateContentBlock(block.id, subchapter.id, {
                                          content: e.target.value,
                                        })
                                      }
                                      onBlur={() => {
                                        // Save on blur
                                      }}
                                      placeholder="Введите содержание блока"
                                      rows={4}
                                    />
                                  </div>

                                  {block.type === 'task' && (
                                    <div>
                                      <Label className="text-sm mb-2">Ответ</Label>
                                      <Textarea
                                        value={block.answer || ''}
                                        onChange={(e) =>
                                          handleUpdateContentBlock(block.id, subchapter.id, {
                                            answer: e.target.value,
                                          })
                                        }
                                        placeholder="Введите правильный ответ"
                                        rows={2}
                                      />
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteContentBlock(block.id, subchapter.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            onClick={() => handleAddContentBlock(subchapter.id)}
                            className="w-full flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Добавить блок контента
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default SubchapterEditPage;

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { coursesApi } from '@/shared/api/courses';
import RichTextEditor from '@/components/RichTextEditor';

interface ContentBlockEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contentBlockId: number | null;
  initialType: 'theory' | 'task';
  initialContent: string;
  initialAnswer?: string;
  initialOrder: number;
}

export function ContentBlockEditModal({
  isOpen,
  onClose,
  onSuccess,
  contentBlockId,
  initialType,
  initialContent,
  initialAnswer,
  initialOrder,
}: ContentBlockEditModalProps) {
  const [type, setType] = useState<'theory' | 'task'>(initialType);
  const [content, setContent] = useState(initialContent);
  const [answer, setAnswer] = useState(initialAnswer || '');
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setType(initialType);
    setContent(initialContent);
    setAnswer(initialAnswer || '');
    setOrder(initialOrder);
  }, [initialType, initialContent, initialAnswer, initialOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!type) {
      setError('Тип блока обязателен');
      return;
    }
    if (!content.trim()) {
      setError('Содержание блока обязательно');
      return;
    }
    if (type === 'task' && !answer.trim()) {
      setError('Ответ для задания обязателен');
      return;
    }
    if (order === undefined || isNaN(order)) {
      setError('Порядок блока обязателен и должен быть числом');
      return;
    }

    if (!contentBlockId) {
      setError('ID блока контента не указан');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await coursesApi.updateContentBlock(contentBlockId, {
        type,
        content: content.trim(),
        answer: type === 'task' ? answer.trim() : undefined,
        order,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating content block:', err);
      setError('Ошибка при обновлении блока контента');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setType(initialType);
      setContent(initialContent);
      setAnswer(initialAnswer || '');
      setOrder(initialOrder);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать блок контента</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="block-type" className="text-right">
                Тип
              </Label>
              <Select value={type} onValueChange={(value: 'theory' | 'task') => setType(value)} disabled={loading}>
                <SelectTrigger id="block-type" className="col-span-3 bg-white opacity-100">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent className="bg-white opacity-100 border shadow-md">
                  <SelectItem value="theory">Теория</SelectItem>
                  <SelectItem value="task">Задание</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="block-content" className="text-right mt-2">
                Содержание
              </Label>
              <div className="col-span-3">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Введите содержание блока"
                  disabled={loading}
                />
              </div>
            </div>

            {type === 'task' && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="block-answer" className="text-right mt-2">
                  Ответ
                </Label>
                <Textarea
                  id="block-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="col-span-3"
                  placeholder="Введите ожидаемый ответ для задания"
                  rows={3}
                  disabled={loading}
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="block-order" className="text-right">
                Порядок
              </Label>
              <Input
                id="block-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                className="col-span-3"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
              >
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
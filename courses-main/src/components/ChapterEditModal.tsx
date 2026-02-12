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
import { Label } from '@/components/ui/label';
import { coursesApi, type Chapter } from '@/shared/api/courses';

interface ChapterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chapterId: number | null;
  initialTitle: string;
  initialOrder: number;
}

export function ChapterEditModal({
  isOpen,
  onClose,
  onSuccess,
  chapterId,
  initialTitle,
  initialOrder,
}: ChapterEditModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setOrder(initialOrder);
  }, [initialTitle, initialOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Название главы обязательно');
      return;
    }
    if (order === undefined || isNaN(order)) {
      setError('Порядок главы обязателен и должен быть числом');
      return;
    }

    if (!chapterId) {
      setError('ID главы не указан');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await coursesApi.updateChapter(chapterId, {
        title: title.trim(),
        order: order,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating chapter:', err);
      setError('Ошибка при обновлении главы');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setTitle(initialTitle);
      setOrder(initialOrder);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать главу</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chapter-title" className="text-right">
                Название
              </Label>
              <Input
                id="chapter-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Введите название главы"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chapter-order" className="text-right">
                Порядок
              </Label>
              <Input
                id="chapter-order"
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

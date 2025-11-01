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
import { coursesApi } from '@/shared/api/courses';

interface ChapterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseId: number;
  initialOrder: number;
}

export function ChapterCreateModal({
  isOpen,
  onClose,
  onSuccess,
  courseId,
  initialOrder,
}: ChapterCreateModalProps) {
  const [title, setTitle] = useState(`Новая глава ${initialOrder}`);
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrder(initialOrder);
    setTitle(`Новая глава ${initialOrder}`);
  }, [initialOrder]);

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

    try {
      setLoading(true);
      setError(null);

      // Создаем только главу
      await coursesApi.createChapter(courseId, {
        title: title.trim(),
        order: order,
      });

      onSuccess();
      onClose();
      setTitle(`Новая глава ${initialOrder + 1}`);
    } catch (err) {
      console.error('Error creating chapter:', err);
      setError('Ошибка при создании главы');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setTitle(`Новая глава ${initialOrder}`);
      setOrder(initialOrder);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать главу</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="error-message">
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
              {loading ? 'Создание...' : 'Создать главу'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

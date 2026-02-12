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

interface SubchapterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chapterId: number;
  initialOrder: number;
}

export function SubchapterCreateModal({
  isOpen,
  onClose,
  onSuccess,
  chapterId,
  initialOrder,
}: SubchapterCreateModalProps) {
  const [title, setTitle] = useState(`Новая подглава ${initialOrder}`);
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrder(initialOrder);
    setTitle(`Новая подглава ${initialOrder}`);
  }, [initialOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Название подглавы обязательно');
      return;
    }
    if (order === undefined || isNaN(order)) {
      setError('Порядок подглавы обязателен и должен быть числом');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Создаем только подглаву
      await coursesApi.createSubchapter(chapterId, {
        title: title.trim(),
        order: order,
      });

      onSuccess();
      onClose();
      setTitle(`Новая подглава ${initialOrder + 1}`);
    } catch (err) {
      console.error('Error creating subchapter:', err);
      setError('Ошибка при создании подглавы');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setTitle(`Новая подглава ${initialOrder}`);
      setOrder(initialOrder);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать подглаву</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subchapter-title" className="text-right">
                Название
              </Label>
              <Input
                id="subchapter-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Введите название подглавы"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subchapter-order" className="text-right">
                Порядок
              </Label>
              <Input
                id="subchapter-order"
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
              {loading ? 'Создание...' : 'Создать подглаву'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

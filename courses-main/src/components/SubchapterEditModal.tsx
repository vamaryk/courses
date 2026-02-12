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
import { coursesApi, type Subchapter } from '@/shared/api/courses';

interface SubchapterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subchapterId: number | null;
  initialTitle: string;
  initialOrder: number;
}

export function SubchapterEditModal({
  isOpen,
  onClose,
  onSuccess,
  subchapterId,
  initialTitle,
  initialOrder,
}: SubchapterEditModalProps) {
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
      setError('Название подглавы обязательно');
      return;
    }
    if (order === undefined || isNaN(order)) {
      setError('Порядок подглавы обязателен и должен быть числом');
      return;
    }

    if (!subchapterId) {
      setError('ID подглавы не указан');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await coursesApi.updateSubchapter(subchapterId, {
        title: title.trim(),
        order: order,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating subchapter:', err);
      setError('Ошибка при обновлении подглавы');
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
          <DialogTitle>Редактировать подглаву</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
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
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

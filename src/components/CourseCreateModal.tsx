import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { coursesApi } from '@/shared/api/courses';

interface CourseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  title: string;
  description: string;
  isPublic: boolean;
}

export function CourseCreateModal({ isOpen, onClose, onSuccess }: CourseCreateModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    isPublic: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Название курса обязательно');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await coursesApi.createCourse({
        title: formData.title.trim(),
        description: formData.description.trim(),
        isPublic: formData.isPublic,
      });

      onSuccess();
      onClose();

      // Сброс формы
      setFormData({
        title: '',
        description: '',
        isPublic: false,
      });
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Ошибка при создании курса');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setFormData({
        title: '',
        description: '',
        isPublic: false,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать новый курс</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Название
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="col-span-3"
                placeholder="Введите название курса"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right mt-2">
                Описание
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Опишите ваш курс"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isPublic" className="text-right">
                Публичный
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                  disabled={loading}
                />
                <Label htmlFor="isPublic" className="text-sm text-gray-600">
                  {formData.isPublic ? 'Да' : 'Нет'}
                </Label>
              </div>
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
              {loading ? 'Создание...' : 'Создать курс'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

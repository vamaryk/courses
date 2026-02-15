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
import { Switch } from '@/components/ui/switch';
import { coursesApi } from '@/shared/api/courses';

interface CourseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseId: number | null;
}

interface FormData {
  title: string;
  description: string;
  isPublic: boolean;
}

export function CourseEditModal({ isOpen, onClose, onSuccess, courseId }: CourseEditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    isPublic: false,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем данные курса при открытии модального окна
  useEffect(() => {
    if (isOpen && courseId) {
      const fetchCourse = async () => {
        try {
          setInitialLoading(true);
          setError(null);

          const course = await coursesApi.getCourse(courseId);

          setFormData({
            title: course.title,
            description: course.description || '',
            isPublic: course.is_public,
          });
        } catch (err) {
          console.error('Error fetching course:', err);
          setError('Ошибка при загрузке данных курса');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchCourse();
    }
  }, [isOpen, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Название курса обязательно');
      return;
    }

    if (!courseId) {
      setError('ID курса не указан');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await coursesApi.updateCourse(courseId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        isPublic: formData.isPublic,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating course:', err);
      setError('Ошибка при обновлении курса');
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
          <DialogTitle>Редактировать курс</DialogTitle>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-title" className="text-right">
                  Название
                </Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="col-span-3"
                  placeholder="Введите название курса"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-description" className="text-right mt-2">
                  Описание
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Опишите ваш курс"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isPublic" className="text-right">
                  Публичный
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    id="edit-isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                    disabled={loading}
                  />
                  <Label htmlFor="edit-isPublic" className="text-sm text-gray-600">
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
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

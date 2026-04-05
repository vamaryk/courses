import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi } from '@/shared/api/courses';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

function ChapterCanvasPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const navigate = useNavigate();

  const [canvasData, setCanvasData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (chapterId) {
      fetchCanvasData();
    }
  }, [chapterId]);

  const fetchCanvasData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await coursesApi.getChapterCanvas(parseInt(chapterId!));
      setCanvasData(response.canvasData || {});
    } catch (err: any) {
      console.error('Error fetching canvas data:', err);
      const errorMessage = err.response?.data?.error || 'Ошибка при загрузке данных холста';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await coursesApi.updateChapterCanvas(parseInt(chapterId!), canvasData);
      setHasChanges(false);
      toast.success('Данные холста успешно сохранены');
    } catch (err: any) {
      console.error('Error saving canvas data:', err);
      const errorMessage = err.response?.data?.error || 'Ошибка при сохранении данных холста';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCanvasChange = (newData: any) => {
    setCanvasData(newData);
    setHasChanges(true);
  };

  // Автосохранение каждые 30 секунд, если есть изменения
  useEffect(() => {
    if (hasChanges && !saving && canvasData) {
      const autoSaveTimer = setTimeout(() => {
        handleSave();
      }, 30000); // 30 секунд

      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasChanges, canvasData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка холста...</div>
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
    <div className="w-full min-w-0 pb-8 sm:pb-12">
      <div className="max-w-[min(1920px,100%)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/courses/${courseId}/manage`)}
              className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад к редактированию курса
            </Button>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {hasChanges && (
                <span className="text-sm text-muted-foreground text-center sm:text-right">Есть несохраненные изменения</span>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4 sm:p-6 min-h-[min(600px,70vh)]">
            <h2 className="text-2xl font-semibold mb-4">Редактор главы</h2>
            <p className="text-muted-foreground mb-6">
              Здесь будет размещен редактор холста для создания структуры главы.
              В будущем здесь можно будет добавлять блоки контента, перетаскивать их,
              настраивать порядок и связи между элементами.
            </p>
            
            {/* Placeholder для будущего canvas редактора */}
            <div className="border-2 border-dashed border-muted rounded-lg p-6 sm:p-12 text-center overflow-x-auto">
              <p className="text-muted-foreground">
                Canvas редактор будет здесь
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Данные холста: {JSON.stringify(canvasData, null, 2)}
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}

export default ChapterCanvasPage;

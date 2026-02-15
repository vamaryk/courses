import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi } from '@/shared/api/courses';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CourseContentProps {
  courseId: number;
  chapters: Array<{
    id: number;
    title: string;
    order: number;
    subchapters: Array<{
      id: number;
      title: string;
      order: number;
      content_blocks: Array<{
        id: number;
        type: 'theory' | 'task';
        content: string;
        order: number;
      }>;
    }>;
  }>;
}

export const CourseContent = ({ courseId, chapters }: CourseContentProps) => {
  const navigate = useNavigate();
  const { chapterId, subchapterId } = useParams<{
    chapterId?: string;
    subchapterId?: string;
  }>();

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentSubchapterIndex, setCurrentSubchapterIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort chapters and subchapters by order
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order).map(chapter => ({
    ...chapter,
    subchapters: [...(chapter.subchapters || [])].sort((a, b) => a.order - b.order).map(subchapter => ({
      ...subchapter,
      content_blocks: [...(subchapter.content_blocks || [])].sort((a, b) => a.order - b.order)
    }))
  }));

  // Initialize current chapter and subchapter based on URL params
  useEffect(() => {
    if (chapters.length === 0) return;

    let chapterIdx = 0;
    let subchapterIdx = 0;

    if (chapterId) {
      const foundChapterIdx = sortedChapters.findIndex(c => c.id === parseInt(chapterId));
      if (foundChapterIdx >= 0) {
        chapterIdx = foundChapterIdx;
      }
    }

    const currentChapter = sortedChapters[chapterIdx];
    if (currentChapter?.subchapters?.length > 0) {
      if (subchapterId) {
        const foundSubchapterIdx = currentChapter.subchapters.findIndex(
          s => s.id === parseInt(subchapterId)
        );
        if (foundSubchapterIdx >= 0) {
          subchapterIdx = foundSubchapterIdx;
        }
      }
    }

    setCurrentChapterIndex(chapterIdx);
    setCurrentSubchapterIndex(subchapterIdx);
    setIsLoading(false);
  }, [chapters, chapterId, subchapterId, sortedChapters]);

  // Track progress
  const currentChapter = sortedChapters[currentChapterIndex];
  const currentSubchapter = currentChapter?.subchapters?.[currentSubchapterIndex];
  const currentContent = currentSubchapter?.content_blocks?.[0]; // For simplicity, using first content block

  const { markAsCompleted } = useCourseProgress({
    courseId,
    chapterId: currentChapter?.id,
    subchapterId: currentSubchapter?.id,
    contentBlockId: currentContent?.id,
    onProgressUpdate: (newProgress) => setProgress(newProgress),
    onCourseComplete: () => {
      // Handle course completion (e.g., show certificate, update user profile)
      console.log('Course completed!');
    },
  });

  // Navigation functions
  const goToNext = async () => {
    if (!currentChapter || !currentSubchapter) return;

    // Mark current content as completed
    await markAsCompleted();

    // Check if there's a next subchapter
    if (currentSubchapterIndex < currentChapter.subchapters.length - 1) {
      // Go to next subchapter in the same chapter
      const nextSubchapter = currentChapter.subchapters[currentSubchapterIndex + 1];
      navigate(`/courses/${courseId}/chapters/${currentChapter.id}/subchapters/${nextSubchapter.id}`);
    } else if (currentChapterIndex < sortedChapters.length - 1) {
      // Go to first subchapter of next chapter
      const nextChapter = sortedChapters[currentChapterIndex + 1];
      if (nextChapter.subchapters.length > 0) {
        navigate(`/courses/${courseId}/chapters/${nextChapter.id}/subchapters/${nextChapter.subchapters[0].id}`);
      } else {
        navigate(`/courses/${courseId}/chapters/${nextChapter.id}`);
      }
    } else {
      // Course completed
      navigate(`/courses/${courseId}/complete`);
    }
  };

  const goToPrevious = () => {
    if (!currentChapter || !currentSubchapter) return;

    if (currentSubchapterIndex > 0) {
      // Go to previous subchapter in the same chapter
      const prevSubchapter = currentChapter.subchapters[currentSubchapterIndex - 1];
      navigate(`/courses/${courseId}/chapters/${currentChapter.id}/subchapters/${prevSubchapter.id}`);
    } else if (currentChapterIndex > 0) {
      // Go to last subchapter of previous chapter
      const prevChapter = sortedChapters[currentChapterIndex - 1];
      if (prevChapter.subchapters.length > 0) {
        const lastSubchapterIndex = prevChapter.subchapters.length - 1;
        navigate(`/courses/${courseId}/chapters/${prevChapter.id}/subchapters/${prevChapter.subchapters[lastSubchapterIndex].id}`);
      } else {
        navigate(`/courses/${courseId}/chapters/${prevChapter.id}`);
      }
    }
  };

  // Calculate progress percentage
  const calculateChapterProgress = (chapter: typeof currentChapter) => {
    if (!chapter?.subchapters?.length) return 0;
    
    const totalSubchapters = chapter.subchapters.length;
    const completedSubchapters = chapter.subchapters.filter(
      sub => sub.content_blocks?.some(block => block.id) // Simplified: assuming if content exists, it's completed
    ).length;
    
    return Math.round((completedSubchapters / totalSubchapters) * 100);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!currentChapter || !currentSubchapter) {
    return <div>Content not found</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Прогресс курса</span>
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto p-4">
          <h3 className="font-semibold mb-4">Содержание курса</h3>
          <div className="space-y-2">
            {sortedChapters.map((chapter) => (
              <div key={chapter.id} className="mb-2">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    chapter.id === currentChapter.id ? 'text-purple-600' : 'text-gray-800'
                  }`}>
                    {chapter.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {calculateChapterProgress(chapter)}%
                  </span>
                </div>
                
                <div className="ml-3 mt-1 space-y-1">
                  {chapter.subchapters.map((subchapter) => (
                    <div
                      key={subchapter.id}
                      className={`flex items-center py-1 px-2 rounded ${
                        subchapter.id === currentSubchapter.id
                          ? 'bg-purple-50 text-purple-700'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => 
                        navigate(`/courses/${courseId}/chapters/${chapter.id}/subchapters/${subchapter.id}`)
                      }
                    >
                      <div className="w-4 h-4 mr-2 flex-shrink-0">
                        {subchapter.content_blocks?.some(block => block.id) ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                      <span className="text-sm truncate">{subchapter.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold mb-4">{currentChapter.title}</h2>
          <h3 className="text-xl font-semibold mb-6 text-gray-800">{currentSubchapter.title}</h3>
          
          {/* Content area */}
          <div className="prose max-w-none mb-8">
            {currentContent && (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: currentContent.content }}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentChapterIndex === 0 && currentSubchapterIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            
            <Button onClick={goToNext}>
              {currentChapterIndex === sortedChapters.length - 1 &&
              currentSubchapterIndex === (currentChapter.subchapters?.length - 1 || 0)
                ? 'Завершить курс'
                : 'Далее'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

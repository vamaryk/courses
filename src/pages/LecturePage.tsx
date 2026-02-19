import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesApi, type Chapter, type Course, type UserContentBlockAnswer } from '@/shared/api/courses';
import { Button } from '@/components/ui/button';
import LectureLayout from '@/components/lecture/LectureLayout';
import LectureOutline from '@/components/lecture/LectureOutline';
import LectureBlocks from '@/components/lecture/LectureBlocks';

interface CourseWithChapters extends Course {
  chapters?: Chapter[];
}

export default function LecturePage() {
  const { courseId, chapterId, subchapterId } = useParams<{ courseId: string; chapterId: string; subchapterId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [answersByBlockId, setAnswersByBlockId] = useState<
    Record<number, { userAnswer: string; isCorrect: boolean }>
  >({});
  const [currentBlockType, setCurrentBlockType] = useState<'theory' | 'task' | 'test'>('theory');

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await coursesApi.getCourse(Number(courseId));
        setCourse(data);
      } catch (err) {
        console.error('Failed to load lecture data:', err);
        setError('Не удалось загрузить лекцию');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

  // 1. Сначала вычисляем зависимости
  const sortedChapters = useMemo(
    () =>
      (course?.chapters ? [...course.chapters].sort((a, b) => a.order - b.order) : []).map((chapter) => ({
        ...chapter,
        subchapters: [...(chapter.subchapters || [])]
          .sort((a, b) => a.order - b.order)
          .map((subchapter) => ({
            ...subchapter,
            content_blocks: [...(subchapter.content_blocks || [])].sort((a, b) => a.order - b.order),
          })),
      })),
    [course?.chapters]
  );

  const currentChapter = useMemo(
    () => sortedChapters.find((chapter) => chapter.id === Number(chapterId)) || null,
    [sortedChapters, chapterId]
  );

  const currentSubchapter = useMemo(
    () => currentChapter?.subchapters?.find((subchapter) => subchapter.id === Number(subchapterId)) || null,
    [currentChapter, subchapterId]
  );

  // 2. Теперь используем currentSubchapter в useEffect (после объявления)
  useEffect(() => {
    setCurrentBlockType('theory');
  }, [currentSubchapter?.id]);

  useEffect(() => {
    if (!sortedChapters.length || (currentChapter && currentSubchapter)) return;
    const firstChapter = sortedChapters[0];
    const firstSubchapter = firstChapter?.subchapters?.[0];
    if (firstChapter && firstSubchapter && courseId) {
      navigate(`/courses/${courseId}/learn/${firstChapter.id}/${firstSubchapter.id}`, { replace: true });
    }
  }, [sortedChapters, currentChapter, currentSubchapter, courseId, navigate]);

  const currentBlocks = currentSubchapter?.content_blocks || [];
  const currentDuration = Math.max(8, currentBlocks.length * 12);
  const durationLabel = `${currentDuration}:40`;

  useEffect(() => {
    const loadAnswers = async () => {
      if (!currentSubchapter?.id) return;
      try {
        const answers = await coursesApi.getSubchapterAnswers(currentSubchapter.id);
        const mapped = answers.reduce<Record<number, { userAnswer: string; isCorrect: boolean }>>(
          (acc, answer: UserContentBlockAnswer) => {
            acc[answer.content_block_id] = {
              userAnswer: answer.user_answer || '',
              isCorrect: Boolean(answer.is_correct),
            };
            return acc;
          },
          {}
        );
        setAnswersByBlockId(mapped);
      } catch (loadError) {
        console.error('Failed to load user answers:', loadError);
        setAnswersByBlockId({});
      }
    };

    loadAnswers();
  }, [currentSubchapter?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !course || !courseId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Контент не найден</h2>
          <p className="text-gray-600 mb-6">{error || 'Не удалось загрузить контент курса.'}</p>
          <Button onClick={() => navigate('/courses')}>К списку курсов</Button>
        </div>
      </div>
    );
  }

  if (!currentChapter || !currentSubchapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Лекция не найдена</h2>
          <p className="text-gray-600 mb-6">Не удалось открыть выбранную лекцию.</p>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>Вернуться к курсу</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <LectureLayout
        breadcrumb={currentChapter.title}
        title={currentSubchapter.title}
        meta={durationLabel}
        onToggleOutline={() => setOutlineOpen(true)}
        blockType={currentBlockType}
      >
        <LectureBlocks
          key={currentSubchapter.id}
          blocks={currentBlocks}
          storedAnswers={answersByBlockId}
          onPersistAnswer={async (contentBlockId, userAnswer, isCorrect) => {
            await coursesApi.saveContentBlockAnswer(contentBlockId, userAnswer, isCorrect);
            setAnswersByBlockId((prev) => ({
              ...prev,
              [contentBlockId]: { userAnswer, isCorrect },
            }));
          }}
          onBlockTypeChange={setCurrentBlockType}
        />
      </LectureLayout>
      <LectureOutline
        isOpen={outlineOpen}
        chapters={sortedChapters}
        currentChapterId={currentChapter.id}
        currentSubchapterId={currentSubchapter.id}
        onClose={() => setOutlineOpen(false)}
        onSelect={(nextChapterId, nextSubchapterId) => {
          setOutlineOpen(false);
          navigate(`/courses/${courseId}/learn/${nextChapterId}/${nextSubchapterId}`);
        }}
      />
    </>
  );
}
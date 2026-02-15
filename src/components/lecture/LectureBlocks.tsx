import { useEffect, useMemo, useState } from 'react';
import type { ContentBlock } from '@/shared/api/courses';
import { Button } from '@/components/ui/button';

interface StoredAnswer {
  userAnswer: string;
  isCorrect: boolean;
}

interface LectureBlocksProps {
  blocks: ContentBlock[];
  storedAnswers?: Record<number, StoredAnswer>;
  onPersistAnswer?: (contentBlockId: number, userAnswer: string, isCorrect: boolean) => Promise<void>;
}

type QuizSelectionType = 'single' | 'multiple';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizAnswerPayload {
  format: 'quiz_v1';
  selectionType: QuizSelectionType;
  options: QuizOption[];
}

const parseQuizPayload = (rawAnswer?: string | null): QuizAnswerPayload | null => {
  if (!rawAnswer) return null;
  try {
    const parsed = JSON.parse(rawAnswer) as Partial<QuizAnswerPayload>;
    if (
      parsed?.format === 'quiz_v1' &&
      (parsed.selectionType === 'single' || parsed.selectionType === 'multiple') &&
      Array.isArray(parsed.options)
    ) {
      return {
        format: 'quiz_v1',
        selectionType: parsed.selectionType,
        options: parsed.options.map((option, index) => ({
          id: option.id || `opt-${index + 1}`,
          text: option.text || '',
          isCorrect: Boolean(option.isCorrect),
        })),
      };
    }
  } catch {
    // ignore invalid payload
  }
  return null;
};

const MAX_TASK_ANSWER_LENGTH = 180;
const MAX_TASK_LINE_LENGTH = 40;
const MAX_LECTURE_LINE_LENGTH = 90;

const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const stripHtml = (value?: string | null) => (value || '').replace(/<[^>]*>/g, '').trim();

const wrapLineByLimit = (line: string, maxLineLength: number) => {
  if (line.length <= maxLineLength) return line;

  const parts: string[] = [];
  let rest = line;
  while (rest.length > maxLineLength) {
    parts.push(rest.slice(0, maxLineLength));
    rest = rest.slice(maxLineLength);
  }
  if (rest.length) parts.push(rest);
  return parts.join('\n');
};

const normalizeTaskInput = (raw: string) => {
  const normalizedLines = raw
    .split('\n')
    .map((line) => wrapLineByLimit(line, MAX_TASK_LINE_LENGTH));
  return normalizedLines.join('\n').slice(0, MAX_TASK_ANSWER_LENGTH);
};

const isMeaningfulBlock = (item: ContentBlock): boolean => {
  const htmlText = stripHtml(item.content);
  if (item.type === 'test') {
    const quizPayload = parseQuizPayload(item.answer);
    return Boolean(quizPayload?.options?.some((option) => option.text.trim().length > 0));
  }
  if (item.type === 'task') {
    return htmlText.length > 0 || (item.answer || '').trim().length > 0;
  }
  return htmlText.length > 0;
};

export default function LectureBlocks({ blocks, storedAnswers = {}, onPersistAnswer }: LectureBlocksProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [taskInput, setTaskInput] = useState('');
  const [taskCheckResult, setTaskCheckResult] = useState<'correct' | 'wrong' | null>(null);
  const [testSelectedOptions, setTestSelectedOptions] = useState<string[]>([]);
  const [testCheckResult, setTestCheckResult] = useState<'correct' | 'wrong' | null>(null);

  const meaningfulBlocks = useMemo(() => blocks.filter(isMeaningfulBlock), [blocks]);
  const viewBlocks = meaningfulBlocks.length > 0 ? meaningfulBlocks : blocks;

  useEffect(() => {
    setActiveIndex(0);
  }, [blocks]);

  if (!viewBlocks.length) {
    return <p className="text-[17px] text-[#595a67]">В этой лекции пока нет контента.</p>;
  }

  const safeIndex = Math.min(activeIndex, viewBlocks.length - 1);
  const block = viewBlocks[safeIndex];
  const quiz = block.type === 'test' ? parseQuizPayload(block.answer) : null;
  const isLastBlock = safeIndex === viewBlocks.length - 1;
  const blockTypeLabel = block.type === 'theory' ? 'Лекция' : block.type === 'task' ? 'Задание' : 'Тест';
  const blockHtmlText = stripHtml(block.content);

  useEffect(() => {
    setTaskInput('');
    setTaskCheckResult(null);
    setTestSelectedOptions([]);
    setTestCheckResult(null);

    const savedAnswer = storedAnswers[block.id];
    if (!savedAnswer) return;

    if (block.type === 'task') {
      setTaskInput(savedAnswer.userAnswer || '');
      setTaskCheckResult(savedAnswer.isCorrect ? 'correct' : 'wrong');
      return;
    }

    if (block.type === 'test') {
      try {
        const parsed = JSON.parse(savedAnswer.userAnswer || '{}') as { selectedOptionIds?: string[] };
        const savedSelected = Array.isArray(parsed.selectedOptionIds) ? parsed.selectedOptionIds : [];
        setTestSelectedOptions(savedSelected);
        setTestCheckResult(savedAnswer.isCorrect ? 'correct' : 'wrong');
      } catch {
        setTestSelectedOptions([]);
        setTestCheckResult(savedAnswer.isCorrect ? 'correct' : 'wrong');
      }
    }
  }, [block.id, block.type, storedAnswers]);

  const canCheckTask = taskInput.trim().length > 0;
  const canCheckTest = testSelectedOptions.length > 0;

  const correctTestOptionIds = useMemo(
    () => (quiz?.options || []).filter((option) => option.isCorrect).map((option) => option.id).sort(),
    [quiz]
  );
  const selectedSortedIds = useMemo(() => [...testSelectedOptions].sort(), [testSelectedOptions]);

  const handleTaskCheck = async () => {
    const expected = normalizeAnswer(block.answer || '');
    const actual = normalizeAnswer(taskInput);
    const isCorrect = expected.length > 0 && actual === expected;
    setTaskCheckResult(isCorrect ? 'correct' : 'wrong');
    try {
      await onPersistAnswer?.(block.id, taskInput, isCorrect);
    } catch (error) {
      console.error('Failed to persist task answer:', error);
    }
  };

  const handleTestCheck = async () => {
    const isCorrect =
      selectedSortedIds.length === correctTestOptionIds.length &&
      selectedSortedIds.every((id, index) => id === correctTestOptionIds[index]);
    setTestCheckResult(isCorrect ? 'correct' : 'wrong');
    try {
      await onPersistAnswer?.(
        block.id,
        JSON.stringify({ selectedOptionIds: selectedSortedIds }),
        isCorrect
      );
    } catch (error) {
      console.error('Failed to persist test answer:', error);
    }
  };

  const handleSelectTestOption = (optionId: string) => {
    if (!quiz) return;
    if (quiz.selectionType === 'single') {
      setTestSelectedOptions([optionId]);
      setTestCheckResult(null);
      return;
    }
    setTestSelectedOptions((prev) => {
      const next = prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      return next;
    });
    setTestCheckResult(null);
  };

  return (
    <div className="space-y-8 text-[#31323f]">
      <section key={block.id}>
        <div className="mb-3 inline-flex rounded-full bg-[#efe9ff] px-3 py-1 text-xs font-semibold text-[#5f43bb]">
          {blockTypeLabel}
        </div>

        {block.type !== 'test' && block.content && (
          <div className="max-w-full overflow-hidden">
            <div
              className={`
                prose break-words whitespace-pre-wrap
                prose-headings:text-[#222431] prose-p:text-[17px] prose-p:leading-8 prose-li:text-[17px] prose-li:leading-8
              `}
              style={{ maxWidth: `${MAX_LECTURE_LINE_LENGTH}ch` }}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        )}

        {block.type !== 'test' && blockHtmlText.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#d9dbe7] bg-white px-4 py-3 text-sm text-[#707286]">
            Этот блок пока пустой. Нажмите "Перейти к следующему блоку" или заполните контент в редакторе подглав.
          </div>
        )}

        {block.type === 'task' && (
          <div className="mt-5 rounded-xl border border-[#e7e7f2] bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-[#35364a]">Введите ответ</div>
            <textarea
              value={taskInput}
              maxLength={MAX_TASK_ANSWER_LENGTH}
              onChange={(event) => {
                setTaskInput(normalizeTaskInput(event.target.value));
                setTaskCheckResult(null);
              }}
              rows={4}
              className="w-full resize-none rounded-lg border border-[#d6d8e3] px-3 py-2 text-[15px] text-[#2f3040] outline-none focus:border-[#8f6bf4] break-words"
              placeholder="Напишите ваш ответ"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#8a8b9a]">
              <span>До {MAX_TASK_LINE_LENGTH} символов в строке</span>
              {taskInput.length}/{MAX_TASK_ANSWER_LENGTH}
            </div>
            <div className="mt-3">
              <Button onClick={handleTaskCheck} disabled={!canCheckTask}>
                Проверить ответ
              </Button>
            </div>
            {taskCheckResult && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  taskCheckResult === 'correct'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {taskCheckResult === 'correct' ? 'Верно! Ответ правильный.' : 'Неверно. Попробуйте еще раз.'}
              </div>
            )}
          </div>
        )}

        {block.type === 'test' && (
          <div className="mt-5 rounded-xl border border-[#ececf4] bg-white p-4">
            <div className="mb-3 text-base font-semibold">Тест</div>
            {quiz?.options?.length ? (
              <div className="space-y-2">
                {quiz.options.map((option) => {
                  const isChecked = testSelectedOptions.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[15px] text-[#4a4b59]"
                    >
                      <input
                        type={quiz.selectionType === 'single' ? 'radio' : 'checkbox'}
                        checked={isChecked}
                        onChange={() => handleSelectTestOption(option.id)}
                        name={`quiz-${block.id}`}
                      />
                      {option.text || 'Без текста варианта'}
                    </label>
                  );
                })}
                <div className="pt-2">
                  <Button onClick={handleTestCheck} disabled={!canCheckTest}>
                    Проверить тест
                  </Button>
                </div>
                {testCheckResult && (
                  <div
                    className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                      testCheckResult === 'correct'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {testCheckResult === 'correct'
                      ? 'Отлично! Все ответы выбраны верно.'
                      : 'Есть ошибка в ответах. Проверьте варианты.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-[#666777]">Данные теста не заполнены.</div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between pt-3">
        <Button variant="outline" onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))} disabled={safeIndex === 0}>
          Предыдущий блок
        </Button>
        <Button onClick={() => setActiveIndex((prev) => Math.min(viewBlocks.length - 1, prev + 1))} disabled={isLastBlock}>
          {isLastBlock ? 'Это последний блок' : 'Перейти к следующему блоку'}
        </Button>
      </div>
    </div>
  );
}

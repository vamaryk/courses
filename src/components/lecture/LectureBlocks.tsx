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
  onBlockTypeChange?: (blockType: 'theory' | 'task' | 'test') => void;
}

type QuizSelectionType = 'single' | 'multiple';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  selectionType: QuizSelectionType;
  options: QuizOption[];
}

interface QuizAnswerPayload {
  format: 'quiz_v1';
  questions: QuizQuestion[];
}

// 🔧 Обновлённый парсер: поддерживает оба формата
const parseQuizPayload = (rawAnswer?: string | null): QuizAnswerPayload | null => {
  if (!rawAnswer) return null;
  try {
    const parsed = JSON.parse(rawAnswer) as any;
    
    // ✅ Новый формат: с массивом questions
    if (
      parsed?.format === 'quiz_v1' &&
      Array.isArray(parsed.questions) &&
      parsed.questions.length > 0
    ) {
      return {
        format: 'quiz_v1',
        questions: parsed.questions.map((q: any, qIndex: number) => ({
          id: q.id || `q-${qIndex + 1}`,
          question: q.question || '',
          selectionType: q.selectionType === 'multiple' ? 'multiple' : 'single',
          options: Array.isArray(q.options)
            ? q.options.map((opt: any, oIndex: number) => ({
                id: opt.id || `opt-${oIndex + 1}`,
                text: opt.text || '',
                isCorrect: Boolean(opt.isCorrect),
              }))
            : [],
        })),
      };
    }
    
    // 🔙 Старый формат: обратная совместимость
    if (
      parsed?.format === 'quiz_v1' &&
      (parsed.selectionType === 'single' || parsed.selectionType === 'multiple') &&
      Array.isArray(parsed.options)
    ) {
      return {
        format: 'quiz_v1',
        questions: [
          {
            id: 'q-1',
            question: '',
            selectionType: parsed.selectionType,
            options: parsed.options.map((opt: any, index: number) => ({
              id: opt.id || `opt-${index + 1}`,
              text: opt.text || '',
              isCorrect: Boolean(opt.isCorrect),
            })),
          },
        ],
      };
    }
  } catch {
    // ignore invalid payload
  }
  return null;
};

const MAX_TASK_ANSWER_LENGTH = 180;
const MAX_LECTURE_LINE_LENGTH = 90;

const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const stripHtml = (value?: string | null) => (value || '').replace(/<[^>]*>/g, '').trim();

const normalizeTaskInput = (raw: string) => {
  return raw.slice(0, MAX_TASK_ANSWER_LENGTH);
};

const isMeaningfulBlock = (item: ContentBlock): boolean => {
  const htmlText = stripHtml(item.content);
  if (item.type === 'test') {
    const quizPayload = parseQuizPayload(item.answer);
    return Boolean(quizPayload?.questions?.some(q => 
      q.options?.some((option) => option.text.trim().length > 0)
    ));
  }
  if (item.type === 'task') {
    return htmlText.length > 0 || (item.answer || '').trim().length > 0;
  }
  return htmlText.length > 0;
};

export default function LectureBlocks({ 
  blocks, 
  storedAnswers = {}, 
  onPersistAnswer,
  onBlockTypeChange 
}: LectureBlocksProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [taskInput, setTaskInput] = useState('');
  const [taskCheckResult, setTaskCheckResult] = useState<'correct' | 'wrong' | null>(null);
  const [testSelectedOptions, setTestSelectedOptions] = useState<string[]>([]);
  const [testCheckResult, setTestCheckResult] = useState<'correct' | 'wrong' | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const meaningfulBlocks = useMemo(() => blocks.filter(isMeaningfulBlock), [blocks]);
  const viewBlocks = meaningfulBlocks.length > 0 ? meaningfulBlocks : blocks;

  useEffect(() => {
    setActiveIndex(0);
  }, [blocks]);

  // Notify parent about current block type
  useEffect(() => {
    if (!viewBlocks.length) return;
    const currentBlock = viewBlocks[activeIndex];
    onBlockTypeChange?.(currentBlock.type);
  }, [activeIndex, viewBlocks, onBlockTypeChange]);

  if (!viewBlocks.length) {
    return <p className="text-[17px] text-[#595a67]">В этой лекции пока нет контента.</p>;
  }

  const safeIndex = Math.min(activeIndex, viewBlocks.length - 1);
  const block = viewBlocks[safeIndex];
  const quiz = block.type === 'test' ? parseQuizPayload(block.answer) : null;
  const currentQuestion = quiz?.questions?.[currentQuestionIndex] || null;
  const isLastBlock = safeIndex === viewBlocks.length - 1;
  const blockHtmlText = stripHtml(block.content);

  useEffect(() => {
    setTaskInput('');
    setTaskCheckResult(null);
    setTestSelectedOptions([]);
    setTestCheckResult(null);
    setCurrentQuestionIndex(0);

    const savedAnswer = storedAnswers[block.id];
    if (!savedAnswer) return;

    if (block.type === 'task') {
      setTaskInput(savedAnswer.userAnswer || '');
      setTaskCheckResult(savedAnswer.isCorrect ? 'correct' : 'wrong');
      return;
    }

    if (block.type === 'test') {
      try {
        const parsed = JSON.parse(savedAnswer.userAnswer || '{}') as { selectedOptionIds?: string[]; questionIndex?: number };
        const savedSelected = Array.isArray(parsed.selectedOptionIds) ? parsed.selectedOptionIds : [];
        setTestSelectedOptions(savedSelected);
        if (parsed.questionIndex !== undefined) {
          setCurrentQuestionIndex(parsed.questionIndex);
        }
        setTestCheckResult(savedAnswer.isCorrect ? 'correct' : 'wrong');
      } catch {
        setTestSelectedOptions([]);
        setTestCheckResult(savedAnswer.isCorrect ? 'correct' : 'wrong');
      }
    }
  }, [block.id, block.type, storedAnswers]);

  const canCheckTask = taskInput.trim().length > 0;
  const canCheckTest = currentQuestion ? testSelectedOptions.length > 0 : false;

  const correctTestOptionIds = useMemo(
    () => (currentQuestion?.options || []).filter((option) => option.isCorrect).map((option) => option.id).sort(),
    [currentQuestion]
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
    if (!currentQuestion) return;
    
    const isCorrect =
      selectedSortedIds.length === correctTestOptionIds.length &&
      selectedSortedIds.every((id, index) => id === correctTestOptionIds[index]);
    setTestCheckResult(isCorrect ? 'correct' : 'wrong');
    try {
      await onPersistAnswer?.(
        block.id,
        JSON.stringify({ selectedOptionIds: selectedSortedIds, questionIndex: currentQuestionIndex }),
        isCorrect
      );
    } catch (error) {
      console.error('Failed to persist test answer:', error);
    }
  };

  const handleSelectTestOption = (optionId: string) => {
    if (!currentQuestion) return;
    if (currentQuestion.selectionType === 'single') {
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

  const buttonBaseClasses = "cursor-pointer rounded-md px-3 py-2 transition-all duration-200 active:scale-[0.98]";
  const buttonPrimaryClasses = `${buttonBaseClasses} bg-purple hover:bg-purple-600 text-white hover:shadow-lg`;
  const buttonOutlineClasses = `${buttonBaseClasses} border-2 border-purple text-darkgrey hover:bg-purple-50`;
  const buttonDisabledClasses = "opacity-50 cursor-not-allowed";

  return (
    <div className="space-y-8 text-[#31323f]">
      <section key={block.id}>
        {block.type !== 'test' && block.content && (
          <div className="max-w-full overflow-hidden px-4 md:px-10">
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
          <div className="mt-2 rounded-xl border border-[#e7e7f2] bg-white p-4">
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
              <span>Макс. {MAX_TASK_ANSWER_LENGTH} символов</span>
              {taskInput.length}/{MAX_TASK_ANSWER_LENGTH}
            </div>
            <div className="my-2">
              <Button 
                onClick={handleTaskCheck} 
                disabled={!canCheckTask}
                className={canCheckTask ? buttonPrimaryClasses : `${buttonPrimaryClasses} ${buttonDisabledClasses}`}
              >
                Проверить ответ
              </Button>
            </div>
            {taskCheckResult && (
              <div
                className={`mt-3 rounded-md px-3 py-2 text-sm ${
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
          <div className="mt-2 rounded-xl border border-[#ececf4] bg-white p-4">
            <div className="mb-3 text-base font-semibold flex items-center justify-between">
              <span>Тест</span>
              {quiz && quiz.questions.length > 1 && (
                <span className="text-sm text-muted-foreground">
                  Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}
                </span>
              )}
            </div>
            
            {currentQuestion ? (
              <>
                {/* Вопрос */}
                {currentQuestion.question && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-darkdrey">{currentQuestion.question}</p>
                  </div>
                )}
                
                {/* Варианты ответов */}
                {currentQuestion.options?.length ? (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => {
                      const isChecked = testSelectedOptions.includes(option.id);
                      const isSingle = currentQuestion.selectionType === 'single';
                      
                      return (
                        <div
                          key={option.id}
                          onClick={() => handleSelectTestOption(option.id)}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 text-[15px] text-[#4a4b59] hover:bg-[#f8f8fb] transition-colors"
                        >
                          <div className="relative shrink-0">
                            <div
                              className={`
                                w-4 h-4 rounded-md border-2 transition-all duration-300 ease-in-out
                                ${isChecked 
                                  ? 'bg-purple border-purple-600' 
                                  : 'bg-purple/50 border-gray-500 hover:border-purple-400'
                                }
                                ${isSingle ? 'rounded-full' : 'rounded-md'}
                              `}
                            />
                            <div
                              className={`
                                absolute w-2 h-2 bg-white transition-all duration-300 delay-100
                                ${isChecked ? 'scale-75 opacity-100' : 'scale-0 opacity-0'}
                                ${isSingle ? 'rounded-full top-1 left-1' : 'rounded-sm top-1 left-1'}
                              `}
                            />
                          </div>
                          <span className="flex-1">{option.text || 'Без текста варианта'}</span>
                        </div>
                      );
                    })}
                    
                    <div className="py-2 flex items-center justify-between">
                      <Button 
                        onClick={handleTestCheck} 
                        disabled={!canCheckTest}
                        className={canCheckTest ? buttonPrimaryClasses : `${buttonPrimaryClasses} ${buttonDisabledClasses}`}
                      >
                        Проверить тест
                      </Button>
                      
                      {/* Навигация по вопросам */}
                      {quiz && quiz.questions.length > 1 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                              setTestSelectedOptions([]);
                              setTestCheckResult(null);
                            }}
                            disabled={currentQuestionIndex === 0}
                            className="rounded-md px-3 py-2 transition-all duration-200 cursor-pointer"
                          >
                            Назад
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1));
                              setTestSelectedOptions([]);
                              setTestCheckResult(null);
                            }}
                            disabled={currentQuestionIndex === quiz.questions.length - 1}
                            className="rounded-md px-3 py-2 transition-all duration-200 cursor-pointer"
                          >
                            Вперёд
                          </Button>
                        </div>
                      )}
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
                  <div className="text-sm text-[#666777]">Варианты ответов не заполнены.</div>
                )}
              </>
            ) : (
              <div className="text-sm text-[#666777]">Данные теста не заполнены.</div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between pt-3">
        <Button 
          variant="outline" 
          onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))} 
          disabled={safeIndex === 0}
          className={safeIndex === 0 ? `${buttonOutlineClasses} ${buttonDisabledClasses}` : buttonOutlineClasses}
        >
          Предыдущий блок
        </Button>
        <Button 
          onClick={() => setActiveIndex((prev) => Math.min(viewBlocks.length - 1, prev + 1))} 
          disabled={isLastBlock}
          className={isLastBlock ? `${buttonPrimaryClasses} ${buttonDisabledClasses}` : buttonPrimaryClasses}
        >
          {isLastBlock ? 'Это последний блок' : 'Далее'}
        </Button>
      </div>
    </div>
  );
}
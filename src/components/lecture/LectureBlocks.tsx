import { useEffect, useMemo, useState, useRef } from 'react';
import type { ContentBlock } from '@/shared/api/courses';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Parses HTML string, injects stable `id` attributes into h1/h2/h3 elements,
 * and returns the modified HTML + headings list.
 * This avoids race conditions with dangerouslySetInnerHTML + DOM queries.
 */
function injectHeadingIds(
  html: string,
  blockId: number,
): { processedHtml: string; headings: HeadingItem[] } {
  if (!html) return { processedHtml: html, headings: [] };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tags = doc.querySelectorAll('h1, h2, h3');
  const headings: HeadingItem[] = [];
  tags.forEach((el, index) => {
    const id = `heading-${blockId}-${index}`;
    el.id = id;
    headings.push({
      id,
      text: (el.textContent || '').trim(),
      level: parseInt(el.tagName.charAt(1), 10),
    });
  });
  return {
    processedHtml: doc.body.innerHTML,
    headings,
  };
}
import { Button } from '@/components/ui/button';
import {
  parseCodeTaskConfig,
  type CodeTaskConfig,
  LANGUAGE_LABELS,
} from '@/shared/codeTasks';
import {
  runCodeTaskTests,
  type CodeTaskTestResult,
} from '@/shared/codeTasksRunner';

interface StoredAnswer {
  userAnswer: string;
  isCorrect: boolean;
}

interface LectureBlocksProps {
  blocks: ContentBlock[];
  storedAnswers?: Record<number, StoredAnswer>;
  onPersistAnswer?: (contentBlockId: number, userAnswer: string, isCorrect: boolean) => Promise<void>;
  onBlockTypeChange?: (blockType: 'theory' | 'task' | 'test' | 'code_task') => void;
  onLastBlockNext?: () => void;
  onFirstBlockPrev?: () => void;
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
  if (item.type === 'code_task') {
    const config = parseCodeTaskConfig(item.answer);
    if (config?.language === 'html_css') {
      return htmlText.length > 0 || Boolean(config?.starterHtml) || Boolean(config?.starterCss);
    }
    if (config?.language === 'cpp') {
      return htmlText.length > 0 || Boolean(config?.starterCode);
    }
    const hasTests = config?.testCases?.length;
    return htmlText.length > 0 || Boolean(hasTests);
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
  onBlockTypeChange,
  onLastBlockNext,
  onFirstBlockPrev,
}: LectureBlocksProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [taskInput, setTaskInput] = useState('');
  const [taskCheckResult, setTaskCheckResult] = useState<'correct' | 'wrong' | null>(null);
  const [testSelectedOptions, setTestSelectedOptions] = useState<string[]>([]);
  const [testCheckResult, setTestCheckResult] = useState<'correct' | 'wrong' | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [codeTaskCode, setCodeTaskCode] = useState('');
  const [codeTaskHtml, setCodeTaskHtml] = useState('');
  const [codeTaskCss, setCodeTaskCss] = useState('');
  const [codeTaskResults, setCodeTaskResults] = useState<CodeTaskTestResult[] | null>(null);
  const [codeTaskIsRunning, setCodeTaskIsRunning] = useState(false);
  const [codeTaskError, setCodeTaskError] = useState<string | null>(null);
  const [htmlCssSubmitResult, setHtmlCssSubmitResult] = useState<'correct' | 'wrong' | 'submitted' | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const highlightedHeadingRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
    return <p className="text-[17px] text-[#595a67] break-words">В этой лекции пока нет контента.</p>;
  }

  const safeIndex = Math.min(activeIndex, viewBlocks.length - 1);
  const block = viewBlocks[safeIndex];
  const quiz = block.type === 'test' ? parseQuizPayload(block.answer) : null;
  const codeTaskConfig: CodeTaskConfig | null =
    block.type === 'code_task' ? parseCodeTaskConfig(block.answer) : null;
  const currentQuestion = quiz?.questions?.[currentQuestionIndex] || null;
  const isLastBlock = safeIndex === viewBlocks.length - 1;
  const blockHtmlText = stripHtml(block.content);

  // Parse headings, inject IDs, and add not-prose to code blocks so Tailwind Typography
  // doesn't add its own padding/margin that inflates the block beyond the code height.
  const { processedHtml, headings: headingsList } = useMemo(() => {
    if (block.type === 'test' || !block.content) {
      return { processedHtml: block.content || '', headings: [] };
    }
    const { processedHtml: html, headings } = injectHeadingIds(block.content, block.id);
    // DOMParser re-parents <div class="code-line"> elements out of <code>/<pre> per HTML5 spec,
    // so we also mark code blocks as not-prose to prevent Tailwind Typography from touching
    // the now-empty <pre> element (which otherwise gets large prose margins/padding).
    const notProse = html
      .replace(/class="code-block"/g, 'class="code-block not-prose"')
      .replace(/class='code-block'/g, "class='code-block not-prose'");
    return { processedHtml: notProse, headings };
  }, [block.id, block.content, block.type]);

  useEffect(() => {
    setTaskInput('');
    setTaskCheckResult(null);
    setTestSelectedOptions([]);
    setTestCheckResult(null);
    setCurrentQuestionIndex(0);
    setCodeTaskIsRunning(false);
    setCodeTaskResults(null);
    setCodeTaskError(null);
    setHtmlCssSubmitResult(null);

    const savedAnswer = storedAnswers[block.id];

    if (block.type === 'code_task' && codeTaskConfig?.language === 'html_css') {
      const starterHtml = codeTaskConfig.starterHtml ?? '';
      const starterCss = codeTaskConfig.starterCss ?? '';
      if (savedAnswer) {
        try {
          const parsed = JSON.parse(savedAnswer.userAnswer || '{}') as { format?: string; html?: string; css?: string };
          if (parsed.format === 'code_task_answer_v1') {
            setCodeTaskHtml(typeof parsed.html === 'string' ? parsed.html : starterHtml);
            setCodeTaskCss(typeof parsed.css === 'string' ? parsed.css : starterCss);
            return;
          }
        } catch {
          // ignore
        }
      }
      setCodeTaskHtml(starterHtml);
      setCodeTaskCss(starterCss);
      return;
    }

    setCodeTaskHtml('');
    setCodeTaskCss('');

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
    if (block.type === 'code_task') {
      const starter = codeTaskConfig?.starterCode ?? '';
      try {
        const parsed = JSON.parse(savedAnswer.userAnswer || '{}') as { format?: string; code?: string };
        if (parsed.format === 'code_task_answer_v1' && typeof parsed.code === 'string') {
          setCodeTaskCode(parsed.code);
          return;
        }
      } catch {
        // ignore parse error, fallback to starter code below
      }
      setCodeTaskCode(starter);
    }
  }, [block.id, block.type, storedAnswers, codeTaskConfig?.language, codeTaskConfig?.starterCode, codeTaskConfig?.starterHtml, codeTaskConfig?.starterCss]);

  const canCheckTask = taskInput.trim().length > 0;
  const canCheckTest = currentQuestion ? testSelectedOptions.length > 0 : false;

  const correctTestOptionIds = useMemo(
    () => (currentQuestion?.options || []).filter((option) => option.isCorrect).map((option) => option.id).sort(),
    [currentQuestion]
  );
  const selectedSortedIds = useMemo(() => [...testSelectedOptions].sort(), [testSelectedOptions]);

  const handleRunCodeTask = async () => {
    if (!codeTaskConfig) return;

    if (codeTaskConfig.language === 'cpp') {
      const codeToSave = codeTaskCode.trim() || codeTaskConfig.starterCode || '';
      if (!codeToSave.trim()) {
        setCodeTaskError('Добавьте код перед отправкой');
        return;
      }
      setCodeTaskIsRunning(true);
      setCodeTaskError(null);
      setCodeTaskResults(null);
      try {
        const payload = JSON.stringify({ format: 'code_task_answer_v1', code: codeToSave });
        await onPersistAnswer?.(block.id, payload, true);
        setCodeTaskError('C++ нельзя автоматически проверить в браузере. Ваш код сохранён и отправлен на проверку.');
      } catch (err) {
        setCodeTaskError(err instanceof Error ? err.message : String(err));
      } finally {
        setCodeTaskIsRunning(false);
      }
      return;
    }

    if (!codeTaskConfig.testCases.length) return;

    const codeToRun =
      codeTaskCode && codeTaskCode.trim().length > 0
        ? codeTaskCode
        : codeTaskConfig.starterCode || '';

    if (!codeToRun.trim()) {
      setCodeTaskError('Добавьте код перед запуском тестов');
      return;
    }

    setCodeTaskIsRunning(true);
    setCodeTaskError(null);
    setCodeTaskResults(null);
    try {
      const results = await runCodeTaskTests(
        codeTaskConfig.language,
        codeToRun,
        codeTaskConfig.testCases,
      );
      setCodeTaskResults(results);
      const allPassed = results.every((r) => r.passed);
      const payload = JSON.stringify({
        format: 'code_task_answer_v1',
        code: codeTaskCode,
      });
      await onPersistAnswer?.(block.id, payload, allPassed);
    } catch (error) {
      setCodeTaskError(error instanceof Error ? error.message : String(error));
    } finally {
      setCodeTaskIsRunning(false);
    }
  };

  const handleRunHtmlCssTask = async () => {
    if (!codeTaskConfig) return;
    const expectedHtml = codeTaskConfig.expectedHtml?.trim() ?? '';
    const expectedCss = codeTaskConfig.expectedCss?.trim() ?? '';

    let isCorrect = true;
    if (expectedHtml || expectedCss) {
      const htmlMatch = !expectedHtml || codeTaskHtml.trim() === expectedHtml;
      const cssMatch = !expectedCss || codeTaskCss.trim() === expectedCss;
      isCorrect = htmlMatch && cssMatch;
    }

    setCodeTaskIsRunning(true);
    try {
      const payload = JSON.stringify({
        format: 'code_task_answer_v1',
        html: codeTaskHtml,
        css: codeTaskCss,
      });
      await onPersistAnswer?.(block.id, payload, isCorrect);
      setHtmlCssSubmitResult(expectedHtml || expectedCss ? (isCorrect ? 'correct' : 'wrong') : 'submitted');
    } catch (err) {
      setCodeTaskError(err instanceof Error ? err.message : String(err));
    } finally {
      setCodeTaskIsRunning(false);
    }
  };

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
  const buttonPrimaryClasses = `${buttonBaseClasses} bg-purple hover:bg-purple-600 text-white hover:shadow-lg mb-10`;
  const buttonOutlineClasses = `${buttonBaseClasses} border-2 border-purple text-darkgrey hover:bg-purple-50 mb-10`;
  const buttonDisabledClasses = "opacity-50 cursor-not-allowed mb-10";

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Event delegation for copy buttons inside RichTextEditor code blocks.
  // Searches .code-content spans from codeBlock (not from <code>) because DOMParser
  // re-parents <div class="code-line"> elements out of <code>/<pre> per HTML5 spec,
  // leaving <code> empty while the content spans remain siblings inside the scroll div.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const showCopyToast = () => {
      const existing = document.getElementById('lecture-copy-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'lecture-copy-toast';
      toast.textContent = '✓ Код скопирован';
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%) translateY(8px)',
        background: '#16a34a',
        color: '#fff',
        padding: '8px 18px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        letterSpacing: '0.01em',
        opacity: '0',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        zIndex: '99999',
        pointerEvents: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        whiteSpace: 'nowrap',
      });
      document.body.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(8px)';
        setTimeout(() => toast.remove(), 200);
      }, 1800);
    };

    const handleClick = async (e: MouseEvent) => {
      const copyBtn = (e.target as HTMLElement)?.closest?.('[data-copy-code="true"]') as HTMLElement | null;
      if (!copyBtn) return;

      const codeBlock = copyBtn.closest('[data-code-block="true"]') as HTMLElement | null;
      if (!codeBlock) return;

      // Button press animation
      copyBtn.style.transform = 'scale(0.88)';
      copyBtn.style.transition = 'transform 0.08s ease';
      setTimeout(() => {
        copyBtn.style.transform = 'scale(1)';
        copyBtn.style.transition = 'transform 0.12s ease';
      }, 80);

      // Extract code: DOMParser moves <div.code-line> out of <code>, so search from codeBlock
      const contentSpans = codeBlock.querySelectorAll<HTMLElement>('.code-content');
      let text = '';
      if (contentSpans.length > 0) {
        text = Array.from(contentSpans)
          .map((el) => {
            const t = el.textContent ?? '';
            return t === '\u00a0' || t === ' ' ? '' : t;
          })
          .join('\n');
      } else {
        // Fallback: raw text from pre minus line numbers
        const pre = codeBlock.querySelector('pre');
        if (pre) {
          const clone = pre.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('.code-linenum').forEach((el) => el.remove());
          text = clone.textContent ?? '';
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        showCopyToast();
      } catch {
        const span = copyBtn.querySelector('span');
        if (span) {
          const orig = span.textContent;
          span.textContent = 'Ошибка';
          setTimeout(() => { if (span) span.textContent = orig ?? 'Копировать'; }, 1500);
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [processedHtml]);

  const clearHeadingHighlight = (el: HTMLElement) => {
    el.style.transition = '';
    el.style.backgroundColor = '';
    el.style.boxShadow = '';
    el.style.borderRadius = '';
    el.style.padding = '';
    el.style.width = '';
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (highlightedHeadingRef.current && highlightedHeadingRef.current !== el) {
      clearHeadingHighlight(highlightedHeadingRef.current);
      highlightedHeadingRef.current = null;
    }
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    const offset = 96; // account for sticky header height
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    el.style.transition = 'background-color 220ms ease, box-shadow 220ms ease';
    el.style.backgroundColor = 'rgba(143, 107, 244, 0.18)';
    el.style.boxShadow = '4px 0 0 rgba(143, 107, 244, 0.18), -4px 0 0 rgba(143, 107, 244, 0.18)';
    el.style.borderRadius = '6px';
    el.style.padding = '2px 4px';
    el.style.width = 'fit-content';
    highlightedHeadingRef.current = el;

    highlightTimeoutRef.current = window.setTimeout(() => {
      clearHeadingHighlight(el);
      if (highlightedHeadingRef.current === el) {
        highlightedHeadingRef.current = null;
      }
      highlightTimeoutRef.current = null;
    }, 1200);

    if (window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0">
      {/* Меню «Содержание» — на мобильных сверху, на десктопе справа */}
      {headingsList.length > 0 && (
        <div className="order-1 lg:order-2 w-full lg:w-56 flex-shrink-0">
          <div className="lg:sticky lg:top-24 rounded-xl border border-[#e7e7f2] bg-white p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-[#35364a] mb-2">Заголовки</h3>
            <nav className="space-y-1 max-h-[40vh] lg:max-h-[60vh] overflow-y-auto pr-1">
              {headingsList.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => scrollToHeading(h.id)}
                  className={`
                    w-full text-left text-sm py-2.5 px-2 rounded-md transition-colors
                    hover:bg-purple-50 hover:text-purple-700 active:bg-purple-100
                    ${h.level === 1 
                      ? 'font-semibold text-[#222431]' 
                      : h.level === 2 
                        ? 'pl-4 font-medium text-[#31323f]' 
                        : 'pl-7 text-[#595a67]'
                    }
                  `}
                >
                  {h.text || '(без текста)'}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Основной контент — на мобильных после меню, на десктопе слева */}
      <div className="order-2 lg:order-1 flex-1 min-w-0 space-y-8 text-[#31323f]">
        <section key={block.id} className="w-full min-w-0">
          {block.type !== 'test' && block.content && (
            <div className="w-full max-w-full px-4">
              {/* Show copy button; hide editor-only buttons. Pre/code prose reset handled
                  by not-prose class injected into .code-block in processedHtml. */}
              <style>{`
                .lecture-prose .code-edit-btn-wrapper {
                  opacity: 1 !important;
                  transition: none !important;
                }
                .lecture-prose [data-edit-code="true"],
                .lecture-prose [data-delete-code="true"] {
                  display: none !important;
                }
                .lecture-prose [data-copy-code="true"]:hover {
                  background: #444 !important;
                }
                /* No line wrapping — scroll horizontally instead */
                .lecture-prose .code-block .code-content {
                  white-space: pre !important;
                  word-wrap: normal !important;
                  word-break: normal !important;
                  overflow-wrap: normal !important;
                }
                .lecture-prose .code-block .code-line {
                  flex-wrap: nowrap !important;
                  min-width: max-content;
                }
                /* Компактные вертикальные отступы у блока кода (в т.ч. для старого HTML из редактора) */
                .lecture-prose .code-block {
                  margin-top: 0.25rem !important;
                  margin-bottom: 0.25rem !important;
                  height: fit-content !important;
                }
                /*
                  Typography (prose) задаёт pre большие margin/padding (~20px/8px). Без margin:0 пустота
                  внутри тёмного блока остаётся даже при not-prose — переопределяем явно.
                */
                .lecture-prose .code-block pre {
                  margin: 0 !important;
                  margin-top: 0 !important;
                  margin-bottom: 0 !important;
                  padding-top: 2px !important;
                  padding-bottom: 2px !important;
                  padding-left: 10px !important;
                  padding-right: 10px !important;
                  background: transparent !important;
                  border-radius: 0 !important;
                  font-size: inherit !important;
                  line-height: 18px !important;
                  color: #d4d4d4 !important;
                  white-space: normal !important;
                }
                /* Только пустой <code> (призрак после невалидного div внутри code) — не скрывать <code> с .code-line внутри */
                .lecture-prose .code-block pre > code:empty {
                  display: none !important;
                }
                /* Старый HTML: без класса code-block-scroll — целимся по инлайновому overflow-x */
                .lecture-prose .code-block-scroll,
                .lecture-prose .code-block > div[style*="overflow-x"] {
                  scrollbar-gutter: auto !important;
                  margin-top: 0 !important;
                  min-height: 0 !important;
                  height: auto !important;
                }
                .lecture-prose .code-block[data-language]:not([data-language=""]) > div[style*="overflow-x"] {
                  padding-top: 14px !important;
                }
                /* Изображения в лекции: адаптивно, без искажения пропорций */
                .lecture-prose picture {
                  display: block;
                  max-width: 100%;
                  margin-left: auto;
                  margin-right: auto;
                }
                .lecture-prose img {
                  display: block;
                  max-width: 100% !important;
                  width: auto;
                  height: auto !important;
                  object-fit: contain;
                  object-position: center;
                  margin-left: auto;
                  margin-right: auto;
                  box-sizing: border-box;
                }
                .lecture-prose figure {
                  max-width: 100%;
                  margin-left: auto;
                  margin-right: auto;
                }
                .lecture-prose figure > img {
                  width: auto;
                  max-width: 100% !important;
                }
              `}</style>
              <div
                ref={contentRef}
                className={`
                  lecture-prose prose break-words whitespace-pre-wrap
                  prose-headings:text-[#222431] prose-p:text-[17px] prose-p:leading-8 prose-li:text-[17px] prose-li:leading-8
                  prose-pre:w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre
                  prose-code:break-all prose-a:break-all
                  [&_.video-wrapper]:relative [&_.video-wrapper]:my-6 [&_.video-wrapper]:w-full [&_.video-wrapper]:overflow-hidden [&_.video-wrapper]:rounded-xl
                  [&_.video-wrapper_iframe]:absolute [&_.video-wrapper_iframe]:left-0 [&_.video-wrapper_iframe]:top-0 [&_.video-wrapper_iframe]:h-full [&_.video-wrapper_iframe]:w-full
                  [&_video]:my-6 [&_video]:w-full [&_video]:max-w-full [&_video]:rounded-xl [&_video]:bg-black
                  [&_iframe]:max-w-full
                  [&_picture]:block [&_picture]:max-w-full [&_picture]:mx-auto
                  [&_img]:max-w-full [&_img]:!h-auto [&_img]:w-auto [&_img]:object-contain [&_img]:mx-auto [&_img]:block
                `}
                style={{ 
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            </div>
          )}

          {block.type !== 'test' && blockHtmlText.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#d9dbe7] bg-white px-4 py-3 text-sm text-[#707286] break-words">
              Этот блок пока пустой.
            </div>
          )}

          {block.type === 'task' && (
            <div className="mt-2 rounded-xl border border-[#e7e7f2] bg-white p-4 w-full min-w-0">
              <div className="mb-2 text-sm font-semibold text-[#35364a] break-words">Введите ответ</div>
              <textarea
                value={taskInput}
                maxLength={MAX_TASK_ANSWER_LENGTH}
                onChange={(event) => {
                  setTaskInput(normalizeTaskInput(event.target.value));
                  setTaskCheckResult(null);
                }}
                rows={4}
                className="w-full min-w-0 max-w-full resize-y rounded-lg border border-[#d6d8e3] px-3 py-2 text-[15px] text-[#2f3040] outline-none focus:border-[#8f6bf4] break-words overflow-wrap-break-word"
                placeholder="Напишите ваш ответ"
                style={{ 
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              />
              <div className="mt-1 flex items-center justify-between text-xs text-[#8a8b9a] flex-wrap gap-1">
                <span className="break-words">Макс. {MAX_TASK_ANSWER_LENGTH} символов</span>
                <span>{taskInput.length}/{MAX_TASK_ANSWER_LENGTH}</span>
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
                  className={`mt-3 rounded-md px-3 py-2 text-sm break-words ${
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

          {/* HTML+CSS code task */}
          {block.type === 'code_task' && codeTaskConfig && codeTaskConfig.language === 'html_css' && (
            <div className="mt-2 rounded-xl border border-[#e7e7f2] bg-white p-4 w-full min-w-0">
              <div className="mb-3">
                <div className="text-sm font-semibold text-[#35364a] break-words">HTML + CSS задача</div>
                <div className="text-xs text-[#707286] break-words">
                  Напишите HTML и CSS код. Результат отобразится в предварительном просмотре.
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-4 min-w-0">
                <div className="lg:w-1/2 space-y-3 min-w-0">
                  <div>
                    <div className="text-xs font-semibold text-[#35364a] mb-1">HTML</div>
                    <textarea
                      value={codeTaskHtml}
                      onChange={(e) => { setCodeTaskHtml(e.target.value); setHtmlCssSubmitResult(null); }}
                      rows={10}
                      className="w-full min-w-0 max-w-full font-mono text-sm rounded-lg border border-[#1f2937] px-3 py-2 text-gray-100 outline-none focus:border-[#8f6bf4] bg-[#111827]"
                      placeholder={'<h1>Заголовок</h1>\n<p>Текст страницы</p>'}
                      style={{ whiteSpace: 'pre', overflowX: 'auto', overflowY: 'auto' }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#35364a] mb-1">CSS</div>
                    <textarea
                      value={codeTaskCss}
                      onChange={(e) => { setCodeTaskCss(e.target.value); setHtmlCssSubmitResult(null); }}
                      rows={6}
                      className="w-full min-w-0 max-w-full font-mono text-sm rounded-lg border border-[#1f2937] px-3 py-2 text-gray-100 outline-none focus:border-[#8f6bf4] bg-[#111827]"
                      placeholder={'h1 {\n  color: blue;\n}'}
                      style={{ whiteSpace: 'pre', overflowX: 'auto', overflowY: 'auto' }}
                    />
                  </div>
                  <div>
                    <Button
                      onClick={handleRunHtmlCssTask}
                      disabled={codeTaskIsRunning}
                      className={codeTaskIsRunning ? `${buttonPrimaryClasses} ${buttonDisabledClasses}` : buttonPrimaryClasses}
                    >
                      {codeTaskIsRunning ? 'Отправка…' : 'Отправить'}
                    </Button>
                    {htmlCssSubmitResult && (
                      <div className={`mt-2 rounded-md px-3 py-2 text-sm break-words ${
                        htmlCssSubmitResult === 'correct'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : htmlCssSubmitResult === 'wrong'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {htmlCssSubmitResult === 'correct'
                          ? 'Верно! Код соответствует ожидаемому.'
                          : htmlCssSubmitResult === 'wrong'
                          ? 'Не совпадает с ожидаемым кодом. Попробуйте ещё раз.'
                          : 'Код сохранён.'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:w-1/2 flex flex-col gap-2 min-w-0">
                  <div className="text-xs font-semibold text-[#35364a]">Предварительный просмотр</div>
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><style>${codeTaskCss}</style></head><body>${codeTaskHtml}</body></html>`}
                    sandbox="allow-scripts"
                    title="HTML/CSS Preview"
                    className="w-full rounded-lg border border-[#d6d8e3] bg-white"
                    style={{ height: '340px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* JS / Python / C++ code task */}
          {block.type === 'code_task' && codeTaskConfig && codeTaskConfig.language !== 'html_css' && (
            <div className="mt-2 rounded-xl border border-[#e7e7f2] bg-white p-4 w-full min-w-0">
              <div className="flex flex-col lg:flex-row gap-4 min-w-0">
                {/* Левая колонка: условие и код */}
                <div className="lg:w-2/3 space-y-3 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#35364a] break-words">
                        Проверяемая задача
                      </div>
                      <div className="text-xs text-[#707286] break-words">
                        {codeTaskConfig.language === 'cpp' ? (
                          <>Напишите решение на языке <span className="font-semibold">C++</span>. Код сохраняется и отправляется на проверку.</>
                        ) : (
                          <>Реализуйте функцию <span className="font-mono break-all">solve(input)</span> на языке{' '}
                          <span className="font-semibold">{LANGUAGE_LABELS[codeTaskConfig.language]}</span>
                          . На каждый тест в неё будет подан input из таблицы.</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <textarea
                      value={codeTaskCode}
                      onChange={(event) => setCodeTaskCode(event.target.value)}
                      rows={14}
                      className="w-full min-w-0 max-w-full font-mono text-sm rounded-lg border border-[#1f2937] px-3 py-2 text-gray-100 outline-none focus:border-[#8f6bf4] bg-[#111827] break-all"
                      placeholder={
                        codeTaskConfig.language === 'javascript'
                          ? 'function solve(input) {\n  // напишите решение\n  return input;\n}'
                          : codeTaskConfig.language === 'python'
                          ? 'def solve(data: str) -> str:\n    # напишите решение\n    return data'
                          : '#include <iostream>\nusing namespace std;\n\nint main() {\n  // напишите решение\n  return 0;\n}'
                      }
                      style={{ whiteSpace: 'pre', overflowX: 'auto', overflowY: 'auto' }}
                    />
                  </div>
                </div>

                {/* Правая колонка: запуск и консоль вывода */}
                <div className="lg:w-1/3 flex flex-col gap-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleRunCodeTask}
                      disabled={codeTaskIsRunning || (codeTaskConfig.language !== 'cpp' && !codeTaskConfig.testCases.length)}
                      className={
                        codeTaskIsRunning || (codeTaskConfig.language !== 'cpp' && !codeTaskConfig.testCases.length)
                          ? `${buttonPrimaryClasses} ${buttonDisabledClasses}`
                          : buttonPrimaryClasses
                      }
                    >
                      {codeTaskIsRunning
                        ? 'Выполняется…'
                        : codeTaskConfig.language === 'cpp'
                        ? 'Отправить код'
                        : 'Запустить тесты'}
                    </Button>
                    {codeTaskConfig.language !== 'cpp' && (
                      <div className="text-[11px] text-[#707286] break-words">
                        Тестов: {codeTaskConfig.testCases.filter((tc) => !tc.hidden).length} видимых,{' '}
                        {codeTaskConfig.testCases.filter((tc) => tc.hidden).length} скрытых
                      </div>
                    )}
                    {codeTaskConfig.language === 'cpp' && (
                      <div className="text-[11px] text-[#707286] break-words">
                        Код сохраняется и отправляется на ручную проверку
                      </div>
                    )}
                  </div>

                  <div className="flex-1 rounded-md bg-slate-950 text-[11px] text-slate-100 border border-slate-800 p-3 overflow-x-auto overflow-y-auto min-w-0">
                    <div className="mb-1 text-xs font-semibold text-slate-200 break-words">
                      {codeTaskConfig.language === 'cpp' ? 'Статус' : 'Консоль программы'}
                    </div>

                    {codeTaskError && (
                      <div className={`mb-2 rounded-md border px-2 py-1 text-[11px] break-words ${
                        codeTaskConfig.language === 'cpp'
                          ? 'bg-blue-900/40 border-blue-500 text-blue-100'
                          : 'bg-red-900/40 border-red-500 text-red-100'
                      }`}>
                        {codeTaskError}
                      </div>
                    )}

                    {!codeTaskResults && !codeTaskError && (
                      <div className="text-slate-400 break-words">
                        {codeTaskConfig.language === 'cpp'
                          ? 'Нажмите «Отправить код», чтобы сохранить решение.'
                          : 'Нажмите «Запустить тесты», чтобы увидеть вывод программы.'}
                      </div>
                    )}

                    {codeTaskResults && (
                      <ul className="space-y-1">
                        {codeTaskResults.map((result, index) => (
                          <li key={result.testId} className="border-b border-slate-800 last:border-0 pb-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-medium break-words">
                                {result.hidden ? `Скрытый тест #${index + 1}` : `Тест #${index + 1}`}
                              </span>
                              <span className="shrink-0">
                                {result.passed ? (
                                  <span className="text-emerald-400">OK</span>
                                ) : (
                                  <span className="text-red-300">Ошибка</span>
                                )}
                              </span>
                            </div>

                            {!result.hidden && (
                              <div className="mt-0.5 text-[10px] text-slate-300 break-all">
                                <div className="break-words">Ожидалось: {result.expectedOutputs.join(' | ')}</div>
                                <div className="break-words">Фактический вывод: {result.actualOutput || '(пусто)'}</div>
                                {result.error && (
                                  <div className="text-red-300 mt-0.5 break-words">Ошибка: {result.error}</div>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {block.type === 'test' && (
            <div className="mt-2 rounded-xl border border-[#ececf4] bg-white p-4 w-full min-w-0">
              <div className="mb-3 text-base font-semibold flex items-center justify-between gap-2 flex-wrap">
                <span className="break-words">Тест</span>
                {quiz && quiz.questions.length > 1 && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}
                  </span>
                )}
              </div>
              
              {currentQuestion ? (
                <>
                  {/* Вопрос */}
                  {currentQuestion.question && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 break-words">
                      <p className="text-sm font-medium text-darkdrey break-words">{currentQuestion.question}</p>
                    </div>
                  )}
                  
                  {/* Варианты ответов */}
                  {currentQuestion.options?.length ? (
                    <div className="space-y-2 min-w-0">
                      {currentQuestion.options.map((option) => {
                        const isChecked = testSelectedOptions.includes(option.id);
                        const isSingle = currentQuestion.selectionType === 'single';
                        
                        return (
                          <div
                            key={option.id}
                            onClick={() => handleSelectTestOption(option.id)}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 text-[15px] text-[#4a4b59] hover:bg-[#f8f8fb] transition-colors min-w-0"
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
                            <span className="flex-1 min-w-0 break-words">{option.text || 'Без текста варианта'}</span>
                          </div>
                        );
                      })}
                      
                      <div className="py-2 flex items-center justify-between gap-2 flex-wrap">
                        <Button 
                          onClick={handleTestCheck} 
                          disabled={!canCheckTest}
                          className={canCheckTest ? buttonPrimaryClasses : `${buttonPrimaryClasses} ${buttonDisabledClasses}`}
                        >
                          Проверить тест
                        </Button>
                        
                        {/* Навигация по вопросам */}
                        {quiz && quiz.questions.length > 1 && (
                          <div className="flex items-center gap-2 flex-wrap">
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
                          className={`mt-2 rounded-lg px-3 py-2 text-sm break-words ${
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
                    <div className="text-sm text-[#666777] break-words">Варианты ответов не заполнены.</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[#666777] break-words">Данные теста не заполнены.</div>
              )}
            </div>
          )}
        </section>

        {/* Кнопки навигации — всегда внизу контента */}
        <div className="flex items-center justify-between pt-3 gap-2 flex-wrap w-full min-w-0">
          <Button 
            variant="outline" 
            onClick={() => {
              if (safeIndex > 0) {
                setActiveIndex((prev) => Math.max(0, prev - 1));
              } else if (onFirstBlockPrev) {
                onFirstBlockPrev();
              }
            }} 
            disabled={safeIndex === 0 && !onFirstBlockPrev}
            className={safeIndex === 0 && !onFirstBlockPrev ? `${buttonOutlineClasses} ${buttonDisabledClasses}` : buttonOutlineClasses}
          >
            Предыдущий блок
          </Button>
          <Button 
            onClick={() => {
              if (!isLastBlock) {
                setActiveIndex((prev) => Math.min(viewBlocks.length - 1, prev + 1));
              } else if (onLastBlockNext) {
                onLastBlockNext();
              }
            }} 
            disabled={isLastBlock && !onLastBlockNext}
            className={isLastBlock && !onLastBlockNext ? `${buttonPrimaryClasses} ${buttonDisabledClasses}` : buttonPrimaryClasses}
          >
            {isLastBlock
              ? onLastBlockNext
                ? 'Следующая подглава'
                : 'Это последний блок'
              : 'Далее'}
          </Button>
        </div>
      </div>
    </div>
  );
}
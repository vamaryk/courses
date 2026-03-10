import type {
  CodeTaskLanguage,
  CodeTaskTestCase,
} from '@/shared/codeTasks';

export interface CodeTaskTestResult {
  testId: string;
  hidden: boolean;
  passed: boolean;
  actualOutput: string;
  expectedOutputs: string[];
  error?: string;
}

const normalizeOutput = (value: string): string =>
  value.replace(/\r\n/g, '\n').trim();

const createJsWorker = () =>
  new Worker(
    new URL('./codeTasks-js.worker.ts', import.meta.url),
    { type: 'module' },
  );

const createPyWorker = () =>
  new Worker(new URL('./codeTasks-py.worker.ts', import.meta.url));

const runJsInWorker = (code: string, input: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const worker = createJsWorker();

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Таймаут выполнения JS-кода'));
    }, 3000);

    worker.onmessage = (event: MessageEvent) => {
      clearTimeout(timeout);
      const { ok, output, error } = event.data as {
        ok: boolean;
        output?: string;
        error?: string;
      };
      worker.terminate();
      if (ok) resolve(output ?? '');
      else reject(new Error(error || 'Неизвестная ошибка JS-раннера'));
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(`Ошибка в JS-воркере: ${err.message}`));
    };

    worker.postMessage({ code, input });
  });

const runPythonInWorker = (code: string, input: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const worker = createPyWorker();

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Таймаут выполнения Python-кода'));
    }, 5000);

    worker.onmessage = (event: MessageEvent) => {
      clearTimeout(timeout);
      const { ok, output, error } = event.data as {
        ok: boolean;
        output?: string;
        error?: string;
      };
      worker.terminate();
      if (ok) resolve(String(output ?? ''));
      else reject(new Error(error || 'Неизвестная ошибка Python-раннера'));
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(`Ошибка в Python-воркере: ${err.message}`));
    };

    worker.postMessage({ code, input });
  });

export const runCodeTaskTests = async (
  language: CodeTaskLanguage,
  code: string,
  testCases: CodeTaskTestCase[],
): Promise<CodeTaskTestResult[]> => {
  const exec = language === 'javascript' ? runJsInWorker : runPythonInWorker;

  const results: CodeTaskTestResult[] = [];

  // Последовательно выполняем тесты, чтобы не перегружать браузер
  for (const tc of testCases) {
    try {
      const raw = await exec(code, tc.input);
      const actual = normalizeOutput(raw);
      const passed =
        tc.expectedOutputs.length > 0 &&
        tc.expectedOutputs.some(
          (expected) => normalizeOutput(expected) === actual,
        );

      results.push({
        testId: tc.id,
        hidden: tc.hidden,
        passed,
        actualOutput: raw,
        expectedOutputs: tc.expectedOutputs,
      });
    } catch (err) {
      results.push({
        testId: tc.id,
        hidden: tc.hidden,
        passed: false,
        actualOutput: '',
        expectedOutputs: tc.expectedOutputs,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
};


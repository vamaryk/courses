import type { ContentBlock } from '@/shared/api/courses';

export type CodeTaskLanguage = 'javascript' | 'python' | 'cpp' | 'html_css';

export interface CodeTaskTestCase {
  id: string;
  input: string;
  expectedOutputs: string[];
  hidden: boolean;
}

export interface CodeTaskConfig {
  format: 'code_task_v1';
  language: CodeTaskLanguage;
  testCases: CodeTaskTestCase[];
  starterCode?: string;
  // HTML+CSS specific fields
  starterHtml?: string;
  starterCss?: string;
  expectedHtml?: string;
  expectedCss?: string;
}

export const LANGUAGE_LABELS: Record<CodeTaskLanguage, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++',
  html_css: 'HTML + CSS',
};

export const isCodeTaskBlock = (block: ContentBlock): boolean =>
  block.type === 'code_task';

export const parseCodeTaskConfig = (
  answer?: string | null,
): CodeTaskConfig | null => {
  if (!answer) return null;
  try {
    const parsed = JSON.parse(answer) as any;
    if (parsed?.format !== 'code_task_v1') return null;

    const language: CodeTaskLanguage =
      parsed.language === 'python' ? 'python' :
      parsed.language === 'cpp' ? 'cpp' :
      parsed.language === 'html_css' ? 'html_css' :
      'javascript';

    const rawCases: any[] = Array.isArray(parsed.testCases)
      ? parsed.testCases
      : [];

    const testCases: CodeTaskTestCase[] = rawCases.map((tc, index) => ({
      id: typeof tc.id === 'string' && tc.id.length > 0 ? tc.id : `tc-${index + 1}`,
      input: typeof tc.input === 'string' ? tc.input : '',
      expectedOutputs: Array.isArray(tc.expectedOutputs)
        ? tc.expectedOutputs
            .map((v: any) => (typeof v === 'string' ? v : ''))
            .filter((v: string) => v.trim().length > 0)
        : [],
      hidden: Boolean(tc.hidden),
    }));

    const starterCode =
      typeof parsed.starterCode === 'string' ? parsed.starterCode : undefined;

    const starterHtml =
      typeof parsed.starterHtml === 'string' ? parsed.starterHtml : undefined;
    const starterCss =
      typeof parsed.starterCss === 'string' ? parsed.starterCss : undefined;
    const expectedHtml =
      typeof parsed.expectedHtml === 'string' ? parsed.expectedHtml : undefined;
    const expectedCss =
      typeof parsed.expectedCss === 'string' ? parsed.expectedCss : undefined;

    return {
      format: 'code_task_v1',
      language,
      testCases,
      starterCode,
      starterHtml,
      starterCss,
      expectedHtml,
      expectedCss,
    };
  } catch {
    return null;
  }
};

export const serializeCodeTaskConfig = (config: CodeTaskConfig): string =>
  JSON.stringify(config);

export const createDefaultCodeTaskConfig = (language: CodeTaskLanguage = 'javascript'): CodeTaskConfig => {
  if (language === 'html_css') {
    return {
      format: 'code_task_v1',
      language: 'html_css',
      testCases: [],
      starterHtml: '<h1>Заголовок</h1>\n<p>Текст страницы</p>\n',
      starterCss: 'body {\n  font-family: sans-serif;\n}\nh1 {\n  color: #333;\n}\n',
    };
  }
  if (language === 'cpp') {
    return {
      format: 'code_task_v1',
      language: 'cpp',
      testCases: [],
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n  // TODO: напишите решение\n  cout << "Hello, World!" << endl;\n  return 0;\n}\n',
    };
  }
  return {
    format: 'code_task_v1',
    language,
    testCases: [
      {
        id: 'tc-1',
        input: '',
        expectedOutputs: [''],
        hidden: false,
      },
    ],
    starterCode: language === 'python'
      ? 'def solve(data: str) -> str:\n    # TODO: напишите решение\n    return data\n'
      : 'function solve(input) {\n  // TODO: напишите решение\n  return input;\n}\n',
  };
};


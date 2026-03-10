import type { ContentBlock } from '@/shared/api/courses';

export type CodeTaskLanguage = 'javascript' | 'python';

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
}

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
      parsed.language === 'python' ? 'python' : 'javascript';

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

    return {
      format: 'code_task_v1',
      language,
      testCases,
      starterCode,
    };
  } catch {
    return null;
  }
};

export const serializeCodeTaskConfig = (config: CodeTaskConfig): string =>
  JSON.stringify(config);

export const createDefaultCodeTaskConfig = (): CodeTaskConfig => ({
  format: 'code_task_v1',
  language: 'javascript',
  testCases: [
    {
      id: 'tc-1',
      input: '',
      expectedOutputs: [''],
      hidden: false,
    },
  ],
  starterCode:
    'function solve(input) {\n  // TODO: напишите решение\n  return input;\n}\n',
});


/** Минимальные типы без импорта из `courses.ts` (избегаем циклического импорта). */
export interface ContentStatsShape {
  lectures: { completed: number; total: number };
  assignments: { completed: number; total: number };
}

interface ChapterLike {
  subchapters?: Array<{
    content_blocks?: Array<{ type?: string }>;
  }>;
}

function asNonNegInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function countBlocksInChapters(chapters: ChapterLike[] | undefined): {
  theory: number;
  assignments: number;
} {
  let theory = 0;
  let assignments = 0;
  for (const ch of chapters ?? []) {
    for (const sub of ch.subchapters ?? []) {
      for (const block of sub.content_blocks ?? []) {
        const t = block.type;
        if (t === 'theory') theory += 1;
        else if (t === 'task' || t === 'test' || t === 'code_task') assignments += 1;
      }
    }
  }
  return { theory, assignments };
}

export function parseContentStatsPayload(raw: unknown): ContentStatsShape | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const lecturesRaw = o.lectures as Record<string, unknown> | undefined;
  const assignRaw = o.assignments as Record<string, unknown> | undefined;
  if (!lecturesRaw && !assignRaw) return null;

  return {
    lectures: {
      completed: asNonNegInt(lecturesRaw?.completed),
      total: asNonNegInt(lecturesRaw?.total),
    },
    assignments: {
      completed: asNonNegInt(assignRaw?.completed),
      total: asNonNegInt(assignRaw?.total),
    },
  };
}

export function mergeCourseContentStats(
  raw: unknown,
  chapters: ChapterLike[] | undefined,
): ContentStatsShape {
  const fromApi = parseContentStatsPayload(raw);

  const { theory, assignments } = countBlocksInChapters(chapters);

  const lecC = fromApi?.lectures.completed ?? 0;
  const lecT = Math.max(fromApi?.lectures.total ?? 0, theory);
  const asgC = fromApi?.assignments.completed ?? 0;
  const asgT = Math.max(fromApi?.assignments.total ?? 0, assignments);

  return {
    lectures: {
      completed: lecT === 0 ? 0 : Math.min(lecC, lecT),
      total: lecT,
    },
    assignments: {
      completed: asgT === 0 ? 0 : Math.min(asgC, asgT),
      total: asgT,
    },
  };
}

export function coerceCourseNumericFields(course: Record<string, unknown>): void {
  const setNum = (key: string) => {
    const v = course[key];
    if (v == null || v === '') return;
    const n = Number(v);
    if (Number.isFinite(n)) (course as Record<string, number | unknown>)[key] = n;
  };
  setNum('rating');
  setNum('ratingsCount');
  setNum('studentsCount');
  setNum('hoursTheory');
  setNum('hoursPractice');
  setNum('price');
  if (course.my_rating != null && course.my_rating !== '') {
    const n = Number(course.my_rating);
    if (Number.isFinite(n)) (course as { my_rating: number }).my_rating = n;
  }
}

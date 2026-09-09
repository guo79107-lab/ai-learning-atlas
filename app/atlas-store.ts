'use client';
import { useSyncExternalStore } from 'react';
export const TOTAL = 11;
export const number = (n: number) => String(n).padStart(2, '0');
export const stages = [
  {
    name: '认识 AI',
    slug: 'understand',
    start: 1,
    end: 3,
    note: '看懂它如何工作',
  },
  {
    name: '练习判断',
    slug: 'judge',
    start: 4,
    end: 8,
    note: '让答案经得起推敲',
  },
  {
    name: '学会合作',
    slug: 'collaborate',
    start: 9,
    end: 11,
    note: '把方法带回真实任务',
  },
];
export const stageFor = (id: number) => stages[id <= 3 ? 0 : id <= 8 ? 1 : 2];
export type Reflection = {
  problem: string;
  evidence: string;
  judgment: string;
  next: string;
  updatedAt: number;
};
export type QuizRecord = {
  attempts: number;
  first: { correct: boolean; at: number };
  latest: { correct: boolean; at: number };
};
export type DiscussionDraft = {
  mode: 'sample' | 'zhihu';
  title: string;
  author: string;
  url: string;
  excerpt: string;
  claim: string;
  evidence: string;
  counterpoint: string;
  revision: string;
  choice: number | null;
  completedAt: number | null;
};
export type Discussion = DiscussionDraft & { alternate?: DiscussionDraft };
export const emptyDiscussion = (): Discussion => ({
  mode: 'sample',
  title: '',
  author: '',
  url: '',
  excerpt: '',
  claim: '',
  evidence: '',
  counterpoint: '',
  revision: '',
  choice: null,
  completedAt: null,
});
export function discussionReady(d: Discussion): boolean {
  return (
    [d.claim, d.evidence, d.counterpoint, d.revision].every((v) => v.trim()) &&
    (d.mode === 'sample' || !!(d.title.trim() && d.excerpt.trim()))
  );
}
function cleanDiscussionDraft(raw: unknown): DiscussionDraft {
  const d = emptyDiscussion();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<Discussion>;
  for (const key of [
    'title',
    'author',
    'url',
    'excerpt',
    'claim',
    'evidence',
    'counterpoint',
    'revision',
  ] as const)
    d[key] =
      typeof r[key] === 'string'
        ? r[key].slice(
            0,
            key === 'excerpt' ? 3000 : key === 'url' ? 1000 : 1500,
          )
        : '';
  d.mode = r.mode === 'zhihu' ? 'zhihu' : 'sample';
  d.choice = r.choice === 0 || r.choice === 1 ? r.choice : null;
  d.completedAt =
    discussionReady(d) &&
    typeof r.completedAt === 'number' &&
    Number.isFinite(r.completedAt) &&
    r.completedAt > 0
      ? r.completedAt
      : null;
  return d;
}
function cleanDiscussion(raw: unknown): Discussion {
  const d: Discussion = cleanDiscussionDraft(raw);
  if (raw && typeof raw === 'object') {
    const alternate = (raw as Partial<Discussion>).alternate;
    if (alternate && typeof alternate === 'object' && alternate.mode !== d.mode)
      d.alternate = cleanDiscussionDraft(alternate);
  }
  return d;
}
export type Metrics = {
  timeByDay: Record<string, Record<string, number>>;
  quizzes: Record<string, QuizRecord>;
  quizByDay: Record<string, { attempts: number; correct: number }>;
  reflections: Record<string, Reflection>;
  discussions: Record<string, Discussion>;
};
const emptyMetrics = (): Metrics => ({
  timeByDay: {},
  quizzes: {},
  quizByDay: {},
  reflections: {},
  discussions: {},
});
export const localDay = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${number(d.getMonth() + 1)}-${number(d.getDate())}`;
};
export function splitLocalDays(start: number, end: number) {
  const parts: Array<{ day: string; ms: number }> = [];
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 86400000
  )
    return parts;
  let cursor = start;
  while (cursor < end) {
    const d = new Date(cursor),
      midnight = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate() + 1,
      ).getTime();
    const stop = Math.min(midnight, end);
    parts.push({ day: localDay(cursor), ms: stop - cursor });
    cursor = stop;
  }
  return parts;
}
function normalizeMetrics(raw: unknown): Metrics {
  const result = emptyMetrics();
  if (!raw || typeof raw !== 'object') return result;
  const m = raw as Partial<Metrics>;
  if (m.timeByDay && typeof m.timeByDay === 'object')
    for (const day of Object.keys(m.timeByDay).sort().slice(-400)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const row = m.timeByDay[day];
      if (!row || typeof row !== 'object') continue;
      const clean: Record<string, number> = {};
      for (let id = 1; id <= TOTAL; id++) {
        const v = row[id];
        if (Number.isFinite(v) && v > 0) clean[id] = Math.min(86400000, v);
      }
      if (Object.keys(clean).length) result.timeByDay[day] = clean;
    }
  const validAttempt = (a: unknown): a is QuizRecord['first'] =>
    !!a &&
    typeof a === 'object' &&
    typeof (a as QuizRecord['first']).correct === 'boolean' &&
    Number.isFinite((a as QuizRecord['first']).at);
  if (m.quizzes && typeof m.quizzes === 'object')
    for (let id = 1; id <= TOTAL; id++) {
      const q = m.quizzes[id];
      if (
        q &&
        Number.isInteger(q.attempts) &&
        q.attempts > 0 &&
        validAttempt(q.first) &&
        validAttempt(q.latest)
      )
        result.quizzes[id] = {
          attempts: q.attempts,
          first: { correct: q.first.correct, at: q.first.at },
          latest: { correct: q.latest.correct, at: q.latest.at },
        };
    }
  if (m.quizByDay && typeof m.quizByDay === 'object')
    for (const day of Object.keys(m.quizByDay).sort().slice(-400)) {
      const q = m.quizByDay[day];
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        q &&
        Number.isInteger(q.attempts) &&
        q.attempts > 0 &&
        Number.isInteger(q.correct) &&
        q.correct >= 0 &&
        q.correct <= q.attempts
      )
        result.quizByDay[day] = { attempts: q.attempts, correct: q.correct };
    }
  if (m.reflections && typeof m.reflections === 'object')
    for (let id = 1; id <= TOTAL; id++) {
      const r = m.reflections[id];
      if (!r || typeof r !== 'object') continue;
      result.reflections[id] = {
        problem: typeof r.problem === 'string' ? r.problem.slice(0, 1500) : '',
        evidence:
          typeof r.evidence === 'string' ? r.evidence.slice(0, 1500) : '',
        judgment:
          typeof r.judgment === 'string' ? r.judgment.slice(0, 1500) : '',
        next: typeof r.next === 'string' ? r.next.slice(0, 1500) : '',
        updatedAt: Number.isFinite(r.updatedAt) ? r.updatedAt : 0,
      };
    }
  if (m.discussions && typeof m.discussions === 'object')
    for (let id = 1; id <= TOTAL; id++)
      if (m.discussions[id] && typeof m.discussions[id] === 'object')
        result.discussions[id] = cleanDiscussion(m.discussions[id]);
  return result;
}
export type Progress = {
  completed: number[];
  notes: Record<string, string>;
  last: number;
  available: boolean;
  metrics: Metrics;
};
const EMPTY: Progress = {
  completed: [],
  notes: {},
  last: 1,
  available: true,
  metrics: emptyMetrics(),
};
const KEY = 'ai-learning-atlas:v1';
let snapshot: Progress | undefined;
const listeners = new Set<() => void>();
export function normalizeProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const v = raw as Partial<Progress>,
    notes: Record<string, string> = {};
  if (v.notes && typeof v.notes === 'object')
    for (let id = 1; id <= TOTAL; id++)
      if (typeof v.notes[id] === 'string')
        notes[id] = v.notes[id].slice(0, 3000);
  return {
    completed: Array.isArray(v.completed)
      ? [
          ...new Set(
            v.completed.filter(
              (n) => Number.isInteger(n) && n >= 1 && n <= TOTAL,
            ),
          ),
        ]
      : [],
    notes,
    last:
      typeof v.last === 'number' &&
      Number.isInteger(v.last) &&
      v.last >= 1 &&
      v.last <= TOTAL
        ? v.last
        : 1,
    available: true,
    metrics: normalizeMetrics(v.metrics),
  };
}
function getSnapshot() {
  if (typeof window === 'undefined') return EMPTY;
  if (!snapshot) {
    try {
      snapshot = normalizeProgress(
        JSON.parse(localStorage.getItem(KEY) || 'null'),
      );
    } catch {
      snapshot = { ...EMPTY, available: false };
    }
  }
  return snapshot;
}
export const readProgress = () => getSnapshot();
function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== null) return;
  try {
    snapshot = normalizeProgress(JSON.parse(event.newValue || 'null'));
  } catch {
    snapshot = EMPTY;
  }
  for (const notify of listeners) notify();
}
function subscribe(callback: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}
function update(change: (p: Progress) => Progress) {
  let base = getSnapshot();
  if (base.available) {
    try {
      base = normalizeProgress(JSON.parse(localStorage.getItem(KEY) || 'null'));
    } catch {
      /* Preserve this tab's work if storage is unavailable. */
    }
  }
  snapshot = change(base);
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
    snapshot = { ...snapshot, available: true };
  } catch {
    snapshot = { ...snapshot, available: false };
  }
  for (const notify of listeners) notify();
}
export const markComplete = (id: number) => {
  if (id >= 1 && id <= TOTAL)
    update((p) => ({
      ...p,
      completed: [...new Set([...p.completed, id])],
      last: Math.min(TOTAL, id + 1),
    }));
};
export const rememberChapter = (id: number) => {
  if (id >= 1 && id <= TOTAL) update((p) => ({ ...p, last: id }));
};
export const saveNote = (id: number, note: string) =>
  update((p) => ({ ...p, notes: { ...p.notes, [id]: note.slice(0, 3000) } }));
export const useProgress = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
function motionSubscribe(callback: () => void) {
  const m = window.matchMedia('(prefers-reduced-motion: reduce)');
  m.addEventListener('change', callback);
  return () => m.removeEventListener('change', callback);
}
export const useReducedMotion = () =>
  useSyncExternalStore(
    motionSubscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );

export const recordStudyTime = (id: number, start: number, end: number) => {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL || end - start > 15000)
    return;
  const parts = splitLocalDays(start, end);
  if (!parts.length) return;
  update((p) => {
    const timeByDay = { ...p.metrics.timeByDay };
    for (const part of parts)
      timeByDay[part.day] = {
        ...timeByDay[part.day],
        [id]: (timeByDay[part.day]?.[id] || 0) + part.ms,
      };
    return { ...p, metrics: { ...p.metrics, timeByDay } };
  });
};
export const recordQuiz = (id: number, correct: boolean, at = Date.now()) => {
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    id > TOTAL ||
    typeof correct !== 'boolean' ||
    !Number.isFinite(at)
  )
    return;
  update((p) => {
    const existing = p.metrics.quizzes[id],
      attempt = { correct, at },
      day = localDay(at),
      daily = p.metrics.quizByDay[day] || { attempts: 0, correct: 0 };
    return {
      ...p,
      metrics: {
        ...p.metrics,
        quizzes: {
          ...p.metrics.quizzes,
          [id]: {
            attempts: (existing?.attempts || 0) + 1,
            first: existing?.first || attempt,
            latest: attempt,
          },
        },
        quizByDay: {
          ...p.metrics.quizByDay,
          [day]: {
            attempts: daily.attempts + 1,
            correct: daily.correct + Number(correct),
          },
        },
      },
    };
  });
};
export const saveReflection = (
  id: number,
  field: keyof Omit<Reflection, 'updatedAt'>,
  value: string,
) => {
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    id > TOTAL ||
    !['problem', 'evidence', 'judgment', 'next'].includes(field)
  )
    return;
  update((p) => ({
    ...p,
    metrics: {
      ...p.metrics,
      reflections: {
        ...p.metrics.reflections,
        [id]: {
          ...(p.metrics.reflections[id] ?? {
            problem: '',
            evidence: '',
            judgment: '',
            next: '',
            updatedAt: 0,
          }),
          [field]: value.slice(0, 1500),
          updatedAt: Date.now(),
        },
      },
    },
  }));
};

export const saveDiscussion = (
  id: number,
  changes: Partial<Omit<Discussion, 'completedAt'>>,
) => {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL) return;
  update((p) => ({
    ...p,
    metrics: {
      ...p.metrics,
      discussions: {
        ...p.metrics.discussions,
        [id]: cleanDiscussion({
          ...(p.metrics.discussions[id] ?? emptyDiscussion()),
          ...changes,
          completedAt: null,
        }),
      },
    },
  }));
};
export const completeDiscussion = (id: number) => {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL) return;
  update((p) => {
    const d = p.metrics.discussions[id];
    if (!d || !discussionReady(d)) return p;
    return {
      ...p,
      metrics: {
        ...p.metrics,
        discussions: {
          ...p.metrics.discussions,
          [id]: { ...d, completedAt: Date.now() },
        },
      },
    };
  });
};

export const switchDiscussionMode = (id: number, mode: Discussion['mode']) => {
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    id > TOTAL ||
    !['sample', 'zhihu'].includes(mode)
  )
    return;
  update((p) => {
    const d = p.metrics.discussions[id] ?? emptyDiscussion();
    if (d.mode === mode) return p;
    const { alternate, ...previous } = d;
    const target =
      alternate?.mode === mode ? alternate : { ...emptyDiscussion(), mode };
    return {
      ...p,
      metrics: {
        ...p.metrics,
        discussions: {
          ...p.metrics.discussions,
          [id]: { ...target, alternate: previous },
        },
      },
    };
  });
};

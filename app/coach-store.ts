'use client';
import { useSyncExternalStore } from 'react';

export type CoachFeedback = {
  observation: string;
  quote: string;
  gap: string;
  reason: string;
  question: string;
  priority: 'evidence' | 'reasoning' | 'boundary' | 'context' | 'none';
  nextChapter: number;
  checks: {
    criterion: 'evidence' | 'reasoning' | 'boundary';
    status: 'shown' | 'missing' | 'uncertain';
    note: string;
  }[];
  card: { front: string; back: string };
};
export type CoachDraft = {
  mode: 'sample' | 'zhihu';
  title: string;
  author: string;
  excerpt: string;
  answer: string;
  question: string;
  previous: string;
};
export type CoachSession = {
  id: string;
  chapter: number;
  createdAt: number;
  model: string;
  goal: string;
  draft: CoachDraft;
  feedback: CoachFeedback;
  reviewStep: number;
  dueAt: number;
  recalled: { at: number; answer: string; remembered: boolean }[];
};
type CoachState = {
  goal: string;
  drafts: Record<string, CoachDraft>;
  sessions: CoachSession[];
  available: boolean;
};
export const emptyCoachDraft = (): CoachDraft => ({
  mode: 'sample',
  title: '',
  author: '',
  excerpt: '',
  answer: '',
  question: '',
  previous: '',
});
const EMPTY: CoachState = {
  goal: '',
  drafts: {},
  sessions: [],
  available: true,
};
const KEY = 'ai-learning-atlas:coach:v1';
const text = (v: unknown, max: number) =>
  typeof v === 'string' ? v.slice(0, max) : '';
const validChapter = (n: unknown): n is number =>
  Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 11;
export function cleanDraft(raw: unknown): CoachDraft {
  const d = raw && typeof raw === 'object' ? (raw as Partial<CoachDraft>) : {};
  return {
    mode: d.mode === 'zhihu' ? 'zhihu' : 'sample',
    title: text(d.title, 200),
    author: text(d.author, 100),
    excerpt: text(d.excerpt, 3000),
    answer: text(d.answer, 2000),
    question: text(d.question, 500),
    previous: text(d.previous, 2000),
  };
}
export function isFeedback(f: unknown, answer: string): f is CoachFeedback {
  if (!f || typeof f !== 'object') return false;
  const v = f as CoachFeedback;
  return (
    ['observation', 'quote', 'gap', 'reason', 'question'].every(
      (k) =>
        typeof v[k as keyof CoachFeedback] === 'string' &&
        (v[k as keyof CoachFeedback] as string).length > 0 &&
        (v[k as keyof CoachFeedback] as string).length <= 500,
    ) &&
    answer.includes(v.quote) &&
    validChapter(v.nextChapter) &&
    ['evidence', 'reasoning', 'boundary', 'context', 'none'].includes(
      v.priority,
    ) &&
    Array.isArray(v.checks) &&
    v.checks.length === 3 &&
    ['evidence', 'reasoning', 'boundary'].every(
      (c) =>
        v.checks.filter(
          (x) =>
            x &&
            x.criterion === c &&
            ['shown', 'missing', 'uncertain'].includes(x.status) &&
            typeof x.note === 'string' &&
            x.note.length <= 250,
        ).length === 1,
    ) &&
    !!v.card &&
    typeof v.card.front === 'string' &&
    v.card.front.length > 0 &&
    v.card.front.length <= 200 &&
    typeof v.card.back === 'string' &&
    v.card.back.length > 0 &&
    v.card.back.length <= 500
  );
}
export function normalizeCoach(raw: unknown): CoachState {
  const result: CoachState = { ...EMPTY, drafts: {}, sessions: [] };
  if (!raw || typeof raw !== 'object') return result;
  const r = raw as Partial<CoachState>;
  result.goal = text(r.goal, 200);
  if (r.drafts && typeof r.drafts === 'object')
    for (let id = 1; id <= 11; id++)
      if (r.drafts[id]) result.drafts[id] = cleanDraft(r.drafts[id]);
  if (Array.isArray(r.sessions))
    for (const s of r.sessions.slice(-100)) {
      if (
        !s ||
        !validChapter(s.chapter) ||
        typeof s.id !== 'string' ||
        s.id.length > 80 ||
        !Number.isFinite(s.createdAt) ||
        s.createdAt <= 0
      )
        continue;
      const draft = cleanDraft(s.draft);
      if (!isFeedback(s.feedback, draft.answer)) continue;
      if (result.sessions.some((x) => x.id === s.id)) continue;
      result.sessions.push({
        ...s,
        draft,
        goal: text(s.goal, 200),
        model: 'deepseek-v4-pro',
        reviewStep: [0, 1, 2, 3].includes(s.reviewStep) ? s.reviewStep : 0,
        dueAt:
          Number.isFinite(s.dueAt) && s.dueAt > 0
            ? s.dueAt
            : s.createdAt + 86400000,
        recalled: Array.isArray(s.recalled)
          ? s.recalled
              .filter(
                (x) =>
                  x &&
                  Number.isFinite(x.at) &&
                  typeof x.answer === 'string' &&
                  typeof x.remembered === 'boolean',
              )
              .slice(-12)
              .map((x) => ({ ...x, answer: x.answer.slice(0, 1000) }))
          : [],
      });
    }
  return result;
}
let snapshot: CoachState | undefined;
const listeners = new Set<() => void>();
const read = () =>
  normalizeCoach(JSON.parse(localStorage.getItem(KEY) || 'null'));
export function readCoach() {
  if (typeof window === 'undefined') return EMPTY;
  if (!snapshot) {
    try {
      snapshot = read();
    } catch {
      snapshot = { ...EMPTY, available: false };
    }
  }
  return snapshot;
}
function storage(e: StorageEvent) {
  if (e.key !== KEY && e.key !== null) return;
  try {
    snapshot = read();
  } catch {
    snapshot = { ...readCoach(), available: false };
  }
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  if (!listeners.size) window.addEventListener('storage', storage);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) window.removeEventListener('storage', storage);
  };
}
function update(change: (s: CoachState) => CoachState) {
  let base = readCoach();
  if (base.available) {
    try {
      base = read();
    } catch {
      /* Keep current work. */
    }
  }
  snapshot = normalizeCoach(change(base));
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    snapshot.available = false;
  }
  listeners.forEach((fn) => fn());
}
export const useCoach = () =>
  useSyncExternalStore(subscribe, readCoach, () => EMPTY);
export const saveCoachGoal = (goal: string) => update((s) => ({ ...s, goal }));
export const saveCoachDraft = (id: number, changes: Partial<CoachDraft>) => {
  if (validChapter(id))
    update((s) => ({
      ...s,
      drafts: {
        ...s.drafts,
        [id]: cleanDraft({
          ...(s.drafts[id] || emptyCoachDraft()),
          ...changes,
        }),
      },
    }));
};
export const addCoachSession = (session: CoachSession) =>
  update((s) => ({
    ...s,
    sessions: [...s.sessions.filter((x) => x.id !== session.id), session].slice(
      -100,
    ),
  }));
export function recallSession(
  id: string,
  answer: string,
  remembered: boolean,
  at = Date.now(),
) {
  if (answer.trim().length < 10 || !Number.isFinite(at)) return;
  update((s) => ({
    ...s,
    sessions: s.sessions.map((x) => {
      if (x.id !== id || x.reviewStep >= 3 || at < x.dueAt) return x;
      const step = remembered ? x.reviewStep + 1 : 0;
      return {
        ...x,
        reviewStep: step,
        dueAt: at + [1, 3, 7, 7][step] * 86400000,
        recalled: [
          ...x.recalled,
          { at, answer: answer.trim().slice(0, 1000), remembered },
        ],
      };
    }),
  }));
}
export function deferReview(id: string, at = Date.now()) {
  update((s) => ({
    ...s,
    sessions: s.sessions.map((x) =>
      x.id === id && x.reviewStep < 3 ? { ...x, dueAt: at + 86400000 } : x,
    ),
  }));
}

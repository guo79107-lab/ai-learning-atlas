import test from 'node:test';
import assert from 'node:assert/strict';
const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
};
const {
  normalizeProgress,
  recordQuiz,
  recordStudyTime,
  saveReflection,
  readProgress,
  localDay,
  splitLocalDays,
} = await import('../app/atlas-store.ts');
const { activeMilliseconds } = await import('../app/activity-clock.ts');
const key = 'ai-learning-atlas:v1';
const reset = (raw = {}) => storage.set(key, JSON.stringify(raw));
test('existing completion and notes survive without invented historical metrics', () => {
  const p = normalizeProgress({
    completed: [1, 4],
    notes: { 4: '保留原始发现' },
    last: 4,
  });
  assert.deepEqual(p.completed, [1, 4]);
  assert.equal(p.notes[4], '保留原始发现');
  assert.equal(p.last, 4);
  assert.deepEqual(p.metrics, {
    timeByDay: {},
    quizzes: {},
    quizByDay: {},
    reflections: {},
  });
});
test('first and latest judgment remain distinct across retries', () => {
  reset();
  const t = Date.now();
  recordQuiz(2, false, t);
  recordQuiz(2, true, t + 1000);
  const p = readProgress();
  assert.equal(p.metrics.quizzes[2].first.correct, false);
  assert.equal(p.metrics.quizzes[2].latest.correct, true);
  assert.equal(p.metrics.quizzes[2].attempts, 2);
  assert.deepEqual(p.metrics.quizByDay[localDay(t)], {
    attempts: 2,
    correct: 1,
  });
});
test('active clock excludes background, lost focus, idle and device sleep', () => {
  assert.equal(activeMilliseconds(0, 5000, 0, true), 5000);
  assert.equal(activeMilliseconds(0, 5000, 0, false), 0);
  assert.equal(activeMilliseconds(119000, 125000, 0, true), 1000);
  assert.equal(activeMilliseconds(125000, 130000, 0, true), 0);
  assert.equal(activeMilliseconds(0, 60000, 0, true), 0);
  assert.equal(activeMilliseconds(5000, 0, 0, true), 0);
});
test('real time crossing local midnight is split between dates', () => {
  const old = process.env.TZ;
  process.env.TZ = 'Asia/Shanghai';
  try {
    reset();
    const start = new Date(2026, 8, 9, 23, 59, 55).getTime();
    recordStudyTime(3, start, start + 10000);
    assert.equal(readProgress().metrics.timeByDay['2026-09-09'][3], 5000);
    assert.equal(readProgress().metrics.timeByDay['2026-09-10'][3], 5000);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test('DST clock change does not add an hour of study', () => {
  const old = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const parts = splitLocalDays(
      Date.parse('2026-11-01T01:59:55-04:00'),
      Date.parse('2026-11-01T01:00:05-05:00'),
    );
    assert.deepEqual(parts, [{ day: '2026-11-01', ms: 10000 }]);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test('new measurements merge with another tab’s existing notes and reflections', () => {
  reset({
    notes: { 5: '另一页的原笔记' },
    completed: [5],
    last: 5,
    metrics: {
      reflections: {
        5: {
          problem: '已有问题',
          evidence: '',
          judgment: '',
          next: '',
          updatedAt: 1,
        },
      },
    },
  });
  recordQuiz(6, false);
  saveReflection(5, 'evidence', '新增证据');
  const p = readProgress();
  assert.equal(p.notes[5], '另一页的原笔记');
  assert.equal(p.metrics.reflections[5].problem, '已有问题');
  assert.equal(p.metrics.reflections[5].evidence, '新增证据');
  assert.equal(p.metrics.quizzes[6].latest.correct, false);
});
test('invalid or non-finite metrics do not appear in charts', () => {
  const p = normalizeProgress({
    metrics: {
      timeByDay: {
        'not-a-date': { 1: 100 },
        '2026-09-09': { 1: -1, 2: NaN, 12: 100 },
      },
      quizzes: {
        12: {
          attempts: 1,
          first: { correct: true, at: 1 },
          latest: { correct: true, at: 1 },
        },
      },
    },
    completed: [1],
  });
  assert.deepEqual(p.metrics.timeByDay, {});
  assert.deepEqual(p.metrics.quizzes, {});
  assert.deepEqual(p.completed, [1]);
});

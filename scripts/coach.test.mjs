import test from 'node:test';
import assert from 'node:assert/strict';
const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
};
const {
  normalizeCoach,
  addCoachSession,
  readCoach,
  saveCoachDraft,
  recallSession,
  isFeedback,
} = await import('../app/coach-store.ts');
const answer = '我不能直接采用，因为还要核验出处，并检查适用条件。';
const feedback = {
  observation: '有条件意识',
  quote: '核验出处',
  gap: '写出核验动作',
  reason: '检查来源',
  question: '论文不存在怎么办？',
  priority: 'evidence',
  nextChapter: 6,
  checks: ['evidence', 'reasoning', 'boundary'].map((criterion) => ({
    criterion,
    status: 'missing',
    note: '需要具体说明',
  })),
  card: { front: '如何检查来源', back: '找原文并核对' },
};
const at = Date.UTC(2026, 8, 9, 10);
const session = {
  id: 'session-1',
  chapter: 4,
  createdAt: at,
  goal: '学习判断',
  model: 'deepseek-v4-pro',
  draft: { mode: 'sample', answer },
  feedback,
  reviewStep: 0,
  dueAt: at + 86400000,
  recalled: [],
};
test('old storage and malformed individual coaching records are preserved independently', () => {
  storage.set(
    'ai-learning-atlas:v1',
    JSON.stringify({ completed: [4], notes: { 4: '原笔记' } }),
  );
  const n = normalizeCoach({
    sessions: [session, { ...session, id: 'bad', feedback: {} }],
  });
  assert.equal(n.sessions.length, 1);
  addCoachSession(session);
  addCoachSession(session);
  assert.equal(readCoach().sessions.length, 1);
  assert.equal(
    JSON.parse(storage.get('ai-learning-atlas:v1')).notes[4],
    '原笔记',
  );
});
test('draft edits do not rewrite evidence of previously submitted answers', () => {
  saveCoachDraft(4, { answer: '新回答' });
  assert.equal(readCoach().sessions[0].draft.answer, answer);
  assert.equal(readCoach().drafts[4].answer, '新回答');
  assert.equal(
    isFeedback({ ...feedback, quote: '不存在的引用' }, answer),
    false,
  );
  assert.equal(isFeedback({ ...feedback, nextChapter: 12 }, answer), false);
});
test('review requires own recall and never advances merely by opening or double clicking', () => {
  recallSession('session-1', '这是足够长的自己的回答了', true, at);
  assert.equal(readCoach().sessions[0].reviewStep, 0);
  recallSession('session-1', '太短', true, at + 86400000);
  assert.equal(readCoach().sessions[0].reviewStep, 0);
  recallSession('session-1', '这是足够长的自己的回答了', true, at + 86400000);
  assert.equal(readCoach().sessions[0].reviewStep, 1);
  assert.equal(readCoach().sessions[0].dueAt, at + 4 * 86400000);
  recallSession('session-1', '这是足够长的自己的回答了', true, at + 86400000);
  assert.equal(readCoach().sessions[0].reviewStep, 1);
  recallSession(
    'session-1',
    '我还不能独立解释核验的步骤',
    false,
    at + 4 * 86400000,
  );
  assert.equal(readCoach().sessions[0].reviewStep, 0);
  assert.equal(readCoach().sessions[0].dueAt, at + 5 * 86400000);
});

test('new explanations preserve legacy feedback but reject malformed plan data', () => {
  assert.equal(isFeedback(feedback, answer), true);
  assert.equal(
    isFeedback({ ...feedback, steps: [], explanation: '回答' }, answer),
    false,
  );
  const modern = {
    ...feedback,
    steps: [1, 2, 3].map((n) => ({
      title: `步骤${n}`,
      detail: '结合问题说明核验办法',
    })),
    explanation: '先核对事实，再检查适用条件。',
  };
  assert.equal(isFeedback(modern, answer), true);
  assert.equal(
    normalizeCoach({
      sessions: [session, { ...session, id: 'modern', feedback: modern }],
    }).sessions.length,
    2,
  );
});
test('sharing keeps the learner input, sources and summary without silently republishing excerpts', async () => {
  const { coachingShare, zhihuUrl } = await import('../app/coach-utils.ts');
  assert.equal(zhihuUrl('https://www.zhihu.com.evil.test/question/1'), '');
  assert.equal(zhihuUrl('javascript:alert(1)'), '');
  const text = coachingShare(
    {
      ...session,
      draft: {
        ...session.draft,
        intent: 'question',
        mode: 'zhihu',
        title: '话题',
        author: '作者',
        sourceUrl: 'https://www.zhihu.com/question/123',
        excerpt: '不应全文搬运这段摘录',
      },
    },
    '学会判断',
  );
  assert.ok(text.includes(answer));
  assert.ok(text.includes('原作者：作者'));
  assert.ok(text.includes('https://www.zhihu.com/question/123'));
  assert.ok(!text.includes('不应全文搬运这段摘录'));
});

test('share preserves the actual transfer question and accepts official short answer URLs', async () => {
 const {coachingShare,zhihuUrl}=await import('../app/coach-utils.ts');
 assert.equal(zhihuUrl('https://www.zhihu.com/answer/123'),'https://www.zhihu.com/answer/123');
 const text=coachingShare({...session,draft:{...session.draft,intent:'judgment',question:'三个模型都给出同一个数字，还需要核验吗？'}},'学会判断');
 assert.ok(text.includes('三个模型都给出同一个数字，还需要核验吗？'));assert.ok(text.includes(answer));
});

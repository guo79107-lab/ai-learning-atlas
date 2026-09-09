import test from 'node:test';
import assert from 'node:assert/strict';
const storage = new Map();
let failWrites = false;
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem(k, v) {
    if (failWrites) throw new Error('Storage blocked');
    storage.set(k, v);
  },
};
const {
  readProgress,
  normalizeProgress,
  saveNote,
  markComplete,
  rememberChapter,
} = await import('../app/atlas-store.ts');
const key = 'ai-learning-atlas:v1';
test('preserves another tab’s saved work when this tab has a stale snapshot', () => {
  assert.deepEqual(readProgress().completed, []);
  storage.set(
    key,
    JSON.stringify({
      completed: [1],
      notes: { 1: '另一页写下的发现' },
      last: 2,
    }),
  );
  saveNote(2, '这页的新发现');
  const saved = JSON.parse(storage.get(key));
  assert.equal(saved.notes[1], '另一页写下的发现');
  assert.equal(saved.notes[2], '这页的新发现');
  assert.deepEqual(saved.completed, [1]);
});
test('completion is idempotent and reading updates the resume position', () => {
  markComplete(2);
  markComplete(2);
  rememberChapter(6);
  assert.deepEqual(readProgress().completed, [1, 2]);
  assert.equal(readProgress().last, 6);
});
test('blocked storage keeps this page’s note and reports the limitation', () => {
  failWrites = true;
  saveNote(3, '仍保留在当前页面');
  assert.equal(readProgress().notes[3], '仍保留在当前页面');
  assert.equal(readProgress().available, false);
  failWrites = false;
  saveNote(4, '存储恢复');
  assert.equal(JSON.parse(storage.get(key)).notes[3], '仍保留在当前页面');
  assert.equal(readProgress().available, true);
});
test('malformed persisted values cannot create nonexistent chapters', () => {
  const p = normalizeProgress({
    completed: [1, 1, 0, 12, '2', 3.5],
    notes: { 1: 5, 2: 'a'.repeat(3100) },
    last: 99,
  });
  assert.deepEqual(p.completed, [1]);
  assert.equal(p.last, 1);
  assert.equal(p.notes[1], undefined);
  assert.equal(p.notes[2].length, 3000);
});

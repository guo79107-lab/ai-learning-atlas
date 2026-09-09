'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  LoaderCircle,
  RotateCcw,
  BookmarkCheck,
} from 'lucide-react';
import Link from './site-link';
import { sitePath } from './site-config';
import lessons from './lessons.json';
import cases from './discussion-cases.json';
import {
  useCoach,
  saveCoachGoal,
  saveCoachDraft,
  emptyCoachDraft,
  addCoachSession,
  isFeedback,
  type CoachFeedback,
} from './coach-store';

export const criteriaNames = {
  evidence: '依据意识',
  reasoning: '推理过程',
  boundary: '适用边界',
};
const statusNames = {
  shown: '本次已体现',
  missing: '还可补充',
  uncertain: '信息不足',
};
export function FeedbackView({ feedback: f }: { feedback: CoachFeedback }) {
  return (
    <div className="coach-feedback">
      <div className="coach-feedback-heading">
        <Sparkles size={17} />
        <strong>从你的这句话开始</strong>
        <span>AI 反馈</span>
      </div>
      <blockquote>“{f.quote}”</blockquote>
      <p>{f.observation}</p>
      <div className="coach-gap">
        <span>这次先补好一点</span>
        <p>{f.gap}</p>
      </div>
      <div className="coach-checks">
        {f.checks.map((c) => (
          <details key={c.criterion}>
            <summary>
              <span>{criteriaNames[c.criterion]}</span>
              <span className={`coach-status ${c.status}`}>
                {statusNames[c.status]}
              </span>
            </summary>
            <p>{c.note}</p>
          </details>
        ))}
      </div>
      <p className="coach-fine">
        只评价这次表达；材料中的事实尚未独立核实，AI 也可能判断有误。
      </p>
    </div>
  );
}

export default function AICoach({ id }: { id: number }) {
  const state = useCoach();
  const draft = state.drafts[id] || emptyCoachDraft();
  const latest = state.sessions.filter((s) => s.chapter === id).at(-1);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const sample = cases[id - 1];
  const question =
    draft.question ||
    '你会采纳这段观点吗？说说你的判断、依据，以及它在什么条件下才成立。';
  const valid =
    draft.answer.trim().length >= 20 &&
    (draft.mode === 'sample' ||
      (draft.title.trim() && draft.excerpt.trim().length >= 20));
  const duplicate =
    latest &&
    JSON.stringify(latest.draft) === JSON.stringify(draft) &&
    latest.goal === state.goal;
  const submit = async () => {
    if (pending.current || !valid || duplicate) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    const timer = setTimeout(() => controller.abort(), 80000);
    const sent = { ...draft },
      goal = state.goal;
    try {
      const payload = { ...sent, chapter: id, goal };
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(payload)),
      );
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const requestId = [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
      ].join('-');
      const response = await fetch(sitePath('/api/coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          requestId,
        }),
        signal: controller.signal,
      });
      if (!response.headers.get('content-type')?.includes('application/json'))
        throw new Error('AI 服务暂时没有连接成功，输入已保留，请稍后重试。');
      const raw: unknown = await response.json();
      if (!raw || typeof raw !== 'object')
        throw new Error('服务暂时不可用，输入已保留。');
      const result = raw as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : '暂时没有收到反馈，请稍后重试。',
        );
      if (
        !isFeedback(result.feedback, sent.answer) ||
        typeof result.id !== 'string' ||
        typeof result.createdAt !== 'number' ||
        !Number.isFinite(result.createdAt)
      )
        throw new Error('反馈格式不完整，输入已保留，请重试。');
      if (controller.signal.aborted) return;
      addCoachSession({
        id: result.id,
        chapter: id,
        createdAt: result.createdAt,
        model: 'deepseek-v4-pro',
        goal,
        draft: sent,
        feedback: result.feedback,
        reviewStep: 0,
        dueAt: result.createdAt + 86400000,
        recalled: [],
      });
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'SyntaxError'
          ? '这次服务响应不完整，请稍后重试。'
          : e instanceof Error && e.name !== 'AbortError'
            ? e.message
            : '本次请求已停止，输入仍在，可以重新提交。',
      );
    } finally {
      clearTimeout(timer);
      pending.current = null;
      setBusy(false);
    }
  };
  return (
    <section className="ai-coach" aria-label="AI 学习陪练">
      <div className="coach-intro">
        <span className="coach-eyebrow">
          <Sparkles size={15} /> 想一想，再让 AI 帮一把
        </span>
        <h2>把自己的判断，练得更扎实。</h2>
        <p>写下理由，找到一个缺口，再用一次。每次留下一点真正属于你的理解。</p>
      </div>
      <fieldset className="coach-form" disabled={busy}>
        <label className="coach-field">
          <span>
            我想把 AI 用在哪里 <small>可选</small>
          </span>
          <input
            maxLength={200}
            value={state.goal}
            onChange={(e) => saveCoachGoal(e.target.value)}
            placeholder="例如：判断论文摘要是否可信，或写出可执行的工作方案"
          />
        </label>
        <div className="coach-material-tabs" aria-label="AI 陪练材料">
          <button
            type="button"
            aria-pressed={draft.mode === 'sample'}
            onClick={() =>
              saveCoachDraft(id, { mode: 'sample', question: '', previous: '' })
            }
          >
            本关情境
          </button>
          <button
            type="button"
            aria-pressed={draft.mode === 'zhihu'}
            onClick={() =>
              saveCoachDraft(id, { mode: 'zhihu', question: '', previous: '' })
            }
          >
            我的知乎摘录
          </button>
        </div>
        {draft.mode === 'sample' ? (
          <div className="coach-material">
            <small>原创教学案例 · 非知乎原文</small>
            <h3>{sample.title}</h3>
            <p>{sample.excerpt}</p>
          </div>
        ) : (
          <div className="coach-import">
            <label className="coach-field">
              <span>摘录标题</span>
              <input
                value={draft.title}
                maxLength={200}
                onChange={(e) => saveCoachDraft(id, { title: e.target.value })}
              />
            </label>
            <label className="coach-field">
              <span>
                作者署名 <small>可选</small>
              </span>
              <input
                value={draft.author}
                maxLength={100}
                onChange={(e) => saveCoachDraft(id, { author: e.target.value })}
              />
            </label>
            <label className="coach-field">
              <span>
                相关摘录 <small>20–3000 字</small>
              </span>
              <textarea
                value={draft.excerpt}
                maxLength={3000}
                onChange={(e) =>
                  saveCoachDraft(id, { excerpt: e.target.value })
                }
                placeholder="粘贴一段你想真正弄懂的知乎回答，保留上下文。"
              />
            </label>
          </div>
        )}
        <label className="coach-field coach-answer">
          <span>
            {draft.question ? '换个情境，再想一次' : '先写下你的判断'}
          </span>
          <p>{question}</p>
          <textarea
            id="coach-answer"
            value={draft.answer}
            maxLength={2000}
            onChange={(e) => saveCoachDraft(id, { answer: e.target.value })}
            placeholder="我会／不会直接采用，因为……我还需要核查……它可能不适用于……"
          />
          <small>
            {draft.answer.length} / 2000 · 至少 20 字，不用追求标准答案
          </small>
        </label>
      </fieldset>
      <div className="coach-submit-row">
        <button
          className="learn-primary"
          disabled={busy || !valid || !!duplicate}
          onClick={submit}
        >
          {busy ? (
            <>
              <LoaderCircle className="coach-spinner" size={17} />{' '}
              正在分析你的判断…
            </>
          ) : (
            <>
              {duplicate
                ? '这次回答已有反馈'
                : latest
                  ? '请 AI 看看这次的判断'
                  : '请 AI 帮我找一个缺口'}
              <ArrowRight size={17} />
            </>
          )}
        </button>
        {busy && (
          <button
            className="coach-text-button"
            onClick={() => pending.current?.abort()}
          >
            停止等待
          </button>
        )}
      </div>
      <p className="coach-fine">
        点击提交后，本次材料、目标与回答将发送给 DeepSeek V4
        Pro。请勿填写隐私信息。草稿与反馈保存在这台设备。
      </p>
      {!state.available && (
        <output className="coach-error">
          浏览器暂时无法保存。离开本页前，请先导出当前内容。
        </output>
      )}
      {!state.available && (
        <button
          className="learn-secondary"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(state, null, 2)], {
                type: 'application/json',
              }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AI陪练-当前内容.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          导出当前内容
        </button>
      )}
      {error && (
        <p role="alert" className="coach-error">
          {error}
        </p>
      )}
      {latest && (
        <div className="coach-result" aria-live="polite">
          <div className="coach-saved">
            <BookmarkCheck size={15} />
            {state.available ? '本次反馈已加入复盘' : '本次反馈暂存在页面'}
            <span>
              {new Date(latest.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <FeedbackView feedback={latest.feedback} />
          <div className="coach-next-question">
            <span>下一次，可以这样练</span>
            <p>{latest.feedback.question}</p>
          </div>
          <div className="coach-actions">
            <button
              className="learn-secondary"
              disabled={busy}
              onClick={() => {
                saveCoachDraft(id, {
                  ...latest.draft,
                  previous: latest.draft.answer,
                });
                document.getElementById('coach-answer')?.focus();
              }}
            >
              <RotateCcw size={15} /> 修改刚才的回答
            </button>
            <button
              className="learn-secondary"
              disabled={busy}
              onClick={() => {
                saveCoachDraft(id, {
                  ...latest.draft,
                  answer: '',
                  previous: '',
                  question: latest.feedback.question,
                });
                document.getElementById('coach-answer')?.focus();
              }}
            >
              试试新情境 <ArrowRight size={15} />
            </button>
          </div>
          <Link
            className="coach-recommendation"
            href={`/learn/${latest.feedback.nextChapter}?tab=coach`}
          >
            <span>
              <small>根据这次反馈，建议再看</small>
              <strong>
                第 {latest.feedback.nextChapter} 关 ·{' '}
                {lessons[latest.feedback.nextChapter - 1].shortTitle}
              </strong>
              <p>{latest.feedback.reason}</p>
            </span>
            <ArrowRight size={18} />
          </Link>
          <Link className="coach-review-link" href={`/review?chapter=${id}`}>
            看看我的复习卡与学习记录 <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}

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
import CoachShare from './coach-share';
import ZhihuImport from './zhihu-import';
import { zhihuUrl } from './coach-utils';
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
      {f.steps && (
        <section className="coach-explanation-plan" aria-label="三步理解">
          <div className="coach-section-label">
            先看解题方法 <span>1 → 2 → 3</span>
          </div>
          <ol>
            {f.steps.map((step, index) => (
              <li key={index}>
                <b>{index + 1}</b>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {f.explanation && (
        <section className="coach-plain-answer">
          <span className="coach-section-label">用容易理解的话说</span>
          <p>{f.explanation}</p>
        </section>
      )}
      <details className="coach-feedback-details">
        <summary>再看这次表达，可以怎样进步</summary>
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
      </details>
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
    draft.answer.trim().length >= (draft.intent === 'question' ? 10 : 20) &&
    (draft.mode === 'sample' ||
      (draft.title.trim() &&
        draft.excerpt.trim().length >= 20 &&
        (!draft.sourceUrl || zhihuUrl(draft.sourceUrl))));
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
      const payload = { ...sent, chapter: id, goal, responseVersion: 2 };
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
      if (response.status === 401) {
        location.assign(
          sitePath(
            '/access?next=' + encodeURIComponent(`/coach?chapter=${id}`),
          ),
        );
        return;
      }
      if (!response.ok)
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : '暂时没有收到反馈，请稍后重试。',
        );
      if (
        !isFeedback(result.feedback, sent.answer) ||
        !result.feedback.steps ||
        !result.feedback.explanation ||
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
    <section className="ai-coach" aria-label="AI 学习教练">
      <div className="coach-intro">
        <span className="coach-eyebrow">
          <Sparkles size={15} /> AI 教练 · 学习工作台
        </span>
        <h2>把没想通的，聊明白。</h2>
        <p>先拆方法，再解释答案。可以直接提问，也可以带着自己的判断来讨论。</p>
      </div>
      <fieldset className="coach-form" disabled={busy}>
        <div className="coach-intent-tabs" aria-label="教练方式">
          {[
            ['question', '提问解惑'],
            ['judgment', '检验判断'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={draft.intent === value}
              onClick={() =>
                saveCoachDraft(id, {
                  intent: value as 'question' | 'judgment',
                  question: '',
                  previous: '',
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
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
        <div className="coach-material-tabs" aria-label="AI 教练材料">
          <button
            type="button"
            aria-pressed={draft.mode === 'sample'}
            onClick={() =>
              saveCoachDraft(id, { mode: 'sample', question: '', previous: '' })
            }
          >
            本章情境
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
          <ZhihuImport id={id} draft={draft} />
        )}
        <label className="coach-field coach-answer">
          <span>
            {draft.intent === 'question'
              ? '你想弄明白什么'
              : draft.question
                ? '换个情境，再想一次'
                : '先写下你的判断'}
          </span>
          <p>
            {draft.intent === 'question'
              ? '说清你的疑问和使用场景，教练会给出三步说明与通俗解答。'
              : question}
          </p>
          <textarea
            id="coach-answer"
            value={draft.answer}
            maxLength={2000}
            onChange={(e) => saveCoachDraft(id, { answer: e.target.value })}
            placeholder={
              draft.intent === 'question'
                ? '例如：AI 给出了很有说服力的结论，我应该怎样判断它能不能用？'
                : '我会／不会直接采用，因为……我还需要核查……它可能不适用于……'
            }
          />
          <small>
            {draft.answer.length} / 2000 · 至少{' '}
            {draft.intent === 'question' ? 10 : 20} 字，背景越具体越有帮助
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
              教练正在整理三步讲解…
            </>
          ) : (
            <>
              {duplicate
                ? '这次回答已有反馈'
                : latest
                  ? '请教练看看这次的想法'
                  : '请教练解答'}
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
            a.download = 'AI教练-当前内容.json';
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
          <div className="coach-sent-question">
            <span>
              {latest.draft.intent === 'question' ? '本次提问' : '本次判断'}
            </span>
            <p>{latest.draft.answer}</p>
          </div>
          <FeedbackView feedback={latest.feedback} />
          <CoachShare session={latest} title={lessons[id - 1].shortTitle} />
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
              <RotateCcw size={15} /> 补充这次的问题或判断
            </button>
            <button
              className="learn-secondary"
              disabled={busy}
              onClick={() => {
                saveCoachDraft(id, {
                  ...latest.draft,
                  answer: '',
                  intent: 'judgment',
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
            href={`/learn/${latest.feedback.nextChapter}`}
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

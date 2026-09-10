'use client';
import { useState } from 'react';
import { ArrowRight, Bookmark, Download } from 'lucide-react';
import {
  useCoach,
  recallSession,
  deferReview,
  type CoachSession,
} from './coach-store';
import Link from './site-link';
import lessons from './lessons.json';
import { FeedbackView } from './ai-coach';

function RecallCard({
  session: s,
  now,
}: {
  session: CoachSession;
  now: number;
}) {
  const [answer, setAnswer] = useState(''),
    [open, setOpen] = useState(false);
  const due = s.reviewStep < 3 && now >= s.dueAt;
  return (
    <article className="coach-recall-card">
      <div className="coach-recall-meta">
        <span>
          第 {s.chapter} 关 · {lessons[s.chapter - 1].shortTitle}
        </span>
        <span>
          {s.reviewStep >= 3
            ? '本轮回顾完成'
            : due
              ? '今天可以回顾'
              : `${new Date(s.dueAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} 再回顾`}
        </span>
      </div>
      <h3>{s.feedback.card.front}</h3>
      {due && (
        <label className="coach-field">
          <span>先不看提示，用自己的话想一遍</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={1000}
            placeholder="记下你还记得的方法，至少 10 个字……"
          />
        </label>
      )}
      <button className="coach-text-button" onClick={() => setOpen(!open)}>
        {open ? '收起方法提示' : '翻开方法提示'}
      </button>
      {open && (
        <div className="coach-card-back">
          <p>{s.feedback.card.back}</p>
          <small>AI 生成的方法提示 · 结合课程核对</small>
        </div>
      )}
      {due && open && (
        <div className="coach-actions">
          <button
            className="learn-secondary"
            disabled={answer.trim().length < 10}
            onClick={() => recallSession(s.id, answer, true)}
          >
            我能独立说清了
          </button>
          <button
            className="learn-secondary"
            disabled={answer.trim().length < 10}
            onClick={() => recallSession(s.id, answer, false)}
          >
            还要再想一遍
          </button>
          <button
            className="coach-text-button"
            onClick={() => deferReview(s.id)}
          >
            改天再来
          </button>
        </div>
      )}
      <small className="coach-fine">
        {s.recalled.length} 次主动回顾 · 回顾进度 {s.reviewStep} / 3 ·
        自我反馈，不代表客观掌握度
      </small>
    </article>
  );
}
export default function CoachReview({
  now,
  selected,
}: {
  now: number | null;
  selected: number;
}) {
  const state = useCoach();
  const sessions = state.sessions;
  const latest = sessions.at(-1);
  const chapterSessions = sessions
    .filter((s) => s.chapter === selected)
    .slice(-5)
    .reverse();
  const cards = [...sessions].sort(
    (a, b) =>
      Number(a.reviewStep >= 3) - Number(b.reviewStep >= 3) ||
      a.dueAt - b.dueAt,
  );
  const dueCount =
    now === null
      ? 0
      : cards.filter((s) => s.reviewStep < 3 && s.dueAt <= now).length;
  const download = () => {
    const value = [
      '# 我的 AI 教练记录',
      `学习目标：${state.goal || '暂未填写'}`,
      ...sessions.flatMap((s) => [
        '',
        `## 第 ${s.chapter} 关 · ${new Date(s.createdAt).toLocaleString('zh-CN')}`,
        `材料：${s.draft.mode === 'sample' ? '原创教学案例' : s.draft.title + (s.draft.author ? ' · ' + s.draft.author : '')}`,
        s.draft.excerpt,
        `题目：${s.draft.question || '判断、依据与适用条件'}`,
        '### 我的回答',
        s.draft.answer,
        '### AI 反馈（未经独立事实核查）',
        s.feedback.observation,
        s.feedback.gap,
        ...s.feedback.checks.map((c) => `${c.criterion}: ${c.note}`),
        '### 复习卡',
        s.feedback.card.front,
        s.feedback.card.back,
        ...s.recalled.map(
          (r) =>
            `回顾 ${new Date(r.at).toLocaleString('zh-CN')}：${r.answer}（自评：${r.remembered ? '能说清' : '再想想'}）`,
        ),
      ]),
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([value], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = '我的AI陪练记录.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section
      className="review-panel coach-review"
      aria-label="AI 教练与复习计划"
    >
      <div className="coach-review-heading">
        <div>
          <p className="review-kicker">A LITTLE BETTER, EACH TIME</p>
          <h2>把一次理解，留给下一次。</h2>
          <p>
            {latest
              ? `${sessions.length} 次真实练习 · ${dueCount ? `${dueCount} 张卡片可以回顾` : '按照自己的节奏，慢慢来'}`
              : '先做一次 AI 教练，你的反馈、复习卡和下一步会出现在这里。'}
          </p>
        </div>
        {sessions.length > 0 && (
          <button className="learn-secondary" onClick={download}>
            <Download size={15} /> 导出陪练记录
          </button>
        )}
      </div>
      {!state.available && (
        <output className="coach-error">
          当前无法保存记录，请在离开前导出。
        </output>
      )}
      {latest ? (
        <>
          <div className="coach-return-plan">
            <Bookmark size={20} />
            <div>
              <span>下次回来，先解决这一点</span>
              <h3>{latest.feedback.gap}</h3>
              <p>{latest.feedback.reason}</p>
            </div>
            <Link
              href={`/coach?chapter=${latest.feedback.nextChapter}`}
              className="learn-secondary"
            >
              去第 {latest.feedback.nextChapter} 关 <ArrowRight size={16} />
            </Link>
          </div>
          <p className="coach-fine">
            首次练习后 1 天回顾；自评能说清后，分别间隔 3 天、7
            天再回顾。不熟悉就回到 1 天。只是学习安排，不作能力评分。
          </p>
          <div className="coach-cards">
            {cards.slice(0, 3).map((s) => (
              <RecallCard key={s.id} session={s} now={now ?? 0} />
            ))}
          </div>
          {cards.length > 3 && (
            <details className="coach-more">
              <summary>其余 {cards.length - 3} 张复习卡</summary>
              <div className="coach-cards">
                {cards.slice(3).map((s) => (
                  <RecallCard key={s.id} session={s} now={now ?? 0} />
                ))}
              </div>
            </details>
          )}
          <details className="coach-history">
            <summary>
              第 {selected} 关的陪练记录 ·{' '}
              {chapterSessions.length
                ? '最近 ' + chapterSessions.length + ' 次'
                : '尚未练习'}
            </summary>
            {chapterSessions.map((s) => (
              <article key={s.id}>
                <small>
                  {new Date(s.createdAt).toLocaleString('zh-CN')} ·{' '}
                  {s.draft.mode === 'sample' ? '原创情境' : s.draft.title}
                </small>
                <h3>当时，我是这样想的</h3>
                <p className="coach-own-answer">{s.draft.answer}</p>
                <FeedbackView feedback={s.feedback} />
              </article>
            ))}
          </details>
        </>
      ) : (
        <Link className="learn-primary" href={`/coach?chapter=${selected}`}>
          带着一个判断，开始 AI 教练 <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}

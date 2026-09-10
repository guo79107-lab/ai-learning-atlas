'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Compass,
  Pause,
  Play,
} from 'lucide-react';
import Link from './site-link';
import lessons from './lessons.json';
import { sitePath } from './site-config';
import { useCoach } from './coach-store';
import AICoach from './ai-coach';
import CoachAvatar from './coach-avatar';
export default function CoachWorkspace() {
  const [chapter, setChapter] = useState(4),
    [paused, setPaused] = useState(false);
  const state = useCoach();
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    const value = Number(new URLSearchParams(location.search).get('chapter'));
    if (Number.isInteger(value) && value >= 1 && value <= 11) setChapter(value);
  }, []);
  /* oxlint-enable react/react-compiler */
  const selectChapter = (id: number) => {
    setChapter(id);
    history.replaceState(null, '', sitePath(`/coach?chapter=${id}`));
  };
  return (
    <main className="coach-workspace learn-page">
      <header className="learn-header">
        <Link className="brand" href="/">
          AI 学习图鉴
        </Link>
        <Link className="back-link" href="/explore">
          <ArrowLeft size={15} />
          学习地图
        </Link>
        <Link className="review-entry" href={`/review?chapter=${chapter}`}>
          学习复盘
          <ArrowUpRight size={14} />
        </Link>
      </header>
      <div className="coach-workspace-grid">
        <aside className="coach-sidebar">
          <div className="coach-identity">
            <CoachAvatar paused={paused} />
            <div>
              <span>你的学习伙伴</span>
              <h1>AI 教练</h1>
            </div>
            <button
              onClick={() => setPaused(!paused)}
              aria-label={paused ? '播放教练表情' : '暂停教练表情'}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          </div>
          <p className="coach-sidebar-intro">
            带着疑问来，带着自己的理解离开。
          </p>
          <div className="coach-model-label">
            <span />
            DeepSeek V4 Pro
          </div>
          <label className="coach-chapter-label" htmlFor="coach-chapter">
            <BookOpen size={15} /> 这次想学什么
          </label>
          <select
            id="coach-chapter"
            value={chapter}
            onChange={(e) => selectChapter(Number(e.target.value))}
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {String(l.id).padStart(2, '0')} · {l.shortTitle}
              </option>
            ))}
          </select>
          <Link className="coach-course-link" href={`/learn/${chapter}`}>
            读一读本章内容
            <ArrowUpRight size={14} />
          </Link>
          <div className="coach-process">
            <span>一次有收获的对话</span>
            <ol>
              <li>
                <b>1</b>
                <div>
                  <strong>说清问题</strong>
                  <small>带上背景或知乎摘录</small>
                </div>
              </li>
              <li>
                <b>2</b>
                <div>
                  <strong>拆开理解</strong>
                  <small>三步说明，得到可用的解释</small>
                </div>
              </li>
              <li>
                <b>3</b>
                <div>
                  <strong>带走方法</strong>
                  <small>练一次、复盘，或分享收获</small>
                </div>
              </li>
            </ol>
          </div>
          <Link
            className="coach-learning-record"
            href={`/review?chapter=${chapter}`}
          >
            <Compass size={18} />
            <span>
              已留下 {state.sessions.length} 次学习记录
              <small>查看方法卡与复习安排</small>
            </span>
            <ArrowUpRight size={14} />
          </Link>
        </aside>
        <section className="coach-work-surface liquid-glass">
          <AICoach key={chapter} id={chapter} />
        </section>
      </div>
    </main>
  );
}

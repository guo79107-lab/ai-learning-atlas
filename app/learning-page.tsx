'use client';
import { sitePath } from './site-config';
import { useEffect, useState } from 'react';
import Link from './site-link';
import DiscussionLab from './discussion-lab';
import { useLearningActivity } from './learning-activity';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  NotebookPen,
  RotateCcw,
} from 'lucide-react';
import lessons from './lessons.json';
import {
  markComplete,
  number,
  rememberChapter,
  saveNote,
  recordQuiz,
  stageFor,
  useProgress,
} from './atlas-store';
export default function LearningPage({ id }: { id: number }) {
  const tracking = useLearningActivity(id);
  const lesson = lessons[id - 1],
    progress = useProgress();
  const [page, setPage] = useState(0),
    [choice, setChoice] = useState<number | null>(null),
    [checked, setChecked] = useState(false);
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    rememberChapter(id);
    // The review desk can return directly to this chapter's discussion exercise.
    if (new URLSearchParams(location.search).get('tab') === 'discussion')
      setPage(2);
    if (new URLSearchParams(location.search).get('tab') === 'coach')
      location.replace(sitePath(`/coach?chapter=${id}`));
  }, [id]);
  /* oxlint-enable react/react-compiler */
  const done = progress.completed.includes(id),
    correct = choice === lesson.answer;
  return (
    <main className="learn-page">
      <header className="learn-header">
        <Link className="brand" href="/">
          AI 学习图鉴
        </Link>
        <Link className="back-link" href={`/explore?chapter=${id}`}>
          <ArrowLeft size={15} /> 返回学习地图
        </Link>
        <Link href={`/review?chapter=${id}`} className="review-entry">
          学习复盘 <ArrowUpRight size={14} />
        </Link>
      </header>
      <nav className="lesson-breadcrumb" aria-label="当前位置">
        <Link href="/">首页</Link>
        <span>/</span>
        <Link href={`/explore?stage=${stageFor(id).slug}`}>
          {stageFor(id).name}
        </Link>
        <span>/</span>
        <span>{lesson.shortTitle}</span>
      </nav>
      <article className="learning-book liquid-glass">
        <aside className="book-art">
          <div className="book-art-meta">
            <span>THE LEARNING ATLAS</span>
            <span>{number(id)} / 11</span>
          </div>
          <a
            href={sitePath(`/posters/${number(id)}.webp`)}
            target="_blank"
            rel="noreferrer"
          >
            <Image
              unoptimized
              src={sitePath(`/posters/${number(id)}.webp`)}
              width={1086}
              height={1448}
              alt={lesson.title}
              priority
            />
          </a>
          <a
            className="enlarge-link"
            href={sitePath(`/posters/${number(id)}.webp`)}
            target="_blank"
            rel="noreferrer"
          >
            查看完整海报 <ArrowUpRight size={14} />
          </a>
        </aside>
        <section className="book-page">
          <div className="lesson-meta">
            <span>
              第 {number(id)} 关 · {stageFor(id).name}
            </span>
            <span className="study-clock-status">
              {tracking ? '正在记录活跃时长' : '活跃计时已暂停'}
            </span>
            {done && (
              <span>
                <Check size={14} /> 已探索
              </span>
            )}
          </div>
          <h1>{lesson.title}</h1>
          <p className="lesson-intro">{lesson.intro}</p>
          <a
            className="lesson-poster-mobile"
            href={sitePath(`/posters/${number(id)}.webp`)}
            target="_blank"
            rel="noreferrer"
          >
            查看本章图鉴
            <ArrowUpRight size={14} />
          </a>
          <nav className="page-tabs lesson-step-tabs" aria-label="章节内页">
            {[
              ['读一页', '理解关键概念'],
              ['试一试', '检验你的判断'],
              ['观点练习', '把知识用起来'],
            ].map(([title, description], index) => (
              <button
                key={title}
                className="liquid-glass"
                aria-pressed={page === index}
                aria-controls="lesson-active-page"
                onClick={() => setPage(index)}
              >
                <span className="lesson-step-number">0{index + 1}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                {page === index && (
                  <span className="lesson-step-dot" aria-label="当前页面" />
                )}
              </button>
            ))}
          </nav>
          <div className="turning-page" id="lesson-active-page" key={page}>
            {page === 0 ? (
              <>
                <ol className="takeaways">
                  {lesson.takeaways.map((t, i) => (
                    <li key={t}>
                      <span>{number(i + 1)}</span>
                      <p>{t}</p>
                    </li>
                  ))}
                </ol>
                <div className="source-note">
                  <p>
                    依据 Claude Academy
                    课程独立中文整理。产品设置与计费方式，以所用工具的说明为准。
                  </p>
                </div>
                <button className="learn-primary" onClick={() => setPage(1)}>
                  翻到练习页 <ArrowRight size={18} />
                </button>
              </>
            ) : page === 2 ? (
              <DiscussionLab id={id} />
            ) : (
              <>
                <fieldset className="quiz">
                  <legend>{lesson.question}</legend>
                  {lesson.options.map((text, i) => (
                    <label key={text} className={choice === i ? 'chosen' : ''}>
                      <input
                        type="radio"
                        name={`answer-${id}`}
                        checked={choice === i}
                        onChange={() => {
                          setChoice(i);
                          setChecked(false);
                        }}
                      />
                      <span>{text}</span>
                    </label>
                  ))}
                </fieldset>
                {!checked ? (
                  <button
                    className="learn-primary"
                    disabled={choice === null}
                    onClick={() => {
                      setChecked(true);
                      recordQuiz(id, correct);
                      if (correct) markComplete(id);
                    }}
                  >
                    看看我的判断 <ArrowRight size={17} />
                  </button>
                ) : (
                  <output
                    className={`answer-feedback ${correct ? 'success' : ''}`}
                    aria-live="polite"
                  >
                    <h2>
                      {correct
                        ? '又弄懂了一点，继续保持好奇。'
                        : '换个角度，再想一想。'}
                    </h2>
                    <p>{lesson.explanation}</p>
                    {!correct && (
                      <button
                        onClick={() => {
                          setChecked(false);
                          setChoice(null);
                        }}
                      >
                        再试一次 <RotateCcw size={14} />
                      </button>
                    )}
                  </output>
                )}
                <details className="practice-note">
                  <summary>
                    <NotebookPen size={16} />
                    把这个方法用一次
                  </summary>
                  <p>{lesson.practice}</p>
                  <label htmlFor="learning-note">留下一点自己的发现</label>
                  <textarea
                    id="learning-note"
                    maxLength={3000}
                    value={progress.notes[id] || ''}
                    onChange={(e) => saveNote(id, e.target.value)}
                    placeholder="记下一个发现，或下次想尝试的做法……"
                  />
                  <small>
                    {progress.available
                      ? '自动保存在这台设备，不会上传'
                      : '当前无法保存，笔记暂留在本次页面'}
                  </small>
                </details>
                {checked && correct && (
                  <button
                    className="learn-secondary"
                    onClick={() => setPage(2)}
                  >
                    把方法用在一段观点里 <ArrowRight size={16} />
                  </button>
                )}
                {checked && correct && (
                  <Link
                    className="learn-primary"
                    href={id === 11 ? '/explore' : `/learn/${id + 1}`}
                  >
                    {id === 11 ? '带着收获，返回学习地图' : '走进下一关'}
                    <ArrowRight size={18} />
                  </Link>
                )}
              </>
            )}
          </div>
          <Link
            className="lesson-coach-entry liquid-glass"
            href={`/coach?chapter=${id}`}
          >
            <span>
              <strong>遇到没想通的地方？</strong>
              <small>让 AI 教练拆成三步，陪你弄明白</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <footer className="book-page-footer">
            <Link href={`/review?chapter=${id}`}>
              拆解思路，做一次复盘 <ArrowUpRight size={13} />
            </Link>
            <span>0{page + 1} / 03</span>
          </footer>
        </section>
      </article>
      <nav className="learn-pagination" aria-label="章节导航">
        {id > 1 ? (
          <Link href={`/learn/${id - 1}`}>
            <ArrowLeft size={15} /> 上一章
          </Link>
        ) : (
          <span>探索从这里开始</span>
        )}
        <span>{number(id)} / 11</span>
        {id < 11 ? (
          <Link href={`/learn/${id + 1}`}>
            下一章 <ArrowRight size={15} />
          </Link>
        ) : (
          <Link href="/explore">
            返回学习地图 <ArrowRight size={15} />
          </Link>
        )}
      </nav>
    </main>
  );
}

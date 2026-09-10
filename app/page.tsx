'use client';
import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
} from 'lucide-react';
import Link from './site-link';
import { number, stages, useProgress } from './atlas-store';
import { sitePath } from './site-config';
import lessons from './lessons.json';

const colors = [
  '#cdc6b4',
  '#182b3e',
  '#718071',
  '#504236',
  '#213b30',
  '#333637',
  '#9a6552',
  '#93998c',
  '#c3bb9e',
  '#172d63',
  '#51433c',
];
const slots = Array.from({ length: 22 }, (_, i) => i % 11);
function Book({
  id,
  slot,
  group,
}: {
  id: number;
  slot: number;
  group: number;
}) {
  const pages = 16 + (id % 7) * 2,
    depth = 1.1 * (pages + 1);
  const duplicate = group !== 0 || slot >= 11;
  return (
    <div className="folio-book-wrap" style={{ zIndex: 66 - group * 22 - slot }}>
      <Link
        href="/explore"
        className="folio-book"
        tabIndex={duplicate ? -1 : 0}
        aria-hidden={duplicate}
        aria-label={`${lessons[id].shortTitle} · 前往星球选课`}
        style={
          {
            '--folio-color': colors[id],
            '--folio-depth': `${depth}px`,
          } as CSSProperties
        }
      >
        <span
          className="folio-hinge"
          style={{ width: depth + 1 }}
          aria-hidden="true"
        />
        <span
          className="folio-layer folio-back"
          style={{ transform: `translateX(${depth}px) skewY(30deg)` }}
          aria-hidden="true"
        />
        {Array.from({ length: pages }, (_, p) => (
          <span
            key={p}
            className="folio-layer folio-paper"
            style={{
              transform: `translateX(${1.1 * (p + 1)}px) skewY(30deg)`,
              zIndex: 1 + pages - p,
              filter: `brightness(${1 - ((p + 1) / pages) * 0.06})`,
            }}
            aria-hidden="true"
          />
        ))}
        <span
          className="folio-layer folio-front"
          style={{
            backgroundImage: `url(${sitePath(`/posters/${number(id + 1)}-card.webp`)})`,
          }}
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
export default function Home() {
  const [paused, setPaused] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);
  const progress = useProgress();
  return (
    <main
      className={`folio-home folio-home--collage ${booksOpen ? 'has-books' : ''}`}
    >
      <header className="folio-nav">
        <Link href="/explore" className="folio-brand">
          <BookOpen size={25} />
          <span>AI 学习图鉴</span>
        </Link>
        <nav aria-label="学习分类">
          {stages.map((s) => (
            <Link key={s.slug} href="/explore">
              {s.name}
            </Link>
          ))}
        </nav>
        <Link className="folio-nav-cta" href="/explore">
          {progress.completed.length ? '继续探索' : '从第一关开始'}{' '}
          <ArrowRight size={15} />
        </Link>
      </header>
      <section className="collage-hero" aria-labelledby="homepage-title">
        <h1 id="homepage-title" className="sr-only">会用 AI，更会判断 · AI 学习图鉴</h1>
        <Link href="/explore" className="collage-poster" aria-label="会用 AI，更会判断：进入星球学习地图">
          <Image
            src={sitePath('/media/learning-collage-hero.webp')}
            alt="旧纸与书籍拼贴海报：会用 AI，更会判断。来知乎，把好问题学成真本事。11 个主题，从理解到应用：读懂知识、练习判断、AI 教练。"
            width={1672}
            height={941}
            priority
            unoptimized
            fetchPriority="high"
          />
        </Link>
        <div className="collage-entry-row">
          <div className="collage-actions">
            <Link className="folio-entry liquid-glass" href="/explore">
              开始闯关，把 AI 用出价值 <span><ArrowRight size={20} /></span>
            </Link>
            <button
              type="button"
              className="folio-books-toggle liquid-glass"
              aria-expanded={booksOpen}
              aria-controls="homepage-learning-books"
              onClick={() => setBooksOpen((open) => !open)}
            >
              <BookOpen size={16} />
              <span>{booksOpen ? '收起学习图鉴' : '展开 11 本学习图鉴'}</span>
              {booksOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          <p className="collage-caption">有的人用ai只能问出10块钱的答案，而有的人能问出几千甚至几万的答案。<span>从拆问题、给背景、核验答案开始，练出自己的判断。</span></p>
        </div>
      </section>
      <div id="homepage-learning-books" hidden={!booksOpen}>
        {booksOpen && (
          <div
            className={`folio-marquee ${paused ? 'is-paused' : ''}`}
            aria-label="11本AI学习图鉴"
          >
            <div className="folio-mask">
              <div className="folio-track">
                {[0, 1, 2].map((group) => (
                  <div className="folio-group" key={group}>
                    {slots.map((id, slot) => (
                      <Book key={slot} id={id} slot={slot} group={group} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <footer className="folio-footer">
        <span>11 本图鉴 · 从一个真实问题开始</span>
        {booksOpen && (
          <button
            className="liquid-glass"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? '继续书籍流水线' : '暂停书籍流水线'}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            <span>{paused ? '继续流动' : '停留片刻'}</span>
          </button>
        )}
      </footer>
    </main>
  );
}

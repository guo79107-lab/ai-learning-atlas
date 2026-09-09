'use client';
import { sitePath } from './site-config';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  Layers3,
  Pause,
  Play,
} from 'lucide-react';
import { number, stages, useProgress, useReducedMotion } from './atlas-store';
import lessons from './lessons.json';

const VIDEO = sitePath('/curiosity.mp4');
// Measured visible cyan-ring expansion, sampled at 0.25 s; driven by the video clock.
const ringFrames = [
  0.0, 0.015256, 0.029528, 0.044783, 0.063484, 0.083661, 0.102854, 0.123524,
  0.146654, 0.166831, 0.181102, 0.195866, 0.218012, 0.24311, 0.261319, 0.273622,
  0.288878, 0.309055, 0.331693, 0.354331, 0.371063, 0.379429, 0.386319,
  0.403051, 0.433563, 0.467028, 0.494094, 0.519685, 0.550689, 0.587106,
  0.627461, 0.672244, 0.717028, 0.751476, 0.775591, 0.806102, 0.854331,
  0.907972, 0.948327, 0.975394, 1.0,
];
function ringScale(time: number) {
  const t = Math.min(40, Math.max(0, time * 4));
  const i = Math.floor(t);
  return (
    0.76 +
    0.3 *
      (ringFrames[i] +
        ((ringFrames[Math.min(i + 1, 40)] ?? 1) - ringFrames[i]) * (t - i))
  );
}

export default function Home() {
  const progress = useProgress(),
    reduced = useReducedMotion();
  const [paused, setPaused] = useState(false),
    [blocked, setBlocked] = useState(false),
    [cycle, setCycle] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null),
    orbitRef = useRef<HTMLDivElement>(null);
  const fadeFrameRef = useRef(0),
    syncFrameRef = useRef(0),
    restartRef = useRef<ReturnType<typeof setTimeout> | null>(null),
    fadingOutRef = useRef(false);
  const opacityRef = useRef(0);
  const next = progress.completed.length === 11 ? 1 : progress.last;
  const featured = [cycle + 1, ((cycle + 5) % 11) + 1];
  useEffect(() => {
    const video = videoRef.current,
      orbit = orbitRef.current;
    if (!video || !orbit) return;
    const preferStatic = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const setOpacity = (v: number) => {
      opacityRef.current = v;
      video.style.opacity = String(v);
      orbit.style.opacity = String(v);
    };
    const playbackFailed = () => {
      cancelAnimationFrame(fadeFrameRef.current);
      setOpacity(1);
      setBlocked(true);
    };
    const fade = (target: number) => {
      cancelAnimationFrame(fadeFrameRef.current);
      const from = opacityRef.current,
        start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 500);
        setOpacity(from + (target - from) * p);
        if (p < 1) fadeFrameRef.current = requestAnimationFrame(tick);
      };
      fadeFrameRef.current = requestAnimationFrame(tick);
    };
    const sync = () => {
      orbit.style.setProperty(
        '--ring-scale',
        String(preferStatic ? 1 : ringScale(video.currentTime)),
      );
      if (
        !video.paused &&
        !video.ended &&
        Number.isFinite(video.duration) &&
        video.duration - video.currentTime <= 0.55 &&
        !fadingOutRef.current
      ) {
        fadingOutRef.current = true;
        fade(0);
      }
      syncFrameRef.current = requestAnimationFrame(sync);
    };
    const start = () => {
      fadingOutRef.current = false;
      fade(1);
      setBlocked(false);
    };
    const ended = () => {
      cancelAnimationFrame(fadeFrameRef.current);
      setOpacity(0);
      if (!orbit.contains(document.activeElement) && !orbit.matches(':hover'))
        setCycle((c) => (c + 1) % 11);
      restartRef.current = setTimeout(() => {
        if (paused || preferStatic) return;
        video.currentTime = 0;
        fadingOutRef.current = false;
        void video.play().catch(playbackFailed);
      }, 100);
    };
    const timeUpdate = () => {
      if (video.duration - video.currentTime <= 0.55 && !fadingOutRef.current) {
        fadingOutRef.current = true;
        fade(0);
      }
    };
    const hide = () => {
      if (document.hidden) {
        video.pause();
        cancelAnimationFrame(fadeFrameRef.current);
      } else if (!paused && !preferStatic)
        void video.play().catch(playbackFailed);
    };
    video.addEventListener('playing', start);
    video.addEventListener('ended', ended);
    video.addEventListener('timeupdate', timeUpdate);
    document.addEventListener('visibilitychange', hide);
    if (paused || preferStatic) {
      video.pause();
      setOpacity(1);
      orbit.style.setProperty(
        '--ring-scale',
        String(preferStatic ? 1 : ringScale(video.currentTime)),
      );
    } else
      void video
        .play()
        .then(() => {
          if (!video.paused && !fadingOutRef.current) start();
        })
        .catch(playbackFailed);
    syncFrameRef.current = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(fadeFrameRef.current);
      cancelAnimationFrame(syncFrameRef.current);
      if (restartRef.current) clearTimeout(restartRef.current);
      video.removeEventListener('playing', start);
      video.removeEventListener('ended', ended);
      video.removeEventListener('timeupdate', timeUpdate);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [paused, reduced]);
  return (
    <main className="cinema-home">
      <video
        ref={videoRef}
        className="hero-video"
        src={VIDEO}
        poster={sitePath('/backgrounds/video-still.webp')}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="cinema-shade" aria-hidden="true" />
      <header className="hero-nav liquid-glass">
        <Link href="/" className="brand">
          AI 学习图鉴
        </Link>
        <nav aria-label="学习分类">
          {stages.map((s) => (
            <Link key={s.slug} href={`/explore?stage=${s.slug}`}>
              {s.name}
            </Link>
          ))}
        </nav>
        <Link className="nav-progress" href="/explore">
          {progress.completed.length} / 11 已探索
        </Link>
        <Link className="glass-pill liquid-glass" href={`/learn/${next}`}>
          {progress.completed.length ? '继续学习' : '从第一关开始'}
        </Link>
      </header>
      <section className="hero-copy">
        <p className="overline">THE LEARNING ATLAS</p>
        <h1 style={{ fontFamily: "'Instrument Serif', 'Songti SC', serif" }}>
          让好奇心，<em>带你向前。</em>
        </h1>
        <p
          className="hero-english"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          A little curiosity. A new possibility.
        </p>
        <Link className="hero-entry liquid-glass" href="/explore">
          <span>打开你的 AI 学习图鉴</span>
          <span className="entry-arrow">
            <ArrowRight size={21} />
          </span>
        </Link>
        <p className="hero-subtitle">
          11 个值得追问的问题，11 次小小的进步。
          <br />
          不必一次学会所有东西，先翻开感兴趣的那一页。
        </p>
      </section>
      <div className="halo-posters" ref={orbitRef} aria-label="学习海报预览">
        {featured.map((id, i) => (
          <Link
            className={`halo-card halo-card-${i}`}
            href={`/learn/${id}`}
            key={id}
          >
            <Image
              unoptimized
              src={sitePath(`/posters/${number(id)}-card.webp`)}
              width={540}
              height={720}
              alt={lessons[id - 1].title}
              priority
            />
            <span>
              <b>{number(id)}</b>
              {lessons[id - 1].shortTitle}
              <ArrowUpRight size={14} />
            </span>
          </Link>
        ))}
      </div>
      <footer className="hero-footer">
        <div className="hero-footer-links">
          <Link
            className="liquid-glass icon-link"
            href="/explore"
            aria-label="浏览全部11章"
          >
            <Layers3 size={20} />
          </Link>
          <Link
            className="liquid-glass icon-link"
            href={`/learn/${next}`}
            aria-label="开始阅读"
          >
            <BookOpen size={20} />
          </Link>
          <a
            className="liquid-glass icon-link"
            href="https://academy.claude.com/collections/ai-fluency"
            target="_blank"
            rel="noreferrer"
            aria-label="查看学习资料来源"
          >
            <Compass size={20} />
          </a>
        </div>
        <button
          className="video-control liquid-glass"
          onClick={() => {
            if (blocked) {
              setBlocked(false);
              void videoRef.current?.play().catch(() => setBlocked(true));
            } else setPaused(!paused);
          }}
          aria-label={paused || blocked ? '播放背景视频' : '暂停背景视频'}
          disabled={reduced}
        >
          {paused || blocked || reduced ? (
            <Play size={14} />
          ) : (
            <Pause size={14} />
          )}
          <span>
            {reduced
              ? '静态浏览'
              : blocked
                ? '播放背景'
                : paused
                  ? '继续光影'
                  : '暂停光影'}
          </span>
        </button>
      </footer>
    </main>
  );
}

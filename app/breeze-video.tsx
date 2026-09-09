'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { sitePath } from './site-config';

export default function BreezeVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const wanted = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const poster = sitePath('/media/sunny-reading-poster.png');

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    wanted.current = !motion.matches;
    const sync = () => {
      if (wanted.current && !document.hidden) {
        void element.play().catch(() => setPlaying(false));
      } else element.pause();
    };
    const preferenceChanged = () => {
      wanted.current = !motion.matches;
      sync();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', preferenceChanged);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', preferenceChanged);
      element.pause();
    };
  }, []);

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    wanted.current = !playing;
    if (wanted.current) void element.play().catch(() => setPlaying(false));
    else element.pause();
  };

  return (
    <>
      <div className="folio-film" style={{ backgroundImage: `url(${poster})` }}>
        <video
          ref={video}
          className="folio-breeze-video"
          src={sitePath('/media/sunny-reading-1080p.mp4')}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          style={failed ? { visibility: 'hidden' } : undefined}
        />
      </div>
      {!failed && (
        <button
          type="button"
          className="folio-film-control liquid-glass"
          onClick={toggle}
          aria-label={playing ? '暂停草坪微风视频' : '播放草坪微风视频'}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          <span>{playing ? '暂停微风' : '播放微风'}</span>
        </button>
      )}
    </>
  );
}

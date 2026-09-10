'use client';
import { useEffect, useState } from 'react';
import Link from './site-link';
import CoachAvatar from './coach-avatar';

export default function CoachLauncher() {
  const [href, setHref] = useState('');
  const [paused, setPaused] = useState(false);
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    if (/\/coach\/?$/.test(location.pathname)) return;
    const chapter =
      location.pathname.match(/\/learn\/(\d+)/)?.[1] ||
      new URLSearchParams(location.search).get('chapter');
    setHref(
      chapter && Number(chapter) >= 1 && Number(chapter) <= 11
        ? `/coach?chapter=${chapter}`
        : '/coach',
    );
  }, []);
  /* oxlint-enable react/react-compiler */
  if (!href) return null;
  return (
    <aside className="coach-launcher" aria-label="AI 教练入口">
      <Link href={href} className="coach-launch-link liquid-glass">
        <CoachAvatar paused={paused} />
        <span>
          <strong>AI 教练</strong>
          <small>帮你把问题想明白</small>
        </span>
      </Link>
      <button
        className="coach-motion-toggle"
        onClick={() => setPaused(!paused)}
        aria-label={paused ? '播放教练表情' : '暂停教练表情'}
      >
        {paused ? '播放表情' : '暂停表情'}
      </button>
    </aside>
  );
}

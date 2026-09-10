'use client';
import Image from 'next/image';
import { useReducedMotion } from './atlas-store';
import { sitePath } from './site-config';

export default function CoachAvatar({ paused = false }: { paused?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <Image
      unoptimized
      className="coach-avatar"
      src={sitePath(`/media/coach-owl.${reduced || paused ? 'png' : 'gif'}`)}
      width={80}
      height={80}
      alt=""
    />
  );
}

'use client';
import { useEffect, useState } from 'react';
import { recordStudyTime } from './atlas-store';
import { activeMilliseconds } from './activity-clock';
export function useLearningActivity(id: number) {
  const [tracking, setTracking] = useState(false);
  useEffect(() => {
    let previous = performance.now(),
      lastInput = previous,
      alive = true,
      owned = false,
      pending = false;
    let release: (() => void) | undefined;
    const visible = () =>
      document.visibilityState === 'visible' && document.hasFocus();
    const settle = () => {
      const now = performance.now();
      const ms = activeMilliseconds(
        previous,
        now,
        lastInput,
        visible() && owned,
      );
      previous = now;
      if (ms > 0) {
        const end = Date.now() - Math.max(0, now - lastInput - 120000);
        recordStudyTime(id, end - ms, end);
      }
      if (alive) setTracking(visible() && owned && now - lastInput < 120000);
    };
    const acquire = () => {
      if (!alive || !visible() || owned || pending) return;
      if (!navigator.locks) {
        owned = true;
        previous = performance.now();
        return;
      }
      pending = true;
      void navigator.locks
        .request(
          'ai-learning-atlas:study-clock',
          { ifAvailable: true },
          async (lock) => {
            pending = false;
            if (!lock || !alive || !visible()) return;
            owned = true;
            previous = performance.now();
            setTracking(true);
            await new Promise<void>((resolve) => {
              release = resolve;
            });
            owned = false;
            release = undefined;
          },
        )
        .catch(() => {
          pending = false;
          owned = false;
          if (alive) setTracking(false);
        });
    };
    const activity = (event: Event) => {
      if (!event.isTrusted) return;
      settle();
      lastInput = performance.now();
      acquire();
    };
    const changed = () => {
      settle();
      previous = performance.now();
      if (visible()) {
        lastInput = previous;
        acquire();
      } else {
        owned = false;
        release?.();
        setTracking(false);
      }
    };
    const leaving = () => {
      settle();
      owned = false;
      release?.();
    };
    const tick = setInterval(() => {
      acquire();
      settle();
    }, 5000);
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    for (const event of events)
      window.addEventListener(event, activity, { passive: true });
    document.addEventListener('visibilitychange', changed);
    window.addEventListener('focus', changed);
    window.addEventListener('blur', changed);
    window.addEventListener('pagehide', leaving);
    acquire();
    return () => {
      settle();
      alive = false;
      owned = false;
      release?.();
      clearInterval(tick);
      for (const event of events) window.removeEventListener(event, activity);
      document.removeEventListener('visibilitychange', changed);
      window.removeEventListener('focus', changed);
      window.removeEventListener('blur', changed);
      window.removeEventListener('pagehide', leaving);
    };
  }, [id]);
  return tracking;
}

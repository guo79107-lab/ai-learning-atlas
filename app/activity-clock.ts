// Use a monotonic clock. Do not backfill laptop sleep, background time or idle time.
export function activeMilliseconds(
  previous: number,
  now: number,
  lastInput: number,
  eligible: boolean,
) {
  if (
    !eligible ||
    !Number.isFinite(now - previous) ||
    now <= previous ||
    now - previous > 15000
  )
    return 0;
  return Math.max(0, Math.min(now, lastInput + 120000) - previous);
}

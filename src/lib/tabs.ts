const KEY_STEP: Readonly<Record<string, (current: number, count: number) => number>> = {
  ArrowRight: (current) => current + 1,
  ArrowLeft: (current) => current - 1,
  Home: () => 0,
  End: (_, count) => count - 1,
}

/** Index a tab list's key moves to, wrapping at both ends; undefined for keys it ignores. */
export function tabIndexForKey(key: string, current: number, count: number): number | undefined {
  const step = KEY_STEP[key]
  if (!step || count === 0) return undefined
  return (step(current, count) + count) % count
}

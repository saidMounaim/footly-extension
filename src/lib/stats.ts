/** Provider values can be negative or non-finite; neither has a share to draw. */
const usable = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)

/** Each side's percent of the combined total, for a split comparison bar; both 0 when the total is 0. */
export function statShares(home: number, away: number): { home: number; away: number } {
  const h = usable(home)
  const a = usable(away)
  const total = h + a
  if (total === 0) return { home: 0, away: 0 }
  return { home: (h / total) * 100, away: (a / total) * 100 }
}

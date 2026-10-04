const DAY_MS = 24 * 60 * 60 * 1000

/** Number of days in the upcoming window: today plus the next 7 days. */
export const WINDOW_DAYS = 8

/** Number of days before today covered by recent results. */
export const RESULTS_DAYS = 7

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export interface MatchListWindow {
  /** Local start of today minus RESULTS_DAYS: first kickoff included in results. */
  resultsStart: Date
  /** Local start of today: first kickoff included in upcoming. */
  todayStart: Date
  /** Local start of tomorrow: results end here (exclusive). */
  tomorrowStart: Date
  /** Local start of today plus WINDOW_DAYS: upcoming ends here (exclusive). */
  upcomingEnd: Date
}

/** Local-day boundaries for the results and upcoming lists. */
export function matchListWindow(now: Date): MatchListWindow {
  const todayStart = startOfLocalDay(now)
  return {
    resultsStart: addLocalDays(todayStart, -RESULTS_DAYS),
    todayStart,
    tomorrowStart: addLocalDays(todayStart, 1),
    upcomingEnd: addLocalDays(todayStart, WINDOW_DAYS),
  }
}

/**
 * `YYYYMM` months covering the range padded by one day on each side,
 * so provider timezone differences can't drop matches at the edges.
 */
export function monthsToRequest(range: { start: Date; end: Date }): string[] {
  const first = addLocalDays(range.start, -1)
  const last = range.end
  const months: string[] = []
  for (
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    cursor <= last;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    months.push(`${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

/** Local calendar day key (`YYYY-MM-DD`) used to group matches. */
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** "Today", "Tomorrow", "Yesterday", or a short weekday and date in the user's locale. */
export function dayLabel(date: Date, now: Date, locale?: string): string {
  const diff = Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

/** Local kickoff time as `HH:mm`. */
export function formatKickoff(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Number of days in the upcoming window: today plus the next 7 days. */
export const WINDOW_DAYS = 8

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Local start of today (inclusive) to local start of day 8 (exclusive). */
export function upcomingWindow(now: Date): { start: Date; end: Date } {
  const start = startOfLocalDay(now)
  return { start, end: addLocalDays(start, WINDOW_DAYS) }
}

/**
 * `YYYYMM` months covering the window padded by one day on each side,
 * so provider timezone differences can't drop matches at the edges.
 */
export function monthsToRequest(window: { start: Date; end: Date }): string[] {
  const first = addLocalDays(window.start, -1)
  const last = window.end
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

/** "Today", "Tomorrow", or a short weekday and date in the user's locale. */
export function dayLabel(date: Date, now: Date, locale?: string): string {
  const diff = Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
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

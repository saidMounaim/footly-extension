import { describe, expect, it } from 'vitest'
import {
  dayLabel,
  formatKickoff,
  localDayKey,
  matchDays,
  matchListWindow,
  monthsToRequest,
  onDay,
} from './date.ts'

// Vitest pins TZ to Europe/London (see vite.config.ts).

describe('matchListWindow', () => {
  it('covers the previous 7 days, today, and the next 7 days in local days', () => {
    const w = matchListWindow(new Date('2026-10-03T15:20:00Z'))
    expect(w.resultsStart.toISOString()).toBe('2026-09-25T23:00:00.000Z') // 00:00 BST 26 Sep
    expect(w.todayStart.toISOString()).toBe('2026-10-02T23:00:00.000Z') // 00:00 BST 3 Oct
    expect(w.tomorrowStart.toISOString()).toBe('2026-10-03T23:00:00.000Z') // 00:00 BST 4 Oct
    expect(w.upcomingEnd.toISOString()).toBe('2026-10-10T23:00:00.000Z') // 00:00 BST 11 Oct
  })

  it('keeps local midnight across the end of daylight saving time', () => {
    const forward = matchListWindow(new Date('2026-10-20T12:00:00Z'))
    expect(forward.todayStart.toISOString()).toBe('2026-10-19T23:00:00.000Z') // BST
    expect(forward.upcomingEnd.toISOString()).toBe('2026-10-28T00:00:00.000Z') // GMT
    const back = matchListWindow(new Date('2026-10-30T12:00:00Z'))
    expect(back.resultsStart.toISOString()).toBe('2026-10-22T23:00:00.000Z') // BST 23 Oct
    expect(back.todayStart.toISOString()).toBe('2026-10-30T00:00:00.000Z') // GMT
  })
})

function rangeFor(now: string) {
  const w = matchListWindow(new Date(now))
  return { start: w.resultsStart, end: w.upcomingEnd }
}

describe('monthsToRequest', () => {
  it('requests one month when the padded range fits inside it', () => {
    expect(monthsToRequest(rangeFor('2026-10-15T12:00:00Z'))).toEqual(['202610'])
  })

  it('includes the previous month when the range starts in it', () => {
    expect(monthsToRequest(rangeFor('2026-10-03T12:00:00Z'))).toEqual(['202609', '202610'])
  })

  it('includes the next month when the range ends in it', () => {
    expect(monthsToRequest(rangeFor('2026-10-28T12:00:00Z'))).toEqual(['202610', '202611'])
  })

  it('crosses a year boundary', () => {
    expect(monthsToRequest(rangeFor('2026-12-28T12:00:00Z'))).toEqual(['202612', '202701'])
  })
})

describe('day helpers', () => {
  const now = new Date('2026-10-03T22:30:00Z') // 23:30 BST on Sat 3 Oct

  it('groups by local calendar day', () => {
    expect(localDayKey(new Date('2026-10-03T23:30:00Z'))).toBe('2026-10-04')
  })

  it('labels today, tomorrow, and later days', () => {
    expect(dayLabel(new Date('2026-10-03T08:00:00Z'), now, 'en-GB')).toBe('Today')
    expect(dayLabel(new Date('2026-10-03T23:30:00Z'), now, 'en-GB')).toBe('Tomorrow')
    expect(dayLabel(new Date('2026-10-06T18:00:00Z'), now, 'en-GB')).toBe('Tue 6 Oct')
    expect(dayLabel(new Date('2026-10-02T19:00:00Z'), now, 'en-GB')).toBe('Yesterday')
    expect(dayLabel(new Date('2026-09-30T19:00:00Z'), now, 'en-GB')).toBe('Wed 30 Sept')
  })

  it('formats kickoff as local 24-hour time', () => {
    expect(formatKickoff(new Date('2026-10-10T14:00:00Z'), 'en-US')).toBe('15:00')
  })
})

describe('matchDays and onDay', () => {
  // Europe/London (pinned in vite.config.ts): 23:30Z on Oct 4 is still Oct 5 00:30 local.
  const matches = [
    { id: 'a', startTime: '2026-10-04T12:00:00Z' },
    { id: 'b', startTime: '2026-10-04T23:30:00Z' },
    { id: 'c', startTime: '2026-10-05T18:00:00Z' },
    { id: 'd', startTime: '2026-10-04T15:00:00Z' },
  ]

  it('lists distinct local days in list order', () => {
    expect(matchDays(matches)).toEqual(['2026-10-04', '2026-10-05'])
  })

  it('gives no days for no matches', () => {
    expect(matchDays([])).toEqual([])
  })

  it('keeps only the chosen local day', () => {
    expect(onDay(matches, '2026-10-05').map((m) => m.id)).toEqual(['b', 'c'])
    expect(onDay(matches, '2026-10-07')).toEqual([])
  })
})

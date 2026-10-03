import { describe, expect, it } from 'vitest'
import { dayLabel, formatKickoff, localDayKey, monthsToRequest, upcomingWindow } from './date.ts'

// Vitest pins TZ to Europe/London (see vite.config.ts).

describe('upcomingWindow', () => {
  it('runs from local midnight today to local midnight 8 days later', () => {
    const { start, end } = upcomingWindow(new Date('2026-10-03T15:20:00Z'))
    expect(start.toISOString()).toBe('2026-10-02T23:00:00.000Z') // 00:00 BST
    expect(end.toISOString()).toBe('2026-10-10T23:00:00.000Z') // 00:00 BST, day 8
  })

  it('keeps local midnight across the end of daylight saving time', () => {
    const { start, end } = upcomingWindow(new Date('2026-10-20T12:00:00Z'))
    expect(start.toISOString()).toBe('2026-10-19T23:00:00.000Z') // 00:00 BST
    expect(end.toISOString()).toBe('2026-10-28T00:00:00.000Z') // 00:00 GMT
  })
})

describe('monthsToRequest', () => {
  it('requests one month when the padded window fits inside it', () => {
    expect(monthsToRequest(upcomingWindow(new Date('2026-10-03T12:00:00Z')))).toEqual(['202610'])
  })

  it('includes the previous month when the padding day falls in it', () => {
    expect(monthsToRequest(upcomingWindow(new Date('2026-10-01T12:00:00Z')))).toEqual([
      '202609',
      '202610',
    ])
  })

  it('crosses a year boundary', () => {
    expect(monthsToRequest(upcomingWindow(new Date('2026-12-28T12:00:00Z')))).toEqual([
      '202612',
      '202701',
    ])
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
  })

  it('formats kickoff as local 24-hour time', () => {
    expect(formatKickoff(new Date('2026-10-10T14:00:00Z'), 'en-US')).toBe('15:00')
  })
})

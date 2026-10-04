import { describe, expect, it } from 'vitest'
import type { Match } from '../api/types.ts'
import { detailCountdown, nextKickoffCheck, rowCountdown } from './countdown.ts'

const kickoff = new Date('2026-10-04T15:00:00Z')
const before = (ms: number) => new Date(kickoff.getTime() - ms)
const MIN = 60_000

describe('rowCountdown', () => {
  it('shows nothing more than an hour out', () => {
    expect(rowCountdown(kickoff, before(61 * MIN))).toBeNull()
  })

  it('counts whole minutes up to an hour, rounding up', () => {
    expect(rowCountdown(kickoff, before(60 * MIN))).toBe('in 60 min')
    expect(rowCountdown(kickoff, before(23 * MIN + 1))).toBe('in 24 min')
    expect(rowCountdown(kickoff, before(30_000))).toBe('in 1 min')
  })

  it('says Starting at and after kickoff', () => {
    expect(rowCountdown(kickoff, kickoff)).toBe('Starting')
    expect(rowCountdown(kickoff, before(-5 * MIN))).toBe('Starting')
  })
})

describe('detailCountdown', () => {
  it('uses days, hours, and minutes a day or more out', () => {
    expect(detailCountdown(kickoff, before((3 * 24 * 60 + 4 * 60 + 12) * MIN))).toBe(
      'Kicks off in 3d 04h 12m',
    )
  })

  it('uses hours, minutes, and seconds under a day', () => {
    expect(detailCountdown(kickoff, before((2 * 3600 + 14 * 60 + 5) * 1000))).toBe(
      'Kicks off in 2h 14m 05s',
    )
  })

  it('uses minutes and seconds under an hour', () => {
    expect(detailCountdown(kickoff, before((14 * 60 + 5) * 1000))).toBe('Kicks off in 14m 05s')
    expect(detailCountdown(kickoff, before(500))).toBe('Kicks off in 0m 01s')
  })

  it('says Starting once kickoff has passed', () => {
    expect(detailCountdown(kickoff, kickoff)).toBe('Starting')
  })
})

describe('nextKickoffCheck', () => {
  const match = (id: string, startTime: string, status: Match['status'] = 'upcoming') =>
    ({ id, startTime, status }) as Match
  const at = (iso: string) => new Date(iso)

  it('picks the earliest check across matches', () => {
    const matches = [match('a', '2026-10-04T17:00:00Z'), match('b', '2026-10-04T15:00:00Z')]
    expect(nextKickoffCheck(matches, at('2026-10-04T12:00:00Z'))?.toISOString()).toBe(
      '2026-10-04T15:01:00.000Z',
    )
  })

  it('skips checks that already passed', () => {
    const matches = [match('a', '2026-10-04T15:00:00Z')]
    expect(nextKickoffCheck(matches, at('2026-10-04T15:01:00Z'))?.toISOString()).toBe(
      '2026-10-04T15:03:00.000Z',
    )
    expect(nextKickoffCheck(matches, at('2026-10-04T15:04:00Z'))?.toISOString()).toBe(
      '2026-10-04T15:05:00.000Z',
    )
  })

  it('stops after the five-minute check', () => {
    const matches = [match('a', '2026-10-04T15:00:00Z')]
    expect(nextKickoffCheck(matches, at('2026-10-04T15:05:00Z'))).toBeNull()
  })

  it('ignores matches that are not upcoming', () => {
    const matches = [
      match('a', '2026-10-04T15:00:00Z', 'live'),
      match('b', '2026-10-04T15:00:00Z', 'postponed'),
    ]
    expect(nextKickoffCheck(matches, at('2026-10-04T14:00:00Z'))).toBeNull()
  })

  it('gives one time for matches sharing a kickoff', () => {
    const matches = [match('a', '2026-10-04T15:00:00Z'), match('b', '2026-10-04T15:00:00Z')]
    expect(nextKickoffCheck(matches, at('2026-10-04T14:00:00Z'))?.toISOString()).toBe(
      '2026-10-04T15:01:00.000Z',
    )
  })
})

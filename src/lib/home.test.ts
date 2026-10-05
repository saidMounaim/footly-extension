import { describe, expect, it } from 'vitest'
import type { MatchListResult } from '../api/football.ts'
import type { Match, MatchEvent, MatchStatus } from '../api/types.ts'
import { buildHome, NEXT_UP_LIMIT, recentEvents } from './home.ts'

let nextId = 0

function match(
  status: MatchStatus,
  { home = 'h', away = 'a', competition = 'eng.1' }: { home?: string; away?: string; competition?: string } = {},
): Match {
  nextId += 1
  return {
    id: String(nextId),
    homeTeam: { id: home, name: `Team ${home}` },
    awayTeam: { id: away, name: `Team ${away}` },
    competition: { id: competition, name: competition },
    startTime: new Date(Date.UTC(2026, 9, 5, 12, nextId)).toISOString(),
    status,
    events: [],
  }
}

function result(upcoming: Match[]): MatchListResult {
  return { upcoming, results: [], failedCompetitionIds: [] }
}

const none: ReadonlySet<string> = new Set()

describe('buildHome', () => {
  it('returns empty sections for an empty list', () => {
    expect(buildHome(result([]), none, none)).toEqual({ live: [], nextMatch: null, nextUp: [] })
  })

  it('orders live matches by favorite team, then followed competition, then the rest', () => {
    const other = match('live', { competition: 'ger.1' })
    const followed = match('halftime', { competition: 'esp.1' })
    const favorite = match('live', { home: 'fav', competition: 'ita.1' })
    const otherLater = match('halftime', { competition: 'fra.1' })
    const { live } = buildHome(
      result([other, followed, favorite, otherLater, match('upcoming')]),
      new Set(['fav']),
      new Set(['esp.1']),
    )
    expect(live).toEqual([favorite, followed, other, otherLater])
  })

  it("picks the earliest not-yet-started match of a favorite team as next match", () => {
    const postponed = match('postponed', { away: 'fav' })
    const cancelled = match('cancelled', { home: 'fav' })
    const live = match('live', { home: 'fav' })
    const notFavorite = match('upcoming')
    const first = match('upcoming', { away: 'fav' })
    const second = match('upcoming', { home: 'fav' })
    const { nextMatch } = buildHome(
      result([postponed, cancelled, live, notFavorite, first, second]),
      new Set(['fav']),
      none,
    )
    expect(nextMatch).toBe(first)
  })

  it('has no next match without favorite teams', () => {
    expect(buildHome(result([match('upcoming')]), none, new Set(['eng.1'])).nextMatch).toBeNull()
  })

  it('lists next favorite or followed matches, excluding the next match, live and non-started', () => {
    const next = match('upcoming', { home: 'fav' })
    const live = match('live', { home: 'fav' })
    const postponed = match('postponed', { competition: 'esp.1' })
    const unrelated = match('upcoming', { competition: 'ger.1' })
    const followed = match('upcoming', { competition: 'esp.1' })
    const favorite = match('upcoming', { away: 'fav', competition: 'ger.1' })
    const { nextUp } = buildHome(
      result([next, live, postponed, unrelated, followed, favorite]),
      new Set(['fav']),
      new Set(['esp.1']),
    )
    expect(nextUp).toEqual([followed, favorite])
  })

  it('limits next up', () => {
    const matches = Array.from({ length: NEXT_UP_LIMIT + 2 }, () =>
      match('upcoming', { competition: 'esp.1' }),
    )
    const { nextUp } = buildHome(result(matches), none, new Set(['esp.1']))
    expect(nextUp).toEqual(matches.slice(0, NEXT_UP_LIMIT))
  })

  it('falls back to the next matches overall when nothing is followed', () => {
    const live = match('live')
    const matches = Array.from({ length: NEXT_UP_LIMIT + 1 }, () => match('upcoming'))
    const { nextUp } = buildHome(result([live, ...matches]), none, none)
    expect(nextUp).toEqual(matches.slice(0, NEXT_UP_LIMIT))
  })

  it('does not fall back when something is followed but has no matches', () => {
    expect(buildHome(result([match('upcoming')]), new Set(['fav']), none).nextUp).toEqual([])
  })
})

describe('recentEvents', () => {
  const events: MatchEvent[] = ['1', '2', '3', '4'].map((id) => ({
    id,
    type: 'goal',
    minute: `${id}'`,
  }))

  it('returns the last events in chronological order', () => {
    expect(recentEvents(events, 3).map((event) => event.id)).toEqual(['2', '3', '4'])
  })

  it('returns every event when there are fewer than the count', () => {
    expect(recentEvents(events.slice(0, 2), 3)).toEqual(events.slice(0, 2))
  })

  it('returns nothing for a zero count', () => {
    expect(recentEvents(events, 0)).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import {
  CLUB_EXTRAS,
  DEFAULT_COMPETITIONS,
  NATIONAL_TEAM_EXTRAS,
  type MatchListResult,
} from '../api/football.ts'
import type { Match, MatchStatus } from '../api/types.ts'
import { competitionSummaries, coversCompetition, homeSections } from './home.ts'

let nextId = 0

function match(status: MatchStatus, competition: string): Match {
  nextId += 1
  return {
    id: String(nextId),
    homeTeam: { id: 'h', name: 'Home' },
    awayTeam: { id: 'a', name: 'Away' },
    competition: { id: competition, name: competition },
    startTime: new Date(Date.UTC(2026, 9, 5, 12, nextId)).toISOString(),
    status,
    events: [],
  }
}

function result(upcoming: Match[]): MatchListResult {
  return { upcoming, results: [], failedCompetitionIds: [], competitionIds: ['eng.1', 'esp.1'] }
}

const competitions = [
  { id: 'esp.1', name: 'La Liga' },
  { id: 'eng.1', name: 'Premier League' },
]

describe('competitionSummaries', () => {
  it('follows the requested order', () => {
    expect(competitionSummaries(result([]), competitions).map((s) => s.id)).toEqual(['esp.1', 'eng.1'])
  })

  it('counts live and half-time matches', () => {
    const [, eng] = competitionSummaries(
      result([match('live', 'eng.1'), match('halftime', 'eng.1'), match('live', 'esp.1')]),
      competitions,
    )
    expect(eng.live).toBe(2)
  })

  it('picks the earliest not-yet-started match, skipping other statuses', () => {
    const postponed = match('postponed', 'eng.1')
    const cancelled = match('cancelled', 'eng.1')
    const live = match('live', 'eng.1')
    const first = match('upcoming', 'eng.1')
    const later = match('upcoming', 'eng.1')
    const [, eng] = competitionSummaries(result([postponed, cancelled, live, first, later]), competitions)
    expect(eng.next).toBe(first)
  })

  it('gives zero live and no next match for a competition without matches', () => {
    const [esp] = competitionSummaries(result([match('upcoming', 'eng.1')]), competitions)
    expect(esp).toEqual({ id: 'esp.1', name: 'La Liga', live: 0, next: null })
  })
})

describe('coversCompetition', () => {
  const loaded = { status: 'success' as const, result: result([]), loadedAt: new Date(0) }

  it('is true only when the loaded list includes the competition', () => {
    expect(coversCompetition(loaded, 'eng.1')).toBe(true)
    expect(coversCompetition(loaded, 'conmebol.libertadores')).toBe(false)
  })

  it('is false while loading or after an error', () => {
    expect(coversCompetition({ status: 'loading' }, 'eng.1')).toBe(false)
    expect(coversCompetition({ status: 'error', reason: 'offline' }, 'eng.1')).toBe(false)
  })
})

describe('homeSections', () => {
  const ids = (list: { id: string }[]) => list.map((c) => c.id)
  const defaultIds = ids([...DEFAULT_COMPETITIONS])

  it('lists the defaults as yours and every extra in its group when nothing is followed', () => {
    const sections = homeSections(new Set())
    expect(ids(sections.yours)).toEqual(defaultIds)
    expect(ids(sections.clubs)).toEqual(ids([...CLUB_EXTRAS]))
    expect(ids(sections.national)).toEqual(ids([...NATIONAL_TEAM_EXTRAS]))
  })

  it('moves followed extras to yours, in catalog order, out of their groups', () => {
    const sections = homeSections(new Set(['conmebol.libertadores', 'fifa.world']))
    expect(ids(sections.yours)).toEqual([...defaultIds, 'fifa.world', 'conmebol.libertadores'])
    expect(ids(sections.clubs)).not.toContain('conmebol.libertadores')
    expect(ids(sections.national)).not.toContain('fifa.world')
    expect(sections.clubs).toHaveLength(CLUB_EXTRAS.length - 1)
    expect(sections.national).toHaveLength(NATIONAL_TEAM_EXTRAS.length - 1)
  })

  it('changes no group when a default is followed', () => {
    const sections = homeSections(new Set(['eng.1']))
    expect(ids(sections.yours)).toEqual(defaultIds)
    expect(sections.clubs).toHaveLength(CLUB_EXTRAS.length)
    expect(sections.national).toHaveLength(NATIONAL_TEAM_EXTRAS.length)
  })
})

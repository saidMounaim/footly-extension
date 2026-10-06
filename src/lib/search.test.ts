import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../api/types.ts'
import { COMPETITIONS, DEFAULT_COMPETITIONS } from '../api/football.ts'
import { foldText, searchCompetitions, searchMatches, searchTeams, teamsInMatches } from './search.ts'

const teams = [
  { id: '1068', name: 'Atlético Madrid', shortName: 'Atlético' },
  { id: '359', name: 'Arsenal', shortName: 'Arsenal' },
  { id: '360', name: 'Manchester United', shortName: 'Man United' },
  { id: '132', name: 'Bayern Munich' },
]

describe('foldText', () => {
  it('removes accents, lowercases, and trims', () => {
    expect(foldText('  Atlético MÜNCHEN ')).toBe('atletico munchen')
  })
})

describe('searchTeams', () => {
  it('ignores case and accents', () => {
    expect(searchTeams(teams, 'ATLETICO').map((t) => t.id)).toEqual(['1068'])
    expect(searchTeams(teams, 'atlético').map((t) => t.id)).toEqual(['1068'])
  })

  it('matches substrings of the name or the short name', () => {
    expect(searchTeams(teams, 'arse').map((t) => t.id)).toEqual(['359'])
    expect(searchTeams(teams, 'man u').map((t) => t.id)).toEqual(['360'])
  })

  it('handles teams without a short name', () => {
    expect(searchTeams(teams, 'bayern').map((t) => t.id)).toEqual(['132'])
  })

  it('returns nothing for an empty or blank query', () => {
    expect(searchTeams(teams, '')).toEqual([])
    expect(searchTeams(teams, '   ')).toEqual([])
  })
})

describe('searchCompetitions', () => {
  it('matches the name ignoring case, accents, and spaces', () => {
    expect(searchCompetitions(DEFAULT_COMPETITIONS, '  PREM ').map((c) => c.id)).toEqual(['eng.1'])
    expect(searchCompetitions(DEFAULT_COMPETITIONS, 'liga').map((c) => c.id)).toEqual(['esp.1', 'ger.1'])
    expect(searchCompetitions(DEFAULT_COMPETITIONS, 'la liga').map((c) => c.id)).toEqual(['esp.1'])
  })

  it('returns nothing for an empty or blank query', () => {
    expect(searchCompetitions(COMPETITIONS, '')).toEqual([])
    expect(searchCompetitions(COMPETITIONS, '   ')).toEqual([])
  })
})

const arsenal: Team = { id: '359', name: 'Arsenal', shortName: 'Arsenal' }
const chelsea: Team = { id: '363', name: 'Chelsea' }
const atletico: Team = { id: '1068', name: 'Atlético Madrid', shortName: 'Atlético' }
const united: Team = { id: '360', name: 'Manchester United', shortName: 'Man United' }

function match(id: string, homeTeam: Team, awayTeam: Team, competition = 'Premier League'): Match {
  return {
    id,
    homeTeam,
    awayTeam,
    competition: { id: 'eng.1', name: competition },
    startTime: '2026-10-04T15:00:00Z',
    status: 'upcoming',
    events: [],
  }
}

describe('teamsInMatches', () => {
  it('dedupes teams across matches and sides and sorts by name', () => {
    const teams = teamsInMatches([
      match('a', chelsea, arsenal),
      match('b', arsenal, united),
      match('c', atletico, chelsea, 'La Liga'),
    ])
    expect(teams.map((t) => t.id)).toEqual(['359', '1068', '363', '360'])
  })

  it('gives nothing for no matches', () => {
    expect(teamsInMatches([])).toEqual([])
  })
})

describe('searchMatches', () => {
  const matches = [
    match('a', arsenal, chelsea),
    match('b', united, arsenal),
    match('c', atletico, chelsea, 'Champions League'),
  ]
  const ids = (query: string) => searchMatches(matches, query).map((m) => m.id)

  it('finds matches by either team, keeping order', () => {
    expect(ids('arsenal')).toEqual(['a', 'b'])
    expect(ids('chelsea')).toEqual(['a', 'c'])
  })

  it('needs every word, across teams and competition', () => {
    expect(ids('arsenal chelsea')).toEqual(['a'])
    expect(ids('chelsea champions')).toEqual(['c'])
    expect(ids('arsenal champions')).toEqual([])
  })

  it('ignores case, accents, and extra spaces, and matches short names', () => {
    expect(ids('  ATLETICO   chelsea ')).toEqual(['c'])
    expect(ids('man united')).toEqual(['b'])
  })

  it('matches the competition name', () => {
    expect(ids('premier')).toEqual(['a', 'b'])
  })

  it('returns nothing for an empty or blank query', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })
})

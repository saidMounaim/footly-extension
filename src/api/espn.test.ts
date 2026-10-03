import { describe, expect, it } from 'vitest'
import { EspnResponseError, normalizeScoreboard, scoreboardUrl } from './espn.ts'
import fixture from './fixtures/espn-scoreboard.json'

const league = { id: '700', name: 'English Premier League' }

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    date: '2026-10-10T14:00Z',
    status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
    competitions: [
      {
        competitors: [
          { homeAway: 'home', score: '2', team: { id: 'h', displayName: 'Home FC' } },
          { homeAway: 'away', score: '1', team: { id: 'a', displayName: 'Away FC' } },
        ],
      },
    ],
    ...overrides,
  }
}

function single(overrides: Record<string, unknown> = {}) {
  return normalizeScoreboard({ leagues: [league], events: [event(overrides)] })
}

function withStatus(name: string, state: string) {
  return single({ status: { type: { name, state } } })[0]
}

describe('scoreboardUrl', () => {
  it('builds the HTTPS month endpoint', () => {
    expect(scoreboardUrl('eng.1', '202610')).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=202610',
    )
  })
})

describe('normalizeScoreboard', () => {
  it('normalizes a real ESPN response', () => {
    const matches = normalizeScoreboard(fixture)
    expect(matches).toHaveLength(5)
    expect(matches[0]).toEqual({
      id: '401879268',
      homeTeam: {
        id: '359',
        name: 'Arsenal',
        shortName: 'Arsenal',
        logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
      },
      awayTeam: {
        id: '357',
        name: 'Leeds United',
        shortName: 'Leeds',
        logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/357.png',
      },
      competition: {
        id: '700',
        name: 'English Premier League',
        logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
      },
      startTime: '2026-10-10T11:30:00.000Z',
      status: 'upcoming',
      events: [],
    })
    expect(matches[3]).toMatchObject({ status: 'finished', score: { home: 5, away: 3 } })
  })

  it.each([
    ['STATUS_SCHEDULED', 'pre', 'upcoming'],
    ['STATUS_FIRST_HALF', 'in', 'live'],
    ['STATUS_SECOND_HALF', 'in', 'live'],
    ['STATUS_HALFTIME', 'in', 'halftime'],
    ['STATUS_FULL_TIME', 'post', 'finished'],
    ['STATUS_FINAL_PEN', 'post', 'finished'],
    ['STATUS_POSTPONED', 'post', 'postponed'],
    ['STATUS_CANCELED', 'post', 'cancelled'],
    ['STATUS_ABANDONED', 'post', 'cancelled'],
  ])('maps %s (%s) to %s', (name, state, expected) => {
    expect(withStatus(name, state).status).toBe(expected)
  })

  it('skips events with an unknown status state', () => {
    expect(single({ status: { type: { name: 'STATUS_WEIRD', state: 'later' } } })).toEqual([])
  })

  it('sets the score only for live, halftime, and finished matches', () => {
    expect(withStatus('STATUS_SCHEDULED', 'pre').score).toBeUndefined()
    expect(withStatus('STATUS_POSTPONED', 'post').score).toBeUndefined()
    expect(withStatus('STATUS_FIRST_HALF', 'in').score).toEqual({ home: 2, away: 1 })
    expect(withStatus('STATUS_HALFTIME', 'in').score).toEqual({ home: 2, away: 1 })
    expect(withStatus('STATUS_FULL_TIME', 'post').score).toEqual({ home: 2, away: 1 })
  })

  it('drops a score when either side is not a whole number', () => {
    const [match] = single({
      status: { type: { name: 'STATUS_FIRST_HALF', state: 'in' } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '1', team: { id: 'h', displayName: 'Home FC' } },
            { homeAway: 'away', score: '-', team: { id: 'a', displayName: 'Away FC' } },
          ],
        },
      ],
    })
    expect(match.status).toBe('live')
    expect(match.score).toBeUndefined()
  })

  it('omits missing optional fields and non-https logos', () => {
    const [match] = single({
      competitions: [
        {
          competitors: [
            {
              homeAway: 'home',
              team: { id: 'h', displayName: 'Home FC', logo: 'http://example.com/h.png' },
            },
            { homeAway: 'away', team: { id: 'a', displayName: 'Away FC', logo: 'javascript:x' } },
          ],
        },
      ],
    })
    expect(match.homeTeam).toEqual({ id: 'h', name: 'Home FC' })
    expect(match.awayTeam).toEqual({ id: 'a', name: 'Away FC' })
    expect(match.competition).toEqual(league)
  })

  it('skips malformed events and keeps valid ones', () => {
    const matches = normalizeScoreboard({
      leagues: [league],
      events: [
        null,
        event({ id: undefined }),
        event({ id: '2', date: 'not a date' }),
        event({ id: '3', competitions: [] }),
        event({
          id: '4',
          competitions: [
            { competitors: [{ homeAway: 'home', team: { id: 'h', displayName: 'Home FC' } }] },
          ],
        }),
        event({ id: '5' }),
      ],
    })
    expect(matches.map((match) => match.id)).toEqual(['5'])
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['a missing events list', { leagues: [league] }],
    ['a missing league', { events: [] }],
  ])('throws EspnResponseError for %s', (_label, input) => {
    expect(() => normalizeScoreboard(input)).toThrow(EspnResponseError)
  })
})

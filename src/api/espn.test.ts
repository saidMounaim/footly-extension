import { describe, expect, it } from 'vitest'
import {
  EspnResponseError,
  normalizeScoreboard,
  normalizeSummary,
  scoreboardUrl,
  summaryUrl,
} from './espn.ts'
import fixture from './fixtures/espn-scoreboard.json'
import summaryFixture from './fixtures/espn-summary.json'
import type { Match } from './types.ts'

const league = { id: '700', name: 'English Premier League' }
const competition = { id: 'eng.1', name: 'English Premier League' }

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
  return normalizeScoreboard({ leagues: [league], events: [event(overrides)] }, 'eng.1')
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
    const matches = normalizeScoreboard(fixture, 'eng.1')
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
        id: 'eng.1',
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
    expect(match.competition).toEqual(competition)
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
    }, 'eng.1')
    expect(matches.map((match) => match.id)).toEqual(['5'])
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['a missing events list', { leagues: [league] }],
    ['a missing league', { events: [] }],
  ])('throws EspnResponseError for %s', (_label, input) => {
    expect(() => normalizeScoreboard(input, 'eng.1')).toThrow(EspnResponseError)
  })
})

describe('summaryUrl', () => {
  it('builds the HTTPS summary endpoint', () => {
    expect(summaryUrl('eng.1', '401879272')).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=401879272',
    )
  })
})

const listMatch: Match = {
  id: '401879272',
  homeTeam: { id: '382', name: 'Manchester City' },
  awayTeam: { id: '366', name: 'Sunderland' },
  competition,
  startTime: '2026-09-20T13:00:00.000Z',
  status: 'upcoming',
  events: [],
}

interface RawEvent {
  id?: string
  type?: string
  minute?: string
  clock?: number
  team?: string
  scoring?: boolean
  players?: string[]
}

function keyEvent({
  id = 'e1',
  type = 'goal',
  minute = "10'",
  clock = 600,
  team = '382',
  scoring,
  players = ['Player A'],
}: RawEvent) {
  return {
    id,
    type: { type },
    clock: { value: clock, displayValue: minute },
    team: { id: team },
    scoringPlay: scoring ?? (type === 'goal' || type.startsWith('goal---')),
    participants: players.map((displayName) => ({ athlete: { displayName } })),
  }
}

function summaryWith(keyEvents: unknown[], header?: unknown) {
  return normalizeSummary({ header, keyEvents }, listMatch)
}

describe('normalizeSummary', () => {
  it('normalizes a real ESPN summary', () => {
    const match = normalizeSummary(summaryFixture, listMatch)
    expect(match.status).toBe('finished')
    expect(match.score).toEqual({ home: 5, away: 3 })
    expect(match.events.map((e) => `${e.minute} ${e.type}`)).toEqual([
      "8' yellow-card",
      "9' goal",
      "12' goal",
      "29' goal",
      "33' goal",
      "43' goal",
      "57' goal",
      "59' goal",
      "60' substitution",
      "68' substitution",
      "75' substitution",
      "79' substitution",
      "81' goal",
      "85' substitution",
    ])
    expect(match.events[0]).toEqual({
      id: '52707122',
      type: 'yellow-card',
      minute: "8'",
      teamId: '366',
      player: 'Dayann Methalie',
    })
    expect(match.events[8]).toMatchObject({
      type: 'substitution',
      teamId: '366',
      player: 'Malick Fofana',
      playerOff: 'Nilson Angulo',
    })
  })

  it.each([
    ['goal', true, 'goal'],
    ['goal---header', true, 'goal'],
    ['goal---volley', true, 'goal'],
    ['own-goal', true, 'own-goal'],
    ['penalty---scored', true, 'penalty-goal'],
    ['penalty---saved', false, 'penalty-missed'],
    ['penalty---missed', false, 'penalty-missed'],
    ['yellow-card', false, 'yellow-card'],
    ['red-card', false, 'red-card'],
    ['yellow-red-card', false, 'red-card'],
    ['second-yellow', false, 'red-card'],
    ['substitution', false, 'substitution'],
    ['some-new-scoring-play', true, 'goal'],
  ])('maps %s (scoring: %s) to %s', (type, scoring, expected) => {
    expect(summaryWith([keyEvent({ type, scoring })]).events[0]?.type).toBe(expected)
  })

  it('only sets playerOff for substitutions', () => {
    const [goal, sub] = summaryWith([
      keyEvent({ id: 'g', type: 'goal', players: ['Scorer', 'Assister'] }),
      keyEvent({ id: 's', type: 'substitution', clock: 700, players: ['On', 'Off'] }),
    ]).events
    expect(goal).toEqual({ id: 'g', type: 'goal', minute: "10'", teamId: '382', player: 'Scorer' })
    expect(sub).toMatchObject({ player: 'On', playerOff: 'Off' })
  })

  it('orders by clock and keeps provider order for ties', () => {
    const events = summaryWith([
      keyEvent({ id: 'late', minute: "90'+4'", clock: 5400 }),
      keyEvent({ id: 'early', minute: "3'", clock: 180 }),
      keyEvent({ id: 'stoppage-1', minute: "90'+1'", clock: 5400 }),
    ]).events
    expect(events.map((e) => [e.id, e.minute])).toEqual([
      ['early', "3'"],
      ['late', "90'+4'"],
      ['stoppage-1', "90'+1'"],
    ])
  })

  it('skips unknown, malformed, and non-match events', () => {
    const events = summaryWith([
      keyEvent({ id: 'kickoff', type: 'kickoff', scoring: false }),
      keyEvent({ id: 'delay', type: 'start-delay', scoring: false }),
      { ...keyEvent({ id: 'no-minute' }), clock: { value: 10 } },
      { ...keyEvent({ id: 'no-clock' }), clock: { displayValue: "1'" } },
      { ...keyEvent({}), id: undefined },
      null,
      keyEvent({ id: 'kept' }),
    ]).events
    expect(events.map((e) => e.id)).toEqual(['kept'])
  })

  it('omits a team that is not in the match and missing players', () => {
    const [event] = summaryWith([keyEvent({ team: '999', players: [] })]).events
    expect(event).toEqual({ id: 'e1', type: 'goal', minute: "10'" })
  })

  it('gives no events when the key-event list is missing', () => {
    expect(normalizeSummary({}, listMatch).events).toEqual([])
    expect(normalizeSummary({ keyEvents: 'nope' }, listMatch).events).toEqual([])
  })

  it('keeps list status and score when the header is unusable', () => {
    const live = { ...listMatch, status: 'live' as const, score: { home: 1, away: 0 } }
    const match = normalizeSummary({ header: { competitions: [{}] }, keyEvents: [] }, live)
    expect(match.status).toBe('live')
    expect(match.score).toEqual({ home: 1, away: 0 })
  })

  it('takes status and score from the header with the scoreboard rules', () => {
    const header = (name: string, state: string) => ({
      competitions: [
        {
          status: { type: { name, state } },
          competitors: [
            { homeAway: 'home', score: '2' },
            { homeAway: 'away', score: '1' },
          ],
        },
      ],
    })
    expect(summaryWith([], header('STATUS_HALFTIME', 'in'))).toMatchObject({
      status: 'halftime',
      score: { home: 2, away: 1 },
    })
    const postponed = normalizeSummary(
      { header: header('STATUS_POSTPONED', 'post') },
      { ...listMatch, status: 'live', score: { home: 0, away: 0 } },
    )
    expect(postponed.status).toBe('postponed')
    expect(postponed.score).toBeUndefined()
  })

  it.each([
    ['STATUS_SECOND_HALF', 'in', 'live', undefined, undefined],
    ['STATUS_HALFTIME', 'in', 'halftime', undefined, undefined],
    ['STATUS_FIRST_HALF', 'in', 'live', '-', '0'],
    ['STATUS_FULL_TIME', 'post', 'finished', '2', 'x'],
  ])(
    'keeps the list score when a %s summary has unusable scores',
    (name, state, expected, homeScore, awayScore) => {
      const match = normalizeSummary(
        {
          header: {
            competitions: [
              {
                status: { type: { name, state } },
                competitors: [
                  { homeAway: 'home', score: homeScore },
                  { homeAway: 'away', score: awayScore },
                ],
              },
            ],
          },
        },
        { ...listMatch, status: 'live', score: { home: 1, away: 0 } },
      )
      expect(match.status).toBe(expected)
      expect(match.score).toEqual({ home: 1, away: 0 })
    },
  )

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'oops'],
  ])('throws EspnResponseError for %s', (_label, input) => {
    expect(() => normalizeSummary(input, listMatch)).toThrow(EspnResponseError)
  })
})

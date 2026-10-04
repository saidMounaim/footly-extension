import { describe, expect, it, vi } from 'vitest'
import { COMPETITIONS, getMatchDetails, getMatchList, MatchDetailsError } from './football.ts'
import type { Match } from './types.ts'

// Results: 2026-10-12T23:00Z to 2026-10-20T23:00Z. Upcoming: 2026-10-19T23:00Z to 2026-10-28T00:00Z.
const NOW = new Date('2026-10-20T12:00:00Z')

interface FakeEvent {
  id: string
  date: string
  state?: 'pre' | 'in' | 'post'
  name?: string
}

function scoreboard(slug: string, events: FakeEvent[]) {
  return {
    leagues: [{ id: slug, name: slug }],
    events: events.map(({ id, date, state = 'pre', name = 'STATUS_SCHEDULED' }) => ({
      id,
      date,
      status: { type: { name, state } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '0', team: { id: `${id}h`, displayName: 'Home' } },
            { homeAway: 'away', score: '0', team: { id: `${id}a`, displayName: 'Away' } },
          ],
        },
      ],
    })),
  }
}

type Reply = FakeEvent[] | number | Error | 'bad-json' | 'bad-shape'

function fakeFetch(replies: Record<string, Reply>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const slug = url.split('/soccer/')[1].split('/')[0]
    const reply = replies[slug] ?? []
    if (reply instanceof Error) throw reply
    if (typeof reply === 'number') return new Response('nope', { status: reply })
    if (reply === 'bad-json') return new Response('{not json')
    if (reply === 'bad-shape') return new Response(JSON.stringify({ hello: 'world' }))
    return new Response(JSON.stringify(scoreboard(slug, reply)))
  })
}

describe('getMatchList upcoming', () => {
  it('requests every competition for each month over HTTPS', async () => {
    const fetchImpl = fakeFetch({})
    await getMatchList({ now: NOW, fetchImpl })
    const urls = fetchImpl.mock.calls.map(([input]) => String(input))
    expect(urls).toEqual(
      COMPETITIONS.map(
        (c) =>
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${c.id}/scoreboard?dates=202610`,
      ),
    )
  })

  it('requests two months per competition near a month boundary', async () => {
    const fetchImpl = fakeFetch({})
    await getMatchList({ now: new Date('2026-10-28T12:00:00Z'), fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(COMPETITIONS.length * 2)
  })

  it('keeps only matches inside the local window', async () => {
    const { upcoming: matches } = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'eng.1': [
          { id: 'before', date: '2026-10-19T22:59Z' },
          { id: 'first', date: '2026-10-19T23:00Z' }, // 00:00 BST today
          { id: 'last', date: '2026-10-27T23:59Z' }, // 23:59 GMT day 7, after DST ends
          { id: 'after', date: '2026-10-28T00:00Z' }, // 00:00 GMT day 8
        ],
      }),
    })
    expect(matches.map((m) => m.id)).toEqual(['first', 'last'])
  })

  it('drops finished matches and keeps other states', async () => {
    const { upcoming: matches } = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'eng.1': [
          { id: 'done', date: '2026-10-20T10:00Z', state: 'post', name: 'STATUS_FULL_TIME' },
          { id: 'live', date: '2026-10-20T11:00Z', state: 'in', name: 'STATUS_FIRST_HALF' },
          { id: 'off', date: '2026-10-20T11:30Z', state: 'post', name: 'STATUS_POSTPONED' },
          { id: 'next', date: '2026-10-21T19:00Z' },
        ],
      }),
    })
    expect(matches.map((m) => [m.id, m.status])).toEqual([
      ['live', 'live'],
      ['off', 'postponed'],
      ['next', 'upcoming'],
    ])
  })

  it('sorts by kickoff, then competition order, and dedupes by id', async () => {
    const { upcoming: matches } = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'uefa.champions': [{ id: 'ucl', date: '2026-10-21T19:00Z' }],
        'ita.1': [
          { id: 'ita', date: '2026-10-21T19:00Z' },
          { id: 'early', date: '2026-10-21T12:00Z' },
        ],
        'eng.1': [{ id: 'ita', date: '2026-10-21T19:00Z' }],
      }),
    })
    expect(matches.map((m) => m.id)).toEqual(['early', 'ita', 'ucl'])
    expect(matches.find((m) => m.id === 'ita')?.competition.id).toBe('eng.1')
  })

  it('reports competitions that fail and keeps the rest', async () => {
    const result = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'eng.1': [{ id: 'ok', date: '2026-10-21T19:00Z' }],
        'esp.1': 500,
        'ita.1': new TypeError('Failed to fetch'),
        'ger.1': 'bad-json',
        'fra.1': 'bad-shape',
        'uefa.champions': new DOMException('Timed out', 'TimeoutError'),
      }),
    })
    expect(result.upcoming.map((m) => m.id)).toEqual(['ok'])
    expect(result.failedCompetitionIds).toEqual([
      'esp.1',
      'ita.1',
      'ger.1',
      'fra.1',
      'uefa.champions',
    ])
  })

  it('fails a competition when any of its months fails', async () => {
    let call = 0
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      call += 1
      if (String(input).includes('eng.1') && call === 2) return new Response('', { status: 503 })
      return new Response(JSON.stringify(scoreboard('x', [])))
    })
    const result = await getMatchList({ now: new Date('2026-10-28T12:00:00Z'), fetchImpl })
    expect(result.failedCompetitionIds).toEqual(['eng.1'])
  })

  it('reports every competition when all fail', async () => {
    const result = await getMatchList({
      now: NOW,
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })
    expect(result).toEqual({
      upcoming: [],
      results: [],
      failedCompetitionIds: COMPETITIONS.map((c) => c.id),
    })
  })
})

describe('getMatchList results', () => {
  const finished = { state: 'post' as const, name: 'STATUS_FULL_TIME' }

  it('keeps finished matches from today and the previous 7 local days', async () => {
    const { results } = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'eng.1': [
          { id: 'too-old', date: '2026-10-12T22:59Z', ...finished },
          { id: 'oldest', date: '2026-10-12T23:00Z', ...finished }, // 00:00 BST, 7 days ago
          { id: 'today', date: '2026-10-20T10:00Z', ...finished },
          { id: 'past-postponed', date: '2026-10-15T10:00Z', state: 'post', name: 'STATUS_POSTPONED' },
          { id: 'live', date: '2026-10-20T11:00Z', state: 'in', name: 'STATUS_FIRST_HALF' },
        ],
      }),
    })
    expect(results.map((m) => m.id)).toEqual(['today', 'oldest'])
    expect(results[0].score).toEqual({ home: 0, away: 0 })
  })

  it('sorts newest first, then competition order, and leaves upcoming unchanged', async () => {
    const { results, upcoming } = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'ita.1': [
          { id: 'ita-sat', date: '2026-10-18T15:00Z', ...finished },
          { id: 'ita-next', date: '2026-10-22T19:00Z' },
        ],
        'eng.1': [
          { id: 'eng-sat', date: '2026-10-18T15:00Z', ...finished },
          { id: 'eng-sun', date: '2026-10-19T15:00Z', ...finished },
        ],
      }),
    })
    expect(results.map((m) => m.id)).toEqual(['eng-sun', 'eng-sat', 'ita-sat'])
    expect(upcoming.map((m) => m.id)).toEqual(['ita-next'])
  })

  it('requests each competition once per month in the combined range', async () => {
    const fetchImpl = fakeFetch({})
    await getMatchList({ now: new Date('2026-10-03T12:00:00Z'), fetchImpl })
    const urls = fetchImpl.mock.calls.map(([input]) => String(input))
    expect(urls).toHaveLength(COMPETITIONS.length * 2)
    expect(urls).toContain(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=202609',
    )
    expect(urls).toContain(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=202610',
    )
  })

  it('shares failed competitions with the upcoming list', async () => {
    const result = await getMatchList({
      now: NOW,
      fetchImpl: fakeFetch({
        'eng.1': [{ id: 'r', date: '2026-10-18T15:00Z', ...finished }],
        'esp.1': 500,
      }),
    })
    expect(result.results.map((m) => m.id)).toEqual(['r'])
    expect(result.failedCompetitionIds).toEqual(['esp.1'])
  })
})

describe('getMatchDetails', () => {
  const match: Match = {
    id: '401879272',
    homeTeam: { id: '382', name: 'Manchester City' },
    awayTeam: { id: '366', name: 'Sunderland' },
    competition: { id: 'eng.1', name: 'English Premier League' },
    startTime: '2026-09-20T13:00:00.000Z',
    status: 'live',
    events: [],
  }
  const summary = {
    header: {
      competitions: [
        {
          status: { type: { name: 'STATUS_SECOND_HALF', state: 'in' } },
          competitors: [
            { homeAway: 'home', score: '1' },
            { homeAway: 'away', score: '0' },
          ],
        },
      ],
    },
    keyEvents: [
      {
        id: 'g1',
        type: { type: 'goal' },
        clock: { value: 600, displayValue: "10'" },
        team: { id: '382' },
        scoringPlay: true,
        participants: [{ athlete: { displayName: 'Erling Haaland' } }],
      },
    ],
  }

  it('requests the summary for the match over HTTPS and normalizes it', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(summary)))
    const details = await getMatchDetails(match, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=401879272',
    )
    expect(details).toMatchObject({
      status: 'live',
      score: { home: 1, away: 0 },
      events: [{ id: 'g1', type: 'goal', minute: "10'", teamId: '382', player: 'Erling Haaland' }],
    })
  })

  it.each([
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['a timeout', () => Promise.reject(new DOMException('Timed out', 'TimeoutError'))],
    ['an HTTP error', async () => new Response('', { status: 404 })],
    ['invalid JSON', async () => new Response('{nope')],
    ['an unusable body', async () => new Response('[]')],
  ])('throws MatchDetailsError for %s', async (_label, reply) => {
    await expect(getMatchDetails(match, { fetchImpl: vi.fn(reply) })).rejects.toBeInstanceOf(
      MatchDetailsError,
    )
  })

  it('does not wrap unexpected errors', async () => {
    const bug = new RangeError('bug')
    const broken = {
      ...match,
      get homeTeam(): Match['homeTeam'] {
        throw bug
      },
    }
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(summary)))
    await expect(getMatchDetails(broken, { fetchImpl })).rejects.toBe(bug)
  })
})

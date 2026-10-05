import { describe, expect, it, vi } from 'vitest'
import {
  allCompetitionsFailed,
  COMPETITIONS,
  competitionsToLoad,
  DEFAULT_COMPETITIONS,
  EXTRA_COMPETITIONS,
  getMatchDetails,
  getMatchList,
  getTeamCatalog,
  MatchDetailsError,
} from './football.ts'
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
      DEFAULT_COMPETITIONS.map(
        (c) =>
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${c.id}/scoreboard?dates=202610`,
      ),
    )
  })

  it('sends no referrer', async () => {
    const fetchImpl = fakeFetch({})
    await getMatchList({ now: NOW, fetchImpl })
    const inits = fetchImpl.mock.calls.map((call) => (call as unknown[])[1] as RequestInit)
    expect(inits.every((init) => init.referrerPolicy === 'no-referrer')).toBe(true)
  })

  it('requests two months per competition near a month boundary', async () => {
    const fetchImpl = fakeFetch({})
    await getMatchList({ now: new Date('2026-10-28T12:00:00Z'), fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(DEFAULT_COMPETITIONS.length * 2)
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
      failedCompetitionIds: DEFAULT_COMPETITIONS.map((c) => c.id),
      competitionIds: DEFAULT_COMPETITIONS.map((c) => c.id),
      failureReason: 'unavailable',
    })
  })
})

describe('failure reasons', () => {
  const online = () => true
  const offline = () => false

  it.each([
    ['a network error while online', new TypeError('Failed to fetch'), online, 'unavailable'],
    ['a network error while offline', new TypeError('Failed to fetch'), offline, 'offline'],
    ['a timeout while online', new DOMException('Timed out', 'TimeoutError'), online, 'unavailable'],
    ['a timeout while offline', new DOMException('Timed out', 'TimeoutError'), offline, 'offline'],
    ['HTTP 429', 429, online, 'rate-limited'],
    ['HTTP 503', 503, online, 'unavailable'],
    ['HTTP 404', 404, online, 'unavailable'],
    ['invalid JSON', 'bad-json', online, 'invalid'],
    ['an unusable body', 'bad-shape', online, 'invalid'],
  ] as const)('classifies %s in the match list', async (_label, reply, isOnline, reason) => {
    const result = await getMatchList({ now: NOW, isOnline, fetchImpl: fakeFetch({ 'eng.1': reply }) })
    expect(result.failedCompetitionIds).toEqual(['eng.1'])
    expect(result.failureReason).toBe(reason)
  })

  it('reports the most relevant reason when competitions fail differently', async () => {
    const replies = (extra: Record<string, Reply>): Record<string, Reply> => ({
      'eng.1': 'bad-json',
      'esp.1': 503,
      ...extra,
    })
    const reasonFor = async (extra: Record<string, Reply>, isOnline = online) =>
      (await getMatchList({ now: NOW, isOnline, fetchImpl: fakeFetch(replies(extra)) })).failureReason
    expect(await reasonFor({})).toBe('unavailable')
    expect(await reasonFor({ 'ita.1': 429 })).toBe('rate-limited')
    expect(await reasonFor({ 'ita.1': 429, 'ger.1': new TypeError('Failed') }, offline)).toBe(
      'offline',
    )
  })

  it('leaves the reason out when nothing failed', async () => {
    const result = await getMatchList({ now: NOW, fetchImpl: fakeFetch({}) })
    expect(result).not.toHaveProperty('failureReason')
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
    expect(urls).toHaveLength(DEFAULT_COMPETITIONS.length * 2)
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

  it.each([
    ['a network error while offline', () => Promise.reject(new TypeError('Failed')), false, 'offline'],
    ['a network error while online', () => Promise.reject(new TypeError('Failed')), true, 'unavailable'],
    ['HTTP 429', async () => new Response('', { status: 429 }), true, 'rate-limited'],
    ['HTTP 500', async () => new Response('', { status: 500 }), true, 'unavailable'],
    ['invalid JSON', async () => new Response('{nope'), true, 'invalid'],
    ['an unusable body', async () => new Response('[]'), true, 'invalid'],
  ] as const)('gives the reason for %s', async (_label, reply, connected, reason) => {
    const error = await getMatchDetails(match, {
      fetchImpl: vi.fn(reply),
      isOnline: () => connected,
    }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(MatchDetailsError)
    expect((error as MatchDetailsError).reason).toBe(reason)
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

describe('getTeamCatalog', () => {
  function teamsResponse(teams: { id: string; name: string }[]) {
    return {
      children: [
        { standings: { entries: teams.map(({ id, name }) => ({ team: { id, displayName: name } })) } },
      ],
    }
  }

  function teamsFetch(replies: Record<string, { id: string; name: string }[] | number>) {
    return vi.fn<typeof fetch>(async (input) => {
      const slug = String(input).split('/soccer/')[1].split('/')[0]
      const reply = replies[slug] ?? []
      if (typeof reply === 'number') return new Response('', { status: reply })
      return new Response(JSON.stringify(teamsResponse(reply)))
    })
  }

  it('requests every competition once over HTTPS', async () => {
    const fetchImpl = teamsFetch({})
    await getTeamCatalog({ fetchImpl })
    expect(fetchImpl.mock.calls.map(([input]) => String(input))).toEqual(
      DEFAULT_COMPETITIONS.map(
        (c) => `https://site.api.espn.com/apis/v2/sports/soccer/${c.id}/standings`,
      ),
    )
  })

  it('dedupes clubs across competitions and sorts by name', async () => {
    const { teams, failedCompetitionIds } = await getTeamCatalog({
      fetchImpl: teamsFetch({
        'eng.1': [
          { id: '382', name: 'Manchester City' },
          { id: '359', name: 'Arsenal' },
        ],
        'uefa.champions': [
          { id: '359', name: 'Arsenal' },
          { id: '1068', name: 'Atlético Madrid' },
        ],
      }),
    })
    expect(teams.map((t) => t.name)).toEqual(['Arsenal', 'Atlético Madrid', 'Manchester City'])
    expect(failedCompetitionIds).toEqual([])
  })

  it('reports failed competitions and keeps the rest', async () => {
    const result = await getTeamCatalog({
      fetchImpl: teamsFetch({ 'eng.1': [{ id: '359', name: 'Arsenal' }], 'esp.1': 503 }),
    })
    expect(result.teams.map((t) => t.id)).toEqual(['359'])
    expect(result.failedCompetitionIds).toEqual(['esp.1'])
    expect(result.failureReason).toBe('unavailable')
  })

  it('reports rate limiting and leaves the reason out when nothing failed', async () => {
    expect((await getTeamCatalog({ fetchImpl: teamsFetch({ 'eng.1': 429 }) })).failureReason).toBe(
      'rate-limited',
    )
    expect(await getTeamCatalog({ fetchImpl: teamsFetch({}) })).not.toHaveProperty('failureReason')
  })

  it('reports every competition when all fail', async () => {
    const result = await getTeamCatalog({
      fetchImpl: vi.fn<typeof fetch>(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })
    expect(result).toEqual({
      teams: [],
      failedCompetitionIds: DEFAULT_COMPETITIONS.map((c) => c.id),
      competitionIds: DEFAULT_COMPETITIONS.map((c) => c.id),
      failureReason: 'unavailable',
    })
  })

  it('does not fold unexpected errors into failed competitions', async () => {
    const bug = new RangeError('bug')
    const body = {
      get children(): unknown {
        throw bug
      },
    }
    // fetchJson wraps anything fetch throws as an expected failure, so the error comes from parsing.
    const fetchImpl = vi.fn<typeof fetch>(async () => ({ ok: true, json: async () => body }) as Response)
    await expect(getTeamCatalog({ fetchImpl })).rejects.toBe(bug)
  })
})

describe('competition catalog', () => {
  const defaultIds = DEFAULT_COMPETITIONS.map((c) => c.id)

  it('lists every competition with the defaults first', () => {
    expect(COMPETITIONS.map((c) => c.id)).toEqual([
      ...defaultIds,
      ...EXTRA_COMPETITIONS.map((c) => c.id),
    ])
    expect(defaultIds).toEqual(['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions'])
  })

  it('loads only the defaults when nothing extra is followed', () => {
    expect(competitionsToLoad([]).map((c) => c.id)).toEqual(defaultIds)
  })

  it('appends followed extras in catalog order and ignores defaults and unknown ids', () => {
    const ids = competitionsToLoad(['caf.nations', 'eng.1', 'mar.1', 'fifa.friendly']).map((c) => c.id)
    expect(ids).toEqual([...defaultIds, 'fifa.friendly', 'caf.nations'])
  })

  it('knows when every requested competition failed', () => {
    expect(allCompetitionsFailed({ failedCompetitionIds: ['a', 'b'], competitionIds: ['a', 'b'] })).toBe(true)
    expect(allCompetitionsFailed({ failedCompetitionIds: ['a'], competitionIds: ['a', 'b'] })).toBe(false)
    expect(allCompetitionsFailed({ failedCompetitionIds: [], competitionIds: ['a'] })).toBe(false)
  })
})

describe('requested competitions', () => {
  const slugOf = (input: RequestInfo | URL) => String(input).split('/soccer/')[1].split('/')[0]

  it('requests only the passed competitions and reports them', async () => {
    const fetchImpl = fakeFetch({})
    const competitions = competitionsToLoad(['fifa.friendly'])
    const result = await getMatchList({ now: NOW, fetchImpl, competitions })
    const slugs = new Set(fetchImpl.mock.calls.map(([input]) => slugOf(input)))
    expect([...slugs]).toEqual(competitions.map((c) => c.id))
    expect(result.competitionIds).toEqual(competitions.map((c) => c.id))
  })

  it('skips catalog competitions without tables', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ children: [] })))
    const competitions = competitionsToLoad(['fifa.friendly', 'caf.nations'])
    const result = await getTeamCatalog({ fetchImpl, competitions })
    const slugs = fetchImpl.mock.calls.map(([input]) => slugOf(input))
    expect(slugs).not.toContain('fifa.friendly')
    expect(slugs).toContain('caf.nations')
    expect(result.competitionIds).toEqual(slugs)
  })
})

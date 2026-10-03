import { describe, expect, it, vi } from 'vitest'
import { COMPETITIONS, getUpcomingMatches } from './football.ts'

const NOW = new Date('2026-10-20T12:00:00Z') // window: 2026-10-19T23:00Z to 2026-10-28T00:00Z

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

describe('getUpcomingMatches', () => {
  it('requests every competition for each month over HTTPS', async () => {
    const fetchImpl = fakeFetch({})
    await getUpcomingMatches({ now: NOW, fetchImpl })
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
    await getUpcomingMatches({ now: new Date('2026-10-28T12:00:00Z'), fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(COMPETITIONS.length * 2)
  })

  it('keeps only matches inside the local window', async () => {
    const { matches } = await getUpcomingMatches({
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
    const { matches } = await getUpcomingMatches({
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
    const { matches } = await getUpcomingMatches({
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
    const result = await getUpcomingMatches({
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
    expect(result.matches.map((m) => m.id)).toEqual(['ok'])
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
    const result = await getUpcomingMatches({ now: new Date('2026-10-28T12:00:00Z'), fetchImpl })
    expect(result.failedCompetitionIds).toEqual(['eng.1'])
  })

  it('reports every competition when all fail', async () => {
    const result = await getUpcomingMatches({
      now: NOW,
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })
    expect(result).toEqual({
      matches: [],
      failedCompetitionIds: COMPETITIONS.map((c) => c.id),
    })
  })
})

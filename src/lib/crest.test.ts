import { describe, expect, it } from 'vitest'
import type { Match } from '../api/types.ts'
import { collectLogos, initials, safeImageUrl } from './crest.ts'

describe('safeImageUrl', () => {
  it('accepts https URLs', () => {
    const url = 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png'
    expect(safeImageUrl(url)).toBe(url)
  })

  it.each([
    'http://a.espncdn.com/359.png',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    '/i/teamlogos/359.png',
    '',
    '   ',
    42,
    null,
    undefined,
    { href: 'https://x/1.png' },
  ])('rejects %j', (value) => {
    expect(safeImageUrl(value)).toBeUndefined()
  })
})

describe('initials', () => {
  it.each([
    ['Manchester City', 'MC'],
    ['Arsenal', 'AR'],
    ['1. FC Köln', 'FK'],
    ['Paris Saint-Germain', 'PS'],
    ['', ''],
    ['  ', ''],
  ])('gives %j → %j', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('collectLogos', () => {
  const match = (id: string, home: string, away: string, logo?: string) =>
    ({
      id,
      homeTeam: { id: home, name: home, logo: `https://x/${home}.png` },
      awayTeam: { id: away, name: away },
      competition: { id: 'eng.1', name: 'Premier League', ...(logo && { logo }) },
    }) as Match

  it('maps team and competition ids to safe logos, first seen winning', () => {
    const { teams, competitions } = collectLogos(
      [match('1', 'a', 'b', 'https://x/eng.png'), match('2', 'a', 'c', 'https://x/other.png')],
      [{ id: 'b', name: 'b', logo: 'https://x/b.png' }, { id: 'a', name: 'a', logo: 'https://x/late.png' }],
    )
    expect(Object.fromEntries(teams)).toEqual({ a: 'https://x/a.png', b: 'https://x/b.png' })
    expect(Object.fromEntries(competitions)).toEqual({ 'eng.1': 'https://x/eng.png' })
  })

  it('skips missing and unsafe logos', () => {
    const { teams, competitions } = collectLogos(
      [match('1', 'a', 'b', 'http://x/eng.png')],
      [{ id: 'c', name: 'c', logo: 'javascript:alert(1)' }],
    )
    expect([...teams.keys()]).toEqual(['a'])
    expect(competitions.size).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { foldText, searchTeams } from './search.ts'

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

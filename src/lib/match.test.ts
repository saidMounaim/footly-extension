import { describe, expect, it } from 'vitest'
import type { Match, MatchEvent } from '../api/types.ts'
import { goalScorers } from './match.ts'

function match(events: MatchEvent[]): Match {
  return {
    id: 'm',
    homeTeam: { id: 'h', name: 'Home' },
    awayTeam: { id: 'a', name: 'Away' },
    competition: { id: 'eng.1', name: 'Premier League' },
    startTime: '2026-10-04T14:00:00Z',
    status: 'finished',
    score: { home: 2, away: 2 },
    events,
  }
}

describe('goalScorers', () => {
  it('lists each side’s goals in timeline order and skips other events', () => {
    const result = goalScorers(
      match([
        { id: '1', type: 'goal', minute: "12'", teamId: 'h', player: 'Saka' },
        { id: '2', type: 'yellow-card', minute: "20'", teamId: 'a', player: 'Rice' },
        { id: '3', type: 'goal', minute: "40'", teamId: 'a', player: 'Palmer' },
        { id: '4', type: 'goal', minute: "81'", teamId: 'h', player: 'Havertz' },
      ]),
    )
    expect(result.home).toEqual([
      { id: '1', minute: "12'", player: 'Saka' },
      { id: '4', minute: "81'", player: 'Havertz' },
    ])
    expect(result.away).toEqual([{ id: '3', minute: "40'", player: 'Palmer' }])
  })

  it('marks penalties, and keeps an own goal under the team it counted for', () => {
    // ESPN names the benefiting team on an own goal ("Own Goal by Thiaw, Newcastle" for Bournemouth).
    const result = goalScorers(
      match([
        { id: '1', type: 'penalty-goal', minute: "30'", teamId: 'h', player: 'Ødegaard' },
        { id: '2', type: 'own-goal', minute: "55'", teamId: 'a', player: 'Saliba' },
        { id: '3', type: 'penalty-missed', minute: "70'", teamId: 'a', player: 'Palmer' },
      ]),
    )
    expect(result.home).toEqual([{ id: '1', minute: "30'", player: 'Ødegaard', suffix: '(pen)' }])
    expect(result.away).toEqual([{ id: '2', minute: "55'", player: 'Saliba', suffix: '(OG)' }])
  })

  it('leaves out goals without a team and keeps goals without a scorer', () => {
    const result = goalScorers(
      match([
        { id: '1', type: 'goal', minute: "5'" },
        { id: '2', type: 'goal', minute: "9'", teamId: 'h' },
      ]),
    )
    expect(result).toEqual({ home: [{ id: '2', minute: "9'" }], away: [] })
  })

  it('gives two empty lists without goals', () => {
    expect(goalScorers(match([]))).toEqual({ home: [], away: [] })
  })
})

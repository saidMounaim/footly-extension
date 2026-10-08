import { describe, expect, it } from 'vitest'
import type { Lineup, Match, MatchEvent } from '../api/types.ts'
import { goalScorers, substituteEntries } from './match.ts'

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

describe('substituteEntries', () => {
  const lineup: Lineup = {
    starters: [{ id: '1', name: 'Bukayo Saka' }],
    substitutes: [
      { id: '11', name: 'Gabriel Martinelli', jersey: '11' },
      { id: '20', name: 'Jorginho', jersey: '20' },
      { id: '22', name: 'David Raya', jersey: '22' },
    ],
  }
  const sub = (id: string, minute: string, player: string, teamId = 'h', playerOff?: string): MatchEvent => ({
    id,
    type: 'substitution',
    minute,
    teamId,
    player,
    ...(playerOff && { playerOff }),
  })
  const ids = (players: { id: string }[]) => players.map((player) => player.id)

  it('lists matched subs with their minute and the player they replaced', () => {
    const { used } = substituteEntries(lineup, [sub('e1', "67'", 'Gabriel Martinelli', 'h', 'Bukayo Saka')], 'h')
    expect(used).toEqual([{ player: lineup.substitutes[0], minute: "67'", playerOff: 'Bukayo Saka' }])
  })

  it('leaves out playerOff when the event names nobody going off', () => {
    const { used } = substituteEntries(lineup, [sub('e1', "81'", 'Jorginho')], 'h')
    expect(used).toEqual([{ player: lineup.substitutes[1], minute: "81'" }])
  })

  it('orders used subs by the events and unused ones by the roster', () => {
    const { used, unused } = substituteEntries(
      lineup,
      [sub('e1', "60'", 'David Raya'), sub('e2', "75'", 'Gabriel Martinelli')],
      'h',
    )
    expect(used.map((entry) => entry.player.id)).toEqual(['22', '11'])
    expect(ids(unused)).toEqual(['20'])
  })

  it('counts unmatched names and other event types as unused', () => {
    const goal: MatchEvent = { id: 'g', type: 'goal', minute: "10'", teamId: 'h', player: 'Jorginho' }
    const { used, unused } = substituteEntries(lineup, [goal, sub('e1', "70'", 'Someone Else')], 'h')
    expect(used).toEqual([])
    expect(ids(unused)).toEqual(['11', '20', '22'])
  })

  it('ignores the same name coming on for the other team', () => {
    const { used } = substituteEntries(lineup, [sub('e1', "70'", 'Jorginho', 'a')], 'h')
    expect(used).toEqual([])
  })

  it('keeps the first of duplicate events', () => {
    const { used } = substituteEntries(lineup, [sub('e1', "70'", 'Jorginho'), sub('e2', "88'", 'Jorginho')], 'h')
    expect(used).toEqual([{ player: lineup.substitutes[1], minute: "70'" }])
  })

  it('matches names despite surrounding whitespace', () => {
    const { used } = substituteEntries(lineup, [sub('e1', "70'", '  Jorginho ')], 'h')
    expect(used.map((entry) => entry.player.id)).toEqual(['20'])
  })

  it('lists everyone as unused without events', () => {
    const { used, unused } = substituteEntries(lineup, [], 'h')
    expect(used).toEqual([])
    expect(ids(unused)).toEqual(['11', '20', '22'])
  })
})

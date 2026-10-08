import { describe, expect, it } from 'vitest'
import type { LineupPlayer } from '../api/types.ts'
import { pitchLines } from './pitch.ts'

function players(positions: (string | undefined)[]): LineupPlayer[] {
  return positions.map((position, index) => ({
    id: String(index),
    name: `Player ${index}`,
    ...(position && { position }),
  }))
}

const positionsOf = (lines: LineupPlayer[][] | null) =>
  lines?.map((line) => line.map((player) => player.position))

describe('pitchLines', () => {
  // The order ESPN lists starters in the summary fixture.
  const fixture = ['G', 'CD-L', 'CD-R', 'LB', 'RB', 'AM', 'LM', 'RM', 'F', 'AM-L', 'AM-R']

  it('lays out a 4-2-3-1 from goalkeeper to striker, each line left to right', () => {
    expect(positionsOf(pitchLines(players(fixture), '4-2-3-1'))).toEqual([
      ['G'],
      ['LB', 'CD-L', 'CD-R', 'RB'],
      ['LM', 'RM'],
      ['AM-L', 'AM', 'AM-R'],
      ['F'],
    ])
  })

  it('groups by position line when there is no usable formation', () => {
    expect(pitchLines(players(fixture))?.map((line) => line.length)).toEqual([1, 4, 2, 3, 1])
    // 4-4-3 needs 11 outfield players, so it can't be the shape of these 10.
    expect(pitchLines(players(fixture), '4-4-3')?.map((line) => line.length)).toEqual([1, 4, 2, 3, 1])
  })

  it('follows the formation where positions alone would misplace players', () => {
    // A 3-1-4-2 from ESPN: the sweeper is the holding midfielder.
    const threeOneFourTwo = ['G', 'RM', 'LM', 'CD', 'CD-R', 'CD-L', 'CM-R', 'SW', 'CF-R', 'CF-L', 'CM-L']
    expect(positionsOf(pitchLines(players(threeOneFourTwo), '3-1-4-2'))).toEqual([
      ['G'],
      ['CD-L', 'CD', 'CD-R'],
      ['SW'],
      ['LM', 'CM-L', 'CM-R', 'RM'],
      ['CF-L', 'CF-R'],
    ])
    // A 3-4-2-1: the lone striker leads, the inside forwards sit behind.
    const threeFourTwoOne = ['G', 'RM', 'LM', 'CD-L', 'CD', 'CD-R', 'CM-R', 'CM-L', 'F', 'CF-R', 'CF-L']
    expect(positionsOf(pitchLines(players(threeFourTwoOne), '3-4-2-1'))?.slice(3)).toEqual([
      ['CF-L', 'CF-R'],
      ['F'],
    ])
  })

  it('gives null when a starter has no position or an unknown one', () => {
    expect(pitchLines(players([...fixture.slice(0, 10), undefined]), '4-2-3-1')).toBeNull()
    expect(pitchLines(players([...fixture.slice(0, 10), 'XX']), '4-2-3-1')).toBeNull()
    expect(pitchLines([])).toBeNull()
  })
})

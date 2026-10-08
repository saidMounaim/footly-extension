import type { LineupPlayer } from '../api/types.ts'

/** Pitch line of each ESPN soccer position, goalkeeper (0) to forwards (5). */
const LINE: Readonly<Record<string, number>> = {
  G: 0,
  D: 1, CD: 1, 'CD-L': 1, 'CD-R': 1, SW: 1, LB: 1, RB: 1, LWB: 1, RWB: 1,
  DM: 2, 'DM-L': 2, 'DM-R': 2,
  M: 3, CM: 3, 'CM-L': 3, 'CM-R': 3, LM: 3, RM: 3,
  AM: 4, 'AM-L': 4, 'AM-R': 4, LW: 4, RW: 4,
  F: 5, CF: 5, 'CF-L': 5, 'CF-R': 5, LF: 5, RF: 5, S: 5, ST: 5,
}

/**
 * Within a line, positions that sit further from their own goal: a sweeper in
 * a 3-1-4-2 plays in front of the back three, and central strikers lead the
 * line ahead of inside forwards in a 3-4-2-1.
 */
const DEEPER_IN_LINE = new Set(['SW', 'F', 'CF', 'S', 'ST'])

/** Left to right as the team attacks: wide left, inside left, centre, inside right, wide right. */
function lateral(position: string): number {
  if (['LB', 'LWB', 'LM', 'LW', 'LF'].includes(position)) return 0
  if (position.endsWith('-L')) return 1
  if (position.endsWith('-R')) return 3
  if (['RB', 'RWB', 'RM', 'RW', 'RF'].includes(position)) return 4
  return 2
}

/** Outfield line sizes from a formation like "4-2-3-1", or null when it doesn't fit `outfield`. */
function formationLines(formation: string | undefined, outfield: number): number[] | null {
  if (!formation || !/^\d+(-\d+)+$/.test(formation)) return null
  const sizes = formation.split('-').map(Number)
  if (sizes.some((size) => size === 0)) return null
  return sizes.reduce((sum, size) => sum + size, 0) === outfield ? sizes : null
}

/**
 * Starters arranged on the pitch: lines from goalkeeper to forwards, each left
 * to right. Players are ordered by their ESPN position, then cut into lines by
 * the formation when it fits, otherwise grouped by position line. Null when any
 * starter has no position or one this mapping doesn't know.
 */
export function pitchLines(starters: readonly LineupPlayer[], formation?: string): LineupPlayer[][] | null {
  if (starters.length === 0) return null
  if (starters.some((player) => !player.position || LINE[player.position] === undefined)) return null
  const lineOf = (player: LineupPlayer) => LINE[player.position as string]
  const depth = (player: LineupPlayer) =>
    lineOf(player) * 2 + (DEEPER_IN_LINE.has(player.position as string) ? 1 : 0)
  const byLateral = (a: LineupPlayer, b: LineupPlayer) =>
    lateral(a.position as string) - lateral(b.position as string)

  const keepers = starters.filter((player) => lineOf(player) === 0)
  const outfield = starters.filter((player) => lineOf(player) !== 0).sort((a, b) => depth(a) - depth(b))

  const sizes = formationLines(formation, outfield.length)
  const lines: LineupPlayer[][] = []
  if (sizes) {
    let start = 0
    for (const size of sizes) {
      lines.push(outfield.slice(start, start + size))
      start += size
    }
  } else {
    for (const player of outfield) {
      const last = lines.at(-1)
      if (last && lineOf(last[0]) === lineOf(player)) last.push(player)
      else lines.push([player])
    }
  }
  return [keepers, ...lines].filter((line) => line.length > 0).map((line) => [...line].sort(byLateral))
}

import type { Lineup, LineupPlayer, Match, MatchEvent, MatchEventType } from '../api/types.ts'

export interface GoalLine {
  id: string
  player?: string
  minute: string
  /** "(pen)" or "(OG)", as in the timeline. */
  suffix?: string
}

const GOAL_SUFFIX: Partial<Record<MatchEventType, string>> = {
  'penalty-goal': '(pen)',
  'own-goal': '(OG)',
}

const GOAL_TYPES = new Set<MatchEventType>(['goal', 'penalty-goal', 'own-goal'])

/**
 * Each side's goals in timeline order. ESPN credits an own goal to the team it
 * counted for, so every goal goes under its event's team; goals without one are
 * left out.
 */
export function goalScorers(match: Match): { home: GoalLine[]; away: GoalLine[] } {
  const home: GoalLine[] = []
  const away: GoalLine[] = []
  for (const event of match.events) {
    if (!GOAL_TYPES.has(event.type)) continue
    const side =
      event.teamId === match.homeTeam.id ? home : event.teamId === match.awayTeam.id ? away : null
    if (!side) continue
    const suffix = GOAL_SUFFIX[event.type]
    side.push({
      id: event.id,
      minute: event.minute,
      ...(event.player && { player: event.player }),
      ...(suffix && { suffix }),
    })
  }
  return { home, away }
}

export interface SubstituteEntry {
  player: LineupPlayer
  minute: string
  playerOff?: string
}

/**
 * A team's substitutes split into those who came on, in the order they did, and
 * the rest in roster order. Events name players while lineups carry ids, so a
 * substitute is matched by exact (trimmed) name to its team's first
 * substitution event; anyone unmatched counts as unused.
 */
export function substituteEntries(
  lineup: Lineup,
  events: MatchEvent[],
  teamId: string,
): { used: SubstituteEntry[]; unused: LineupPlayer[] } {
  const byName = new Map(lineup.substitutes.map((player) => [player.name.trim(), player]))
  const used: SubstituteEntry[] = []
  const cameOn = new Set<string>()
  for (const event of events) {
    if (event.type !== 'substitution' || event.teamId !== teamId || !event.player) continue
    const player = byName.get(event.player.trim())
    if (!player || cameOn.has(player.id)) continue
    cameOn.add(player.id)
    used.push({ player, minute: event.minute, ...(event.playerOff && { playerOff: event.playerOff }) })
  }
  return { used, unused: lineup.substitutes.filter((player) => !cameOn.has(player.id)) }
}

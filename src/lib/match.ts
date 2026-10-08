import type { Match, MatchEventType } from '../api/types.ts'

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

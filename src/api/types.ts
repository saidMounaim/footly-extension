export interface Team {
  id: string
  name: string
  shortName?: string
  logo?: string
}

export interface Competition {
  id: string
  name: string
  logo?: string
}

export type MatchStatus =
  | 'upcoming'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'

export type MatchEventType =
  | 'goal'
  | 'own-goal'
  | 'penalty-goal'
  | 'penalty-missed'
  | 'yellow-card'
  | 'red-card'
  | 'substitution'

export interface MatchEvent {
  id: string
  type: MatchEventType
  /** Provider display minute, e.g. "23'" or "90'+4'". */
  minute: string
  /** Id of the home or away team, when the provider names one of them. */
  teamId?: string
  /** Scorer, carded player, or substitute coming on. */
  player?: string
  /** Substitutions only: the player going off. */
  playerOff?: string
}

export interface Match {
  id: string
  homeTeam: Team
  awayTeam: Team
  competition: Competition
  /** ISO 8601 UTC timestamp. */
  startTime: string
  status: MatchStatus
  /** Only set for live, halftime, and finished matches. */
  score?: { home: number; away: number }
  /** Chronological; empty when unknown or not loaded. */
  events: MatchEvent[]
}

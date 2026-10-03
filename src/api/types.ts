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

// Placeholder until feature 2 defines match events.
export interface MatchEvent {
  id: string
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
  events: MatchEvent[]
}

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
  /** From the match summary; only stats both sides have. Missing when unavailable. */
  stats?: { home: TeamMatchStats; away: TeamMatchStats }
  /** From the match summary; missing unless both sides have starters. */
  lineups?: { home: Lineup; away: Lineup }
}

/** Basic team statistics; each value is optional because providers omit some. */
export interface TeamMatchStats {
  /** Percent, 0-100. */
  possession?: number
  shots?: number
  shotsOnTarget?: number
  corners?: number
  fouls?: number
}

export interface Lineup {
  /** E.g. "4-2-3-1". */
  formation?: string
  starters: LineupPlayer[]
  substitutes: LineupPlayer[]
}

export interface LineupPlayer {
  id: string
  name: string
  jersey?: string
  /** Short label, e.g. "G" or "CD-L". */
  position?: string
  /** https headshot URL; ESPN only sends one for players it has a photo of. */
  photo?: string
}

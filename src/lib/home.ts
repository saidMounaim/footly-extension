import type { CatalogCompetition, MatchListResult } from '../api/football.ts'
import type { Match } from '../api/types.ts'

export interface CompetitionSummary {
  id: string
  name: string
  /** Matches live or at half-time right now. */
  live: number
  /** The earliest match that hasn't started, or null when none is scheduled. */
  next: Match | null
}

/** One summary per requested competition, in the given order, for the Home cards. */
export function competitionSummaries(
  result: MatchListResult,
  competitions: readonly Pick<CatalogCompetition, 'id' | 'name'>[],
): CompetitionSummary[] {
  return competitions.map(({ id, name }) => {
    const matches = result.upcoming.filter((match) => match.competition.id === id)
    const live = matches.filter((m) => m.status === 'live' || m.status === 'halftime').length
    // `upcoming` is in kickoff order, so the first not-yet-started match is the next one.
    const next = matches.find((match) => match.status === 'upcoming') ?? null
    return { id, name, live, next }
  })
}

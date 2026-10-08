import {
  CLUB_EXTRAS,
  competitionsToLoad,
  NATIONAL_TEAM_EXTRAS,
  type CatalogCompetition,
  type MatchListResult,
} from '../api/football.ts'
import type { Match } from '../api/types.ts'
import type { MatchListState } from '../hooks/useMatchList.ts'

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

/** True when the main match list has loaded `id`, so its screen needs no request of its own. */
export function coversCompetition(state: MatchListState, id: string): boolean {
  return state.status === 'success' && state.result.competitionIds.includes(id)
}

export interface HomeSections {
  /** The defaults, then followed extras: the competitions the main list loads. */
  yours: CatalogCompetition[]
  /** Club extras not followed, in catalog order. */
  clubs: CatalogCompetition[]
  /** National-team extras not followed, in catalog order. */
  national: CatalogCompetition[]
}

/** Every competition for Home: what you follow first, then the rest by group. */
export function homeSections(followedIds: ReadonlySet<string>): HomeSections {
  const notFollowed = (competition: CatalogCompetition) => !followedIds.has(competition.id)
  return {
    yours: competitionsToLoad(followedIds),
    clubs: CLUB_EXTRAS.filter(notFollowed),
    national: NATIONAL_TEAM_EXTRAS.filter(notFollowed),
  }
}

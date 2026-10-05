import type { MatchListResult } from '../api/football.ts'
import type { Match, MatchEvent } from '../api/types.ts'
import { splitByCompetitions, splitByFavorites } from './favorites.ts'

/** Most matches shown in the Home "Next up" section. */
export const NEXT_UP_LIMIT = 5

export interface HomeSections {
  /** Live and halftime matches: favorite teams, then followed competitions, then the rest. */
  live: Match[]
  /** The earliest not-yet-started match of a favorite team. */
  nextMatch: Match | null
  /** Next not-yet-started matches of favorite teams or followed competitions. */
  nextUp: Match[]
}

/** Picks what the Home tab shows from the loaded match list; keeps kickoff order within groups. */
export function buildHome(
  result: MatchListResult,
  favoriteIds: ReadonlySet<string>,
  competitionIds: ReadonlySet<string>,
): HomeSections {
  const liveMatches = result.upcoming.filter(
    (match) => match.status === 'live' || match.status === 'halftime',
  )
  const { favorites, others: rest } = splitByFavorites(liveMatches, favoriteIds)
  const { favorites: followed, others } = splitByCompetitions(rest, competitionIds)
  const live = [...favorites, ...followed, ...others]

  const notStarted = result.upcoming.filter((match) => match.status === 'upcoming')
  const isFavorite = (match: Match) =>
    favoriteIds.has(match.homeTeam.id) || favoriteIds.has(match.awayTeam.id)
  const nextMatch = notStarted.find(isFavorite) ?? null

  const followsNothing = favoriteIds.size === 0 && competitionIds.size === 0
  const nextUp = notStarted
    .filter(
      (match) =>
        match !== nextMatch &&
        (followsNothing || isFavorite(match) || competitionIds.has(match.competition.id)),
    )
    .slice(0, NEXT_UP_LIMIT)

  return { live, nextMatch, nextUp }
}

/** The last `count` events, still in chronological order. */
export function recentEvents(events: MatchEvent[], count: number): MatchEvent[] {
  return count > 0 ? events.slice(-count) : []
}

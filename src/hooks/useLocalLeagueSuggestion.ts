import { useMemo } from 'react'
import {
  guessCountry,
  loadLocalLeagueAnswer,
  saveLocalLeagueAnswer,
  suggestionFor,
  type LocalLeagueAnswer,
  type LocalLeagueSuggestion,
} from '../lib/localLeague.ts'
import { useSavedValue } from './useSavedValue.ts'

const choose = (current: LocalLeagueAnswer | null, next: LocalLeagueAnswer) => next ?? current

/** Reads the browser's time zone and languages once; the guess stays in memory. */
function browserLocale() {
  let timeZone: string | undefined
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    timeZone = undefined
  }
  return { timeZone, languages: globalThis.navigator?.languages ?? [] }
}

export interface LocalLeagueSuggestionApi {
  /** What to offer now, or null when there's nothing to show. */
  suggestion: LocalLeagueSuggestion | null
  /** Saves the answer so the card never shows again; rolls back if saving fails. */
  answer: (answer: LocalLeagueAnswer) => void
  saveError: boolean
}

/**
 * The one-time local league card: shown only once both the saved answer and the
 * followed competitions have loaded, and never again after an answer.
 */
export function useLocalLeagueSuggestion(
  followedIds: readonly string[] | null,
): LocalLeagueSuggestionApi {
  const { value, ready, toggle, saveError } = useSavedValue(
    loadLocalLeagueAnswer,
    saveLocalLeagueAnswer,
    choose,
    null,
  )
  const country = useMemo(() => guessCountry(browserLocale()), [])
  const suggestion =
    ready && value === null && followedIds !== null ? suggestionFor(country, followedIds) : null
  return { suggestion, answer: toggle, saveError }
}

import type { FailureReason } from '../api/football.ts'

/** Why something the popup shows couldn't load; `unexpected` covers bugs. */
export type LoadFailure = FailureReason | 'unexpected'

const MESSAGES: Record<LoadFailure, { title: string; hint: string }> = {
  offline: {
    title: "You're offline.",
    hint: 'Footly will reload when your connection is back.',
  },
  'rate-limited': {
    title: 'The score provider is limiting requests.',
    hint: 'Wait a minute, then try again.',
  },
  unavailable: {
    title: "The score provider isn't responding.",
    hint: 'Try again in a moment.',
  },
  invalid: {
    title: 'Match data came back in an unexpected format.',
    hint: 'Try again later.',
  },
  unexpected: {
    title: 'Something went wrong.',
    hint: 'Try again.',
  },
}

/** The user-facing title and recovery hint for a failure; static text only. */
export function failureMessage(reason: LoadFailure): { title: string; hint: string } {
  return MESSAGES[reason]
}

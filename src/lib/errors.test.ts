import { describe, expect, it } from 'vitest'
import { failureMessage } from './errors.ts'

describe('failureMessage', () => {
  it.each([
    ['offline', "You're offline.", 'Footly will reload when your connection is back.'],
    ['rate-limited', 'The score provider is limiting requests.', 'Wait a minute, then try again.'],
    ['unavailable', "The score provider isn't responding.", 'Try again in a moment.'],
    ['invalid', 'Match data came back in an unexpected format.', 'Try again later.'],
    ['unexpected', 'Something went wrong.', 'Try again.'],
  ] as const)('describes %s', (reason, title, hint) => {
    expect(failureMessage(reason)).toEqual({ title, hint })
  })
})

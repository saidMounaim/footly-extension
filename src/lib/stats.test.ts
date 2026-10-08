import { describe, expect, it } from 'vitest'
import { statShares } from './stats.ts'

describe('statShares', () => {
  it('splits by each side’s share of the total', () => {
    expect(statShares(6, 4)).toEqual({ home: 60, away: 40 })
  })

  it('splits equal values in half', () => {
    expect(statShares(5, 5)).toEqual({ home: 50, away: 50 })
  })

  it('gives everything to the only side with a value', () => {
    expect(statShares(0, 3)).toEqual({ home: 0, away: 100 })
  })

  it('draws nothing when both sides are 0', () => {
    expect(statShares(0, 0)).toEqual({ home: 0, away: 0 })
  })

  it('keeps non-integer possession unrounded and summing to 100', () => {
    const shares = statShares(58.3, 41.7)
    expect(shares.home).toBeCloseTo(58.3)
    expect(shares.home + shares.away).toBeCloseTo(100)
  })

  it('treats negative and non-finite values as 0', () => {
    expect(statShares(-2, 4)).toEqual({ home: 0, away: 100 })
    expect(statShares(Number.NaN, 0)).toEqual({ home: 0, away: 0 })
    expect(statShares(Number.POSITIVE_INFINITY, 1)).toEqual({ home: 0, away: 100 })
  })
})

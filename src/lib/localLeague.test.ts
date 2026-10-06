import { describe, expect, it } from 'vitest'
import { FavoritesStorageError, type StorageArea } from './favorites.ts'
import {
  competitionNames,
  guessCountry,
  loadLocalLeagueAnswer,
  LOCAL_LEAGUE_SUGGESTION_KEY,
  parseLocalLeagueSuggestion,
  saveLocalLeagueAnswer,
  suggestionFor,
} from './localLeague.ts'

function memoryArea(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial }
  const area: StorageArea = {
    get: async (key) => (key in data ? { [key]: data[key] } : {}),
    set: async (items) => {
      Object.assign(data, items)
    },
  }
  return { area, data }
}

describe('guessCountry', () => {
  it('uses the time zone first', () => {
    expect(guessCountry({ timeZone: 'Europe/Amsterdam', languages: ['en-US'] })).toBe('NL')
    expect(guessCountry({ timeZone: 'Africa/Casablanca', languages: [] })).toBe('MA')
  })

  it('falls back to the first language with a region when the zone names no place', () => {
    expect(guessCountry({ timeZone: undefined, languages: ['fr', 'fr-MA', 'en-US'] })).toBe('MA')
    expect(guessCountry({ timeZone: undefined, languages: ['ar-ma'] })).toBe('MA')
    expect(guessCountry({ timeZone: 'UTC', languages: ['fr-MA'] })).toBe('MA')
    expect(guessCountry({ timeZone: 'Etc/GMT+1', languages: ['fr-MA'] })).toBe('MA')
  })

  it('ignores the language when the zone names a place we have no entry for', () => {
    expect(guessCountry({ timeZone: 'Europe/Berlin', languages: ['en-US'] })).toBeNull()
    expect(guessCountry({ timeZone: 'Europe/Paris', languages: ['fr-MA'] })).toBeNull()
  })

  it('makes no guess for London, whatever the language', () => {
    expect(guessCountry({ timeZone: 'Europe/London', languages: ['en-US'] })).toBeNull()
  })

  it('makes no guess without a mapped zone or a regional language', () => {
    expect(guessCountry({ timeZone: undefined, languages: [] })).toBeNull()
    expect(guessCountry({ timeZone: 'Asia/Tokyo', languages: ['ja', 'en'] })).toBeNull()
  })
})

describe('suggestionFor', () => {
  it("suggests the country's league when ESPN serves it", () => {
    expect(suggestionFor('NL', [])).toEqual({
      country: 'NL',
      competitionIds: ['ned.1'],
      label: 'Follow Eredivisie?',
    })
  })

  it('suggests national-team competitions where the league is not served', () => {
    expect(suggestionFor('MA', [])).toEqual({
      country: 'MA',
      competitionIds: ['caf.nations', 'fifa.worldq.caf'],
      label: "Follow Morocco's national-team matches?",
    })
    expect(suggestionFor('EG', [])?.competitionIds).toEqual(['caf.nations', 'fifa.worldq.caf'])
  })

  it('leaves out what is already followed and gives null when nothing is left', () => {
    expect(suggestionFor('MA', ['caf.nations'])?.competitionIds).toEqual(['fifa.worldq.caf'])
    expect(suggestionFor('MA', ['caf.nations', 'fifa.worldq.caf'])).toBeNull()
    expect(suggestionFor('NL', ['ned.1'])).toBeNull()
  })

  it('gives null for no country or one without a suggestion', () => {
    expect(suggestionFor(null, [])).toBeNull()
    expect(suggestionFor('GB', [])).toBeNull()
    expect(suggestionFor('JP', [])).toBeNull()
  })

  it('names the suggested competitions', () => {
    expect(competitionNames(['caf.nations', 'fifa.worldq.caf', 'xxx.9'])).toEqual([
      'Africa Cup of Nations',
      'World Cup Qualifying (Africa)',
    ])
  })
})

describe('local league answer storage', () => {
  it.each([
    [{ status: 'accepted' }, 'accepted'],
    [{ status: 'dismissed' }, 'dismissed'],
    [{ status: 'later' }, null],
    ['accepted', null],
    [null, null],
    [undefined, null],
  ])('parses %j as %j', (value, expected) => {
    expect(parseLocalLeagueSuggestion(value)).toBe(expected)
  })

  it('round-trips an answer without storing the country', async () => {
    const { area, data } = memoryArea()
    expect(await loadLocalLeagueAnswer(area)).toBeNull()
    await saveLocalLeagueAnswer(area, 'dismissed')
    expect(data[LOCAL_LEAGUE_SUGGESTION_KEY]).toEqual({ status: 'dismissed' })
    expect(await loadLocalLeagueAnswer(area)).toBe('dismissed')
  })

  it('wraps storage failures in FavoritesStorageError', async () => {
    const failing: StorageArea = {
      get: () => Promise.reject(new Error('quota')),
      set: () => Promise.reject(new Error('quota')),
    }
    await expect(loadLocalLeagueAnswer(failing)).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

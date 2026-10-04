import { describe, expect, it } from 'vitest'
import type { Match } from '../api/types.ts'
import {
  FAVORITE_TEAMS_KEY,
  FavoritesStorageError,
  loadFavoriteTeams,
  saveFavoriteTeams,
  splitByFavorites,
  toggleFavorite,
  type StorageArea,
} from './favorites.ts'

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

describe('loadFavoriteTeams', () => {
  it('gives an empty list when nothing is stored', async () => {
    expect(await loadFavoriteTeams(memoryArea().area)).toEqual([])
  })

  it('gives an empty list for a non-array value', async () => {
    const { area } = memoryArea({ [FAVORITE_TEAMS_KEY]: { id: '1' } })
    expect(await loadFavoriteTeams(area)).toEqual([])
  })

  it('drops invalid entries and duplicates, and ignores unknown fields', async () => {
    const { area } = memoryArea({
      [FAVORITE_TEAMS_KEY]: [
        { id: '359', name: 'Arsenal', shortName: 'Arsenal', extra: 'x' },
        null,
        'Chelsea',
        { id: '', name: 'Empty id' },
        { id: '363', name: '' },
        { id: 364, name: 'Numeric id' },
        { id: '382', name: 'Manchester City', shortName: 42 },
        { id: '359', name: 'Arsenal again' },
      ],
    })
    expect(await loadFavoriteTeams(area)).toEqual([
      { id: '359', name: 'Arsenal', shortName: 'Arsenal' },
      { id: '382', name: 'Manchester City' },
    ])
  })

  it('throws FavoritesStorageError when reading fails', async () => {
    const area: StorageArea = {
      get: () => Promise.reject(new Error('quota')),
      set: async () => {},
    }
    await expect(loadFavoriteTeams(area)).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

describe('saveFavoriteTeams', () => {
  it('writes the exact stored shape under the favorites key', async () => {
    const { area, data } = memoryArea()
    await saveFavoriteTeams(area, [
      { id: '359', name: 'Arsenal', shortName: 'Arsenal' },
      { id: '382', name: 'Manchester City' },
    ])
    expect(data).toEqual({
      [FAVORITE_TEAMS_KEY]: [
        { id: '359', name: 'Arsenal', shortName: 'Arsenal' },
        { id: '382', name: 'Manchester City' },
      ],
    })
  })

  it('throws FavoritesStorageError when writing fails', async () => {
    const area: StorageArea = {
      get: async () => ({}),
      set: () => Promise.reject(new Error('quota')),
    }
    await expect(saveFavoriteTeams(area, [])).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

describe('toggleFavorite', () => {
  const arsenal = { id: '359', name: 'Arsenal', shortName: 'Arsenal', logo: 'https://x/359.png' }

  it('adds to the end without extra fields', () => {
    const first = { id: '1', name: 'First' }
    expect(toggleFavorite([first], arsenal)).toEqual([
      first,
      { id: '359', name: 'Arsenal', shortName: 'Arsenal' },
    ])
  })

  it('removes an existing favorite by id', () => {
    expect(toggleFavorite([{ id: '359', name: 'Arsenal' }], arsenal)).toEqual([])
  })
})

describe('splitByFavorites', () => {
  const match = (id: string, home: string, away: string) =>
    ({ id, homeTeam: { id: home, name: home }, awayTeam: { id: away, name: away } }) as Match

  it('matches home or away teams and keeps order', () => {
    const matches = [match('a', '1', '2'), match('b', '3', '359'), match('c', '359', '4')]
    const { favorites, others } = splitByFavorites(matches, new Set(['359']))
    expect(favorites.map((m) => m.id)).toEqual(['b', 'c'])
    expect(others.map((m) => m.id)).toEqual(['a'])
  })

  it('keeps everything in others with no favorites', () => {
    const matches = [match('a', '1', '2')]
    expect(splitByFavorites(matches, new Set())).toEqual({ favorites: [], others: matches })
  })
})

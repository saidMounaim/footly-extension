import { describe, expect, it } from 'vitest'
import type { Match } from '../api/types.ts'
import {
  FAVORITE_COMPETITIONS_KEY,
  FAVORITE_TEAMS_KEY,
  FavoritesStorageError,
  loadFavoriteCompetitions,
  loadFavoriteTeams,
  saveFavoriteCompetitions,
  saveFavoriteTeams,
  splitByCompetitions,
  splitByFavorites,
  toggleFavorite,
  toggleId,
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

describe('favorite crests', () => {
  it('keeps a valid logo, drops an invalid one, and loads entries without one', async () => {
    const { area } = memoryArea({
      [FAVORITE_TEAMS_KEY]: [
        { id: '359', name: 'Arsenal', logo: 'https://a.espncdn.com/359.png' },
        { id: '382', name: 'Manchester City', logo: 'http://a.espncdn.com/382.png' },
        { id: '364', name: 'Liverpool' },
      ],
    })
    expect(await loadFavoriteTeams(area)).toEqual([
      { id: '359', name: 'Arsenal', logo: 'https://a.espncdn.com/359.png' },
      { id: '382', name: 'Manchester City' },
      { id: '364', name: 'Liverpool' },
    ])
  })

  it('saves the logo with the team', async () => {
    const { area, data } = memoryArea()
    await saveFavoriteTeams(area, [{ id: '359', name: 'Arsenal', logo: 'https://x/359.png' }])
    expect(data[FAVORITE_TEAMS_KEY]).toEqual([{ id: '359', name: 'Arsenal', logo: 'https://x/359.png' }])
  })
})

describe('toggleFavorite', () => {
  const arsenal = { id: '359', name: 'Arsenal', shortName: 'Arsenal', logo: 'https://x/359.png' }

  it('adds to the end, keeping the crest', () => {
    const first = { id: '1', name: 'First' }
    expect(toggleFavorite([first], { ...arsenal, extra: 'x' } as typeof arsenal)).toEqual([
      first,
      { id: '359', name: 'Arsenal', shortName: 'Arsenal', logo: 'https://x/359.png' },
    ])
  })

  it('drops an unsafe crest URL when adding', () => {
    expect(toggleFavorite([], { ...arsenal, logo: 'javascript:alert(1)' })).toEqual([
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

const failingArea: StorageArea = {
  get: () => Promise.reject(new Error('quota')),
  set: () => Promise.reject(new Error('quota')),
}

describe('loadFavoriteCompetitions', () => {
  it('gives an empty list when nothing is stored', async () => {
    expect(await loadFavoriteCompetitions(memoryArea().area)).toEqual([])
  })

  it('gives an empty list for a non-array value', async () => {
    const { area } = memoryArea({ [FAVORITE_COMPETITIONS_KEY]: 'eng.1' })
    expect(await loadFavoriteCompetitions(area)).toEqual([])
  })

  it('drops non-strings, unknown ids, and duplicates, keeping the first', async () => {
    const { area } = memoryArea({
      [FAVORITE_COMPETITIONS_KEY]: ['esp.1', 42, null, 'ned.1', 'eng.1', 'esp.1', { id: 'ita.1' }],
    })
    expect(await loadFavoriteCompetitions(area)).toEqual(['esp.1', 'eng.1'])
  })

  it('throws FavoritesStorageError when reading fails', async () => {
    await expect(loadFavoriteCompetitions(failingArea)).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

describe('saveFavoriteCompetitions', () => {
  it('writes exactly the id array under its own key', async () => {
    const { area, data } = memoryArea({ [FAVORITE_TEAMS_KEY]: [{ id: '359', name: 'Arsenal' }] })
    await saveFavoriteCompetitions(area, ['uefa.champions', 'eng.1'])
    expect(data).toEqual({
      [FAVORITE_TEAMS_KEY]: [{ id: '359', name: 'Arsenal' }],
      [FAVORITE_COMPETITIONS_KEY]: ['uefa.champions', 'eng.1'],
    })
  })

  it('throws FavoritesStorageError when writing fails', async () => {
    await expect(saveFavoriteCompetitions(failingArea, [])).rejects.toBeInstanceOf(
      FavoritesStorageError,
    )
  })
})

describe('toggleId', () => {
  it('adds to the end', () => {
    expect(toggleId(['eng.1'], 'esp.1')).toEqual(['eng.1', 'esp.1'])
  })

  it('removes an existing id', () => {
    expect(toggleId(['eng.1', 'esp.1'], 'eng.1')).toEqual(['esp.1'])
  })
})

describe('splitByCompetitions', () => {
  const match = (id: string, competition: string) =>
    ({ id, competition: { id: competition, name: competition } }) as Match

  it('matches on the competition id and keeps order', () => {
    const matches = [match('a', 'eng.1'), match('b', 'esp.1'), match('c', 'eng.1'), match('d', 'ita.1')]
    const { favorites, others } = splitByCompetitions(matches, new Set(['eng.1', 'ita.1']))
    expect(favorites.map((m) => m.id)).toEqual(['a', 'c', 'd'])
    expect(others.map((m) => m.id)).toEqual(['b'])
  })

  it('keeps everything in others with nothing followed', () => {
    const matches = [match('a', 'eng.1')]
    expect(splitByCompetitions(matches, new Set())).toEqual({ favorites: [], others: matches })
  })
})

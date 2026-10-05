import { describe, expect, it } from 'vitest'
import { applyTheme, cacheTheme, readCachedTheme, THEME_CACHE_KEY } from './theme.ts'

function element() {
  const attributes = new Map<string, string>()
  return {
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  }
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

const throwing = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('applyTheme', () => {
  it('sets data-theme for light and dark', () => {
    const root = element()
    applyTheme(root, 'dark')
    expect(root.attributes.get('data-theme')).toBe('dark')
    applyTheme(root, 'light')
    expect(root.attributes.get('data-theme')).toBe('light')
  })

  it('removes data-theme for the system theme', () => {
    const root = element()
    applyTheme(root, 'dark')
    applyTheme(root, 'system')
    expect(root.attributes.has('data-theme')).toBe(false)
  })
})

describe('theme cache', () => {
  it('round-trips a theme', () => {
    const storage = memoryStorage()
    cacheTheme(storage, 'light')
    expect(storage.data.get(THEME_CACHE_KEY)).toBe('light')
    expect(readCachedTheme(storage)).toBe('light')
  })

  it.each(['', 'blue', 'DARK'])('reads %j as the system theme', (value) => {
    expect(readCachedTheme(memoryStorage({ [THEME_CACHE_KEY]: value }))).toBe('system')
  })

  it('reads a missing value or storage as the system theme', () => {
    expect(readCachedTheme(memoryStorage())).toBe('system')
    expect(readCachedTheme(undefined)).toBe('system')
  })

  it('swallows storage errors', () => {
    expect(readCachedTheme(throwing)).toBe('system')
    expect(() => cacheTheme(throwing, 'dark')).not.toThrow()
  })
})

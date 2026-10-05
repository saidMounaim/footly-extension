import { DEFAULT_THEME, parseTheme, type Theme } from './settings.ts'

/** localStorage key mirroring the stored theme so it can be applied before the first paint. */
export const THEME_CACHE_KEY = 'footly-theme'

type CacheStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Forces light or dark on `root`; the system theme removes the override. */
export function applyTheme(root: Pick<HTMLElement, 'setAttribute' | 'removeAttribute'>, theme: Theme) {
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

/** The mirrored theme, or the system theme when it is missing, invalid, or unreadable. */
export function readCachedTheme(storage: CacheStorage | undefined): Theme {
  try {
    return parseTheme(storage?.getItem(THEME_CACHE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

/** Mirrors the theme; a failing localStorage only costs a flash on the next open. */
export function cacheTheme(storage: CacheStorage | undefined, theme: Theme) {
  try {
    storage?.setItem(THEME_CACHE_KEY, theme)
  } catch {
    // Ignored: chrome.storage.local still holds the theme.
  }
}

/** window.localStorage, or undefined where accessing it throws or it doesn't exist. */
export function pageStorage(): CacheStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

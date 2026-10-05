import { useEffect } from 'react'
import { DEFAULT_THEME, loadTheme, saveTheme, THEME_OPTIONS, type Theme } from '../lib/settings.ts'
import { applyTheme, cacheTheme, pageStorage } from '../lib/theme.ts'
import { useSavedValue } from './useSavedValue.ts'

export interface ThemeSettingApi {
  theme: Theme
  /** True once the saved theme was read; changes are ignored until then. */
  ready: boolean
  /** Selects a theme immediately; rolls back if saving fails. */
  select: (theme: Theme) => void
  /** The saved theme couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

const choose = (current: Theme, next: Theme): Theme => (THEME_OPTIONS.includes(next) ? next : current)

/** The popup theme persisted in chrome.storage.local and applied to the page; system by default. */
export function useThemeSetting(): ThemeSettingApi {
  const { value: theme, ready, toggle, loadError, saveError } = useSavedValue(
    loadTheme,
    saveTheme,
    choose,
    DEFAULT_THEME,
  )

  useEffect(() => {
    // Until the saved theme is read, keep the cached one main.tsx applied.
    if (!ready) return
    applyTheme(document.documentElement, theme)
    cacheTheme(pageStorage(), theme)
  }, [ready, theme])

  return { theme, ready, select: toggle, loadError, saveError }
}

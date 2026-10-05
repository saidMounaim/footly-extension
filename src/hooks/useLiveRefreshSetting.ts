import {
  DEFAULT_LIVE_REFRESH_MINUTES,
  LIVE_REFRESH_OPTIONS,
  loadLiveRefreshMinutes,
  saveLiveRefreshMinutes,
  type LiveRefreshMinutes,
} from '../lib/settings.ts'
import { useSavedValue } from './useSavedValue.ts'

export interface LiveRefreshSettingApi {
  minutes: LiveRefreshMinutes
  /** True once the saved interval was read; changes are ignored until then. */
  ready: boolean
  /** Selects an interval immediately; rolls back if saving fails. */
  select: (minutes: LiveRefreshMinutes) => void
  /** The saved interval couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

const choose = (current: LiveRefreshMinutes, next: LiveRefreshMinutes): LiveRefreshMinutes =>
  LIVE_REFRESH_OPTIONS.includes(next) ? next : current

/** How often the popup refreshes live matches, persisted in chrome.storage.local; 1 minute by default. */
export function useLiveRefreshSetting(): LiveRefreshSettingApi {
  const { value: minutes, ready, toggle, loadError, saveError } = useSavedValue(
    loadLiveRefreshMinutes,
    saveLiveRefreshMinutes,
    choose,
    DEFAULT_LIVE_REFRESH_MINUTES,
  )
  return { minutes, ready, select: toggle, loadError, saveError }
}

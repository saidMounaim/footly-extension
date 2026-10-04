import { loadNotificationsEnabled, saveNotificationsEnabled } from '../lib/notifications.ts'
import { useSavedValue } from './useSavedValue.ts'

export interface NotificationsSettingApi {
  enabled: boolean
  /** True once the saved switch was read; toggles are ignored until then. */
  ready: boolean
  /** Flips the switch immediately; rolls back if saving fails. */
  toggle: () => void
  /** The saved switch couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

const flip = (enabled: boolean) => !enabled

/** The match notifications switch persisted in chrome.storage.local, on by default. */
export function useNotificationsSetting(): NotificationsSettingApi {
  const { value: enabled, ready, toggle, loadError, saveError } = useSavedValue<boolean, void>(
    loadNotificationsEnabled,
    saveNotificationsEnabled,
    flip,
    true,
  )
  return { enabled, ready, toggle, loadError, saveError }
}

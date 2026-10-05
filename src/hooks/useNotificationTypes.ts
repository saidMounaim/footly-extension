import {
  DEFAULT_NOTIFICATION_TYPES,
  loadNotificationTypes,
  saveNotificationTypes,
  type NotificationType,
  type NotificationTypes,
} from '../lib/settings.ts'
import { useSavedValue } from './useSavedValue.ts'

export interface NotificationTypesApi {
  types: NotificationTypes
  /** True once the saved types were read; toggles are ignored until then. */
  ready: boolean
  /** Flips one type immediately; rolls back if saving fails. */
  toggle: (type: NotificationType) => void
  /** The saved types couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

const flipType = (types: NotificationTypes, type: NotificationType): NotificationTypes => ({
  ...types,
  [type]: !types[type],
})

/** The per-type notification switches persisted in chrome.storage.local, all on by default. */
export function useNotificationTypes(): NotificationTypesApi {
  const { value: types, ready, toggle, loadError, saveError } = useSavedValue(
    loadNotificationTypes,
    saveNotificationTypes,
    flipType,
    DEFAULT_NOTIFICATION_TYPES,
  )
  return { types, ready, toggle, loadError, saveError }
}

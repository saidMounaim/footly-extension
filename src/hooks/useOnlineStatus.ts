import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Only an explicit offline report counts; a missing navigator is treated as online. */
const getSnapshot = () => globalThis.navigator?.onLine !== false

/** Whether the browser reports a network connection, updated on `online`/`offline` events. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}

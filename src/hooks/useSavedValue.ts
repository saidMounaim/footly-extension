import { useCallback, useEffect, useRef, useState } from 'react'
import { FavoritesStorageError, type StorageArea } from '../lib/favorites.ts'

export interface SavedValue<V, Change> {
  value: V
  /** True once the saved value was read; changes are ignored until then. */
  ready: boolean
  /** Applies the change immediately; rolls back to the last saved value if saving fails. */
  toggle: (change: Change) => void
  /** The saved value couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

function reportUnexpected(error: unknown) {
  if (!(error instanceof FavoritesStorageError)) {
    console.error('Unexpected error while accessing favorites', error)
  }
}

/** chrome.storage.local when running as an extension; undefined on a plain page. */
function extensionStorage(): StorageArea | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome.storage?.local
}

function unavailable(): Promise<never> {
  return Promise.reject(new FavoritesStorageError('chrome.storage is not available'))
}

/**
 * A value persisted in chrome.storage.local, read once on mount and shown as
 * `initial` until then. `load`, `save`, `apply`, and `initial` must be stable
 * (module-level) values.
 */
export function useSavedValue<V, Change>(
  load: (area: StorageArea) => Promise<V>,
  save: (area: StorageArea, value: V) => Promise<void>,
  apply: (value: V, change: Change) => V,
  initial: V,
): SavedValue<V, Change> {
  const [value, setValue] = useState<V>(initial)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const latest = useRef<V>(initial)
  const saved = useRef<V>(initial)
  const readyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const storage = extensionStorage()
    ;(storage ? load(storage) : unavailable()).then(
      (loaded) => {
        if (cancelled) return
        latest.current = loaded
        saved.current = loaded
        readyRef.current = true
        setValue(loaded)
        setReady(true)
      },
      (failure: unknown) => {
        reportUnexpected(failure)
        if (!cancelled) setLoadError(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [load])

  const toggle = useCallback(
    (change: Change) => {
      if (!readyRef.current) return
      const next = apply(latest.current, change)
      latest.current = next
      setValue(next)
      const storage = extensionStorage()
      ;(storage ? save(storage, next) : unavailable()).then(
        () => {
          saved.current = next
          setSaveError(false)
        },
        (failure: unknown) => {
          reportUnexpected(failure)
          // Return to what is actually stored, unless a newer change is still in flight.
          if (latest.current === next) {
            latest.current = saved.current
            setValue(saved.current)
          }
          setSaveError(true)
        },
      )
    },
    [save, apply],
  )

  return { value, ready, toggle, loadError, saveError }
}

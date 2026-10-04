import { useCallback, useEffect, useRef, useState } from 'react'
import { FavoritesStorageError, type StorageArea } from '../lib/favorites.ts'

export interface SavedList<T, Change> {
  items: T[]
  /** True once the saved list was read; changes are ignored until then. */
  ready: boolean
  /** Applies the change immediately; rolls back to the last saved list if saving fails. */
  toggle: (change: Change) => void
  /** The saved list couldn't be read. */
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
 * A list persisted in chrome.storage.local, read once on mount. `load`, `save`,
 * and `apply` must be stable (module-level) functions.
 */
export function useSavedList<T, Change>(
  load: (area: StorageArea) => Promise<T[]>,
  save: (area: StorageArea, items: T[]) => Promise<void>,
  apply: (items: T[], change: Change) => T[],
): SavedList<T, Change> {
  const [items, setItems] = useState<T[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const latest = useRef<T[]>([])
  const saved = useRef<T[]>([])
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
        setItems(loaded)
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
      setItems(next)
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
            setItems(saved.current)
          }
          setSaveError(true)
        },
      )
    },
    [save, apply],
  )

  return { items, ready, toggle, loadError, saveError }
}

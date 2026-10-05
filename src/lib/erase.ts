import { THEME_CACHE_KEY } from './theme.ts'

export interface EraseTargets {
  storage: { clear(): Promise<void> }
  alarms: { clearAll(): Promise<unknown> }
  /** localStorage, or undefined where it isn't available. */
  page: Pick<Storage, 'removeItem'> | undefined
}

/**
 * Removes everything Footly keeps on this device. Storage goes first: if it
 * can't be cleared, this rejects and touches nothing else.
 */
export async function eraseFootlyData({ storage, alarms, page }: EraseTargets): Promise<void> {
  await storage.clear()
  await alarms.clearAll()
  try {
    page?.removeItem(THEME_CACHE_KEY)
  } catch {
    // Ignored: without chrome.storage the mirror only picks the theme for one more open.
  }
}

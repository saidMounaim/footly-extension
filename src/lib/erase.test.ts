import { describe, expect, it, vi } from 'vitest'
import { eraseFootlyData } from './erase.ts'
import { THEME_CACHE_KEY } from './theme.ts'

function targets() {
  const calls: string[] = []
  return {
    calls,
    storage: { clear: vi.fn(async () => void calls.push('storage')) },
    alarms: { clearAll: vi.fn(async () => void calls.push('alarms')) },
    page: { removeItem: vi.fn((key: string) => void calls.push(`page:${key}`)) },
  }
}

describe('eraseFootlyData', () => {
  it('clears storage, then alarms, then the theme mirror', async () => {
    const t = targets()
    await eraseFootlyData(t)
    expect(t.calls).toEqual(['storage', 'alarms', `page:${THEME_CACHE_KEY}`])
  })

  it('rejects without touching alarms or the mirror when storage fails', async () => {
    const t = targets()
    const failure = new Error('quota')
    t.storage.clear.mockRejectedValueOnce(failure)
    await expect(eraseFootlyData(t)).rejects.toBe(failure)
    expect(t.alarms.clearAll).not.toHaveBeenCalled()
    expect(t.page.removeItem).not.toHaveBeenCalled()
  })

  it('ignores a mirror that throws or is missing', async () => {
    const t = targets()
    t.page.removeItem.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    await expect(eraseFootlyData(t)).resolves.toBeUndefined()
    await expect(eraseFootlyData({ ...t, page: undefined })).resolves.toBeUndefined()
  })
})

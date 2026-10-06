import { describe, expect, it, vi } from 'vitest'
import { settleSave } from './useSavedValue.ts'

describe('settleSave', () => {
  it('resolves true and runs onSaved when the save succeeds', async () => {
    const onSaved = vi.fn()
    const onFailed = vi.fn()
    await expect(settleSave(Promise.resolve(), onSaved, onFailed)).resolves.toBe(true)
    expect(onSaved).toHaveBeenCalledOnce()
    expect(onFailed).not.toHaveBeenCalled()
  })

  it('resolves false and passes the failure to onFailed when the save fails', async () => {
    const failure = new Error('quota')
    const onSaved = vi.fn()
    const onFailed = vi.fn()
    await expect(settleSave(Promise.reject(failure), onSaved, onFailed)).resolves.toBe(false)
    expect(onFailed).toHaveBeenCalledWith(failure)
    expect(onSaved).not.toHaveBeenCalled()
  })
})

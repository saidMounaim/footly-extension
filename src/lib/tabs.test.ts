import { describe, expect, it } from 'vitest'
import { tabIndexForKey } from './tabs.ts'

describe('tabIndexForKey', () => {
  it('moves right and left one tab', () => {
    expect(tabIndexForKey('ArrowRight', 0, 3)).toBe(1)
    expect(tabIndexForKey('ArrowLeft', 2, 3)).toBe(1)
  })

  it('wraps past either end', () => {
    expect(tabIndexForKey('ArrowRight', 2, 3)).toBe(0)
    expect(tabIndexForKey('ArrowLeft', 0, 3)).toBe(2)
  })

  it('jumps to the first and last tab', () => {
    expect(tabIndexForKey('Home', 2, 3)).toBe(0)
    expect(tabIndexForKey('End', 0, 3)).toBe(2)
  })

  it('ignores other keys and empty lists', () => {
    expect(tabIndexForKey('Enter', 1, 3)).toBeUndefined()
    expect(tabIndexForKey('ArrowDown', 1, 3)).toBeUndefined()
    expect(tabIndexForKey('ArrowRight', 0, 0)).toBeUndefined()
  })
})

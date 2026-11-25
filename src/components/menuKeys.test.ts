import { describe, expect, it } from 'vitest'
import { nextMenuIndex } from './menuKeys'

describe('nextMenuIndex', () => {
  it('starts at the first or last entry', () => {
    expect(nextMenuIndex('ArrowDown', -1, 5)).toBe(0)
    expect(nextMenuIndex('ArrowUp', -1, 5)).toBe(4)
  })

  it('moves by one entry and goes around at the ends', () => {
    expect(nextMenuIndex('ArrowDown', 1, 5)).toBe(2)
    expect(nextMenuIndex('ArrowUp', 2, 5)).toBe(1)
    expect(nextMenuIndex('ArrowDown', 4, 5)).toBe(0)
    expect(nextMenuIndex('ArrowUp', 0, 5)).toBe(4)
  })

  it('jumps to the first and last entry', () => {
    expect(nextMenuIndex('Home', 3, 5)).toBe(0)
    expect(nextMenuIndex('End', 1, 5)).toBe(4)
  })

  it('ignores other keys and empty menus', () => {
    expect(nextMenuIndex('Enter', 1, 5)).toBeNull()
    expect(nextMenuIndex('ArrowLeft', 1, 5)).toBeNull()
    expect(nextMenuIndex('ArrowDown', -1, 0)).toBeNull()
  })
})

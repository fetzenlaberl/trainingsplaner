import { describe, expect, it } from 'vitest'
import { allCollapsed, useLayoutStore } from './layoutStore'

describe('layoutStore', () => {
  it('folds single bars and all bars at once', () => {
    const store = () => useLayoutStore.getState()
    store().toggle('tools')
    expect(store().collapsed.tools).toBe(true)
    expect(allCollapsed(store().collapsed)).toBe(false)
    // Not all folded yet: "Feld maximal" folds all of them.
    store().toggleAll()
    expect(allCollapsed(store().collapsed)).toBe(true)
    // All folded: the same button opens all again.
    store().toggleAll()
    expect(Object.values(store().collapsed).some(Boolean)).toBe(false)
  })
})

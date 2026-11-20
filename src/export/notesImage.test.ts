import { describe, expect, it } from 'vitest'
import { wrapText } from './notesImage'

describe('wrapText', () => {
  const measure = (s: string) => s.length

  it('breaks lines between words and keeps own line breaks', () => {
    expect(wrapText('eins zwei drei vier', 9, measure)).toEqual(['eins zwei', 'drei vier'])
    expect(wrapText('oben\nunten', 20, measure)).toEqual(['oben', 'unten'])
  })

  it('keeps a long word on its own line', () => {
    expect(wrapText('a Abwehrkettenverschiebung b', 5, measure)).toEqual(['a', 'Abwehrkettenverschiebung', 'b'])
  })
})

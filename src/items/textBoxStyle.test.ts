import { describe, expect, it } from 'vitest'
import { changeTextBoxStyle, parseTextBoxStyle, textBoxFontFactor, textBoxWidth } from './textBoxStyle'
import { cloudBumps, textAreaFromCorner, textBoxBody, textBoxTail, textBoxTailTo } from './textBoxGeometry'

describe('text box style', () => {
  it('leaves out default values and becomes undefined when nothing is left', () => {
    expect(changeTextBoxStyle(undefined, { shape: 'oval', bold: true })).toEqual({ shape: 'oval', bold: true })
    expect(changeTextBoxStyle({ shape: 'oval', bold: true }, { shape: 'rounded', bold: false })).toBeUndefined()
    expect(changeTextBoxStyle({ tail: 'n', tailKind: 'thought' }, { tail: undefined })).toEqual({ tailKind: 'thought' })
  })

  it('validates stored styles', () => {
    expect(parseTextBoxStyle({ shape: 'cloud', font: 'large', tail: 'se', border: '#dc2626' })).toEqual({
      shape: 'cloud',
      font: 'large',
      tail: 'se',
      border: '#dc2626',
    })
    expect(parseTextBoxStyle({})).toEqual({})
    expect(parseTextBoxStyle({ shape: 'star' })).toBeNull()
    expect(parseTextBoxStyle({ border: 'red' })).toBeNull()
    expect(parseTextBoxStyle('oval')).toBeNull()
    expect(parseTextBoxStyle({ w: 20, h: 6, textColor: '#2563eb', tail: 's', tailTip: { x: 3, y: 9 } })).toEqual({
      w: 20,
      h: 6,
      textColor: '#2563eb',
      tail: 's',
      tailTip: { x: 3, y: 9 },
    })
    expect(parseTextBoxStyle({ w: 1 })).toBeNull()
    expect(parseTextBoxStyle({ tailTip: { x: 'a', y: 1 } })).toBeNull()
    expect(parseTextBoxStyle({ tailTip: { x: 500, y: 1 } })).toBeNull()
  })

  it('gives font factor and width with defaults', () => {
    expect(textBoxFontFactor(undefined)).toBe(1)
    expect(textBoxFontFactor({ font: 'xlarge' })).toBe(2)
    expect(textBoxWidth(undefined)).toBe(12)
    expect(textBoxWidth({ width: 'wide' })).toBe(18)
    expect(textBoxWidth({ width: 'wide', w: 22.5 })).toBe(22.5)
  })
})

describe('text box geometry', () => {
  it('makes ovals and clouds bigger than the text area', () => {
    const box = textBoxBody('rect', 12, 3, 1)
    expect([box.rx, box.ry]).toEqual([6, 1.5])
    const oval = textBoxBody('oval', 12, 3, 1)
    expect(oval.rx).toBeGreaterThan(6)
    expect(oval.ry).toBeGreaterThan(1.5)
    expect(cloudBumps(textBoxBody('cloud', 12, 3, 1))).toBeGreaterThanOrEqual(8)
  })

  it('points the tail outwards in the chosen direction', () => {
    const body = textBoxBody('rounded', 12, 4, 1)
    expect(textBoxTail(body, 's', 1).tip).toEqual({ x: 0, y: 2 + 2.6 })
    const sw = textBoxTail(body, 'sw', 1).tip
    expect(sw.x).toBeLessThan(-3.6)
    expect(sw.y).toBeGreaterThan(2)
    const bubbles = textBoxTail(textBoxBody('oval', 12, 4, 1), 'e', 1).bubbles
    expect(bubbles.map((b) => b.r)).toEqual([0.55, 0.38, 0.25])
    expect(bubbles[2].x).toBeGreaterThan(bubbles[0].x)
  })

  it('reaches a freely dragged tip from the edge of the box', () => {
    const body = textBoxBody('rect', 12, 4, 1)
    const tail = textBoxTailTo(body, { x: 0, y: 10 }, 1)
    expect(tail.tip).toEqual({ x: 0, y: 10 })
    // The base sits on the bottom edge, a bit inside the box.
    expect(tail.points[1]).toBeCloseTo(2 - 0.7)
    const thought = textBoxTailTo(textBoxBody('oval', 12, 4, 1), { x: 20, y: 0 }, 1)
    expect(thought.bubbles[0].x).toBeGreaterThan(7)
    expect(thought.bubbles[2].x).toBeLessThan(20)
  })

  it('turns a dragged corner into the size of the text area', () => {
    expect(textAreaFromCorner('rect', 8, 3, 1)).toEqual({ w: 16, h: 6 })
    const oval = textAreaFromCorner('oval', 6.2, 3.2, 1)
    expect(oval.w).toBeCloseTo(10)
    expect(oval.h).toBeCloseTo(4.03, 2)
    // Going round: the oval body of that area has the dragged corner again.
    const body = textBoxBody('oval', oval.w, oval.h, 1)
    expect(body.rx).toBeCloseTo(6.2)
    expect(body.ry).toBeCloseTo(3.2)
  })
})

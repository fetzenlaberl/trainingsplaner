import { describe, expect, it } from 'vitest'
import { changeTextBoxStyle, parseTextBoxStyle, textBoxFontFactor, textBoxWidth } from './textBoxStyle'
import { cloudBumps, textBoxBody, textBoxTail } from './textBoxGeometry'

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
  })

  it('gives font factor and width with defaults', () => {
    expect(textBoxFontFactor(undefined)).toBe(1)
    expect(textBoxFontFactor({ font: 'xlarge' })).toBe(2)
    expect(textBoxWidth(undefined)).toBe(12)
    expect(textBoxWidth({ width: 'wide' })).toBe(18)
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
})

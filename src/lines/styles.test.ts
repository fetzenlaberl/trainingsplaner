import { describe, expect, it } from 'vitest'
import { dashStyle, defaultPattern, hasArrow, LINE_PATTERNS, weightFactor } from './styles'

describe('line styles', () => {
  it('uses dashed for runs and solid for everything else by default', () => {
    expect(defaultPattern('run')).toBe('dashed')
    expect(defaultPattern('pass')).toBe('solid')
    expect(defaultPattern('line')).toBe('solid')
  })

  it('draws no arrowhead only for plain lines', () => {
    expect(hasArrow('line')).toBe(false)
    expect(hasArrow('shot')).toBe(true)
  })

  it('orders the weights from thin to thick', () => {
    expect(weightFactor('thin')).toBeLessThan(weightFactor('medium'))
    expect(weightFactor('medium')).toBeLessThan(weightFactor('thick'))
  })

  it('has no dashes for solid lines and dashes for all other patterns', () => {
    expect(dashStyle('solid', 1).dash).toBeUndefined()
    for (const pattern of LINE_PATTERNS.filter((p) => p !== 'solid')) {
      expect(dashStyle(pattern, 1).dash?.length).toBeGreaterThan(0)
    }
  })

  it('draws dots as round caps on very short dashes', () => {
    const { dash, lineCap } = dashStyle('dotted', 2)
    expect(lineCap).toBe('round')
    expect(dash![0]).toBeLessThan(0.01)
  })

  it('scales the dashes with the line width', () => {
    expect(dashStyle('dashed', 2).dash![0]).toBe(2 * dashStyle('dashed', 1).dash![0])
  })

  it('alternates dash and dot for dash-dot', () => {
    const dash = dashStyle('dashdot', 1).dash!
    expect(dash).toHaveLength(4)
    expect(dash[0]).toBeGreaterThan(dash[2])
  })
})

import { describe, expect, it } from 'vitest'
import { contrastTextColor, shadeColor } from './colors'
import { TEAM_COLORS } from './palette'

describe('contrastTextColor', () => {
  it('uses white text on dark team colors', () => {
    expect(contrastTextColor(TEAM_COLORS.red)).toBe('#ffffff')
    expect(contrastTextColor(TEAM_COLORS.blue)).toBe('#ffffff')
  })

  it('uses dark text on the yellow goalkeeper color', () => {
    expect(contrastTextColor(TEAM_COLORS.keeper)).toBe('#111827')
  })
})

describe('shadeColor', () => {
  it('lightens and darkens hex colors', () => {
    expect(shadeColor('#808080', 0.5)).toBe('#c0c0c0')
    expect(shadeColor('#808080', -0.5)).toBe('#404040')
    expect(shadeColor('training', 0.5)).toBe('training')
  })
})

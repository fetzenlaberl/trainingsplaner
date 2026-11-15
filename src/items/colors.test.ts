import { describe, expect, it } from 'vitest'
import { contrastTextColor } from './colors'
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

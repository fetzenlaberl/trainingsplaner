import { describe, expect, it } from 'vitest'
import { clampStep, MAX_STEP, nextStep, renumberSteps } from './steps'

describe('steps', () => {
  it('continues after the highest step', () => {
    expect(nextStep([])).toBe(1)
    expect(nextStep([{ step: 2 }, { step: null }, { step: 5 }])).toBe(6)
  })

  it('never goes beyond the maximum', () => {
    expect(nextStep([{ step: MAX_STEP }])).toBe(MAX_STEP)
    expect(clampStep(0)).toBe(1)
    expect(clampStep(3.6)).toBe(4)
  })

  it('closes gaps in order and keeps unnumbered lines unchanged', () => {
    const lines = [{ step: 4 }, { step: null }, { step: 2 }, { step: 9 }]
    expect(renumberSteps(lines).map((l) => l.step)).toEqual([2, null, 1, 3])
  })

  it('keeps the drawing order for equal numbers', () => {
    expect(renumberSteps([{ step: 3 }, { step: 3 }]).map((l) => l.step)).toEqual([1, 2])
  })
})

import { describe, expect, it } from 'vitest'
import { fitImageSize, MAX_IMAGE_SIDE } from './fileImport'

describe('fitImageSize', () => {
  it('scales big pictures down to the maximum side and keeps the proportions', () => {
    expect(fitImageSize(4000, 3000)).toEqual({ width: MAX_IMAGE_SIDE, height: 1200 })
    expect(fitImageSize(1000, 3000)).toEqual({ width: 533, height: MAX_IMAGE_SIDE })
  })

  it('leaves small pictures as they are', () => {
    expect(fitImageSize(640, 480)).toEqual({ width: 640, height: 480 })
  })
})

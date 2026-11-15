import { describe, expect, it } from 'vitest'
import { getViewport } from '../field/dimensions'
import { EXPORT_SCALE, exportSize, pdfLayout } from './layout'

describe('exportSize', () => {
  it('uses the export scale for the full field', () => {
    const v = getViewport('full')
    expect(exportSize(v)).toEqual({
      width: Math.round(v.width * EXPORT_SCALE),
      height: Math.round(v.height * EXPORT_SCALE),
    })
  })

  it('is large enough for printing (at least 2000 px wide for the full field)', () => {
    expect(exportSize(getViewport('full')).width).toBeGreaterThanOrEqual(2000)
  })
})

describe('pdfLayout with description', () => {
  it('reserves a box below the image that stays on the page', () => {
    const { width, height } = exportSize(getViewport('full'))
    const layout = pdfLayout(width, height, true)
    const box = layout.description!
    expect(box.y).toBeGreaterThan(layout.image.y + layout.image.height)
    expect(box.y + box.maxHeight).toBeLessThanOrEqual(layout.pageHeight)
  })

  it('makes the image smaller when a description is shown', () => {
    const { width, height } = exportSize(getViewport('full'))
    expect(pdfLayout(width, height, true).image.width).toBeLessThan(pdfLayout(width, height).image.width)
  })

  it('has no description box without a description', () => {
    expect(pdfLayout(1000, 500).description).toBeNull()
  })
})

describe('pdfLayout', () => {
  it('uses landscape for a wide image (full field)', () => {
    const { width, height } = exportSize(getViewport('full'))
    expect(pdfLayout(width, height).orientation).toBe('landscape')
  })

  it('uses portrait for a tall image (half field)', () => {
    const { width, height } = exportSize(getViewport('half'))
    expect(pdfLayout(width, height).orientation).toBe('portrait')
  })

  it.each(['full', 'half', 'penalty', 'empty'] as const)(
    'keeps the aspect ratio and stays on the page (%s)',
    (type) => {
      const { width, height } = exportSize(getViewport(type))
      const layout = pdfLayout(width, height)
      const { image } = layout
      expect(image.width / image.height).toBeCloseTo(width / height, 6)
      expect(image.x).toBeGreaterThanOrEqual(0)
      expect(image.x + image.width).toBeLessThanOrEqual(layout.pageWidth)
      expect(image.y + image.height).toBeLessThanOrEqual(layout.pageHeight)
    },
  )

  it('places the image below the title', () => {
    const layout = pdfLayout(1000, 500)
    expect(layout.image.y).toBeGreaterThan(layout.title.y)
  })

  it('centers the image horizontally', () => {
    const layout = pdfLayout(1000, 500)
    const left = layout.image.x
    const right = layout.pageWidth - layout.image.x - layout.image.width
    expect(left).toBeCloseTo(right)
  })
})

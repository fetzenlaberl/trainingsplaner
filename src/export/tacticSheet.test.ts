import { describe, expect, it } from 'vitest'
import { dotGrid, fitImage, SHEET_HEIGHT, SHEET_VARIANTS, SHEET_WIDTH, sheetLayout, type Box } from './tacticSheet'

const inside = (b: Box) => b.x >= 0 && b.y >= 0 && b.x + b.width <= SHEET_WIDTH && b.y + b.height <= SHEET_HEIGHT
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width - 1e-9 && b.x < a.x + a.width - 1e-9 && a.y < b.y + b.height - 1e-9 && b.y < a.y + a.height - 1e-9

describe('sheetLayout', () => {
  it('has the expected number of fields and note areas', () => {
    expect(sheetLayout('one').fields).toHaveLength(1)
    expect(sheetLayout('one').notes).toHaveLength(1)
    expect(sheetLayout('two').fields).toHaveLength(2)
    expect(sheetLayout('two').notes).toHaveLength(2)
    expect(sheetLayout('four').fields).toHaveLength(4)
    expect(sheetLayout('four').notes).toHaveLength(0)
  })

  it.each(SHEET_VARIANTS.map((v) => v.key))('keeps all boxes on the page without overlapping (%s)', (variant) => {
    const { fields, notes } = sheetLayout(variant)
    const boxes = [...fields, ...notes]
    expect(boxes.every(inside)).toBe(true)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false)
    }
  })

  it('leaves room for the header at the top', () => {
    for (const { key } of SHEET_VARIANTS) {
      expect(Math.min(...sheetLayout(key).fields.map((f) => f.y))).toBeGreaterThanOrEqual(30)
    }
  })
})

describe('fitImage', () => {
  it('keeps the aspect ratio and stays inside the box, centered', () => {
    const box = { x: 10, y: 20, width: 100, height: 60 }
    const fit = fitImage(box, 1130, 760)
    expect(fit.width / fit.height).toBeCloseTo(1130 / 760)
    expect(fit.x).toBeGreaterThanOrEqual(box.x)
    expect(fit.y + fit.height).toBeLessThanOrEqual(box.y + box.height)
    expect(fit.x - box.x).toBeCloseTo(box.x + box.width - (fit.x + fit.width))
  })

  it('fits a tall (portrait) image by height', () => {
    const fit = fitImage({ x: 0, y: 0, width: 100, height: 60 }, 760, 1130)
    expect(fit.height).toBeCloseTo(54)
  })
})

describe('dotGrid', () => {
  it('places dots 5 mm apart inside the box', () => {
    const box = { x: 0, y: 0, width: 52, height: 31 }
    const dots = dotGrid(box)
    expect(dots.every((d) => d.x > box.x && d.x < box.x + box.width && d.y > box.y && d.y < box.y + box.height)).toBe(true)
    expect(dots[1].x - dots[0].x).toBeCloseTo(5)
  })
})

import { describe, expect, it } from 'vitest'
import { getViewport } from '../field/dimensions'
import { gridLines } from '../field/pitchStyle'
import { parseDrill, serializeDrill } from '../model/serialize'
import { templateDrill } from '../model/templates'
import { fitProjected, projectPoint } from './perspective'
import { fieldToFlat, isStanding, makeProjector, projectedRotation, projectedTailTip, type FlatLayout } from './upright'

const viewport = getViewport('full')
const landscape: FlatLayout = { viewport, orientation: 'landscape', scale: 10, offsetX: 20, offsetY: 30, width: 1090, height: 740 }
const portrait: FlatLayout = { ...landscape, orientation: 'portrait', width: 740, height: 1090 }

describe('fieldToFlat', () => {
  it('matches the flat field picture in both orientations', () => {
    expect(fieldToFlat(landscape, viewport.x, viewport.y)).toEqual({ x: 20, y: 30 })
    // Portrait: the goal at x = 0 is at the bottom, y runs from left to right.
    const bottomLeft = fieldToFlat(portrait, viewport.x, viewport.y)
    expect(bottomLeft.x).toBeCloseTo(20)
    expect(bottomLeft.y).toBeCloseTo(30 + viewport.width * 10)
  })
})

describe('makeProjector', () => {
  it('puts items where the tilted picture shows their spot', () => {
    const project = makeProjector(landscape, 45, 800, 600)
    const fit = fitProjected(landscape.width, landscape.height, 45, 800, 600)
    const flat = fieldToFlat(landscape, 30, 20)
    const p = projectPoint(flat.x, flat.y, landscape.width, landscape.height, 45)
    const at = project(30, 20)
    expect(at.x).toBeCloseTo(400 + fit.offsetX + p.x * fit.scale)
    expect(at.y).toBeCloseTo(300 + fit.offsetY + p.y * fit.scale)
  })

  it('draws items smaller towards the back', () => {
    const project = makeProjector(portrait, 45, 600, 800)
    const far = project(100, 34)
    const near = project(5, 34)
    expect(far.y).toBeLessThan(near.y)
    expect(far.scale).toBeLessThan(near.scale)
  })

  it('turns a facing direction with the tilt', () => {
    const project = makeProjector(portrait, 45, 600, 800)
    // In portrait, play towards the far goal (+x) points up on screen.
    expect(Math.abs(projectedRotation(project, 50, 34, 0) + 90)).toBeLessThan(3)
  })
})

describe('standing items', () => {
  it('stand players and dummies up, keeps goals and ladders on the ground', () => {
    expect(isStanding('player')).toBe(true)
    expect(isStanding('figureDummy')).toBe(true)
    expect(isStanding('goal')).toBe(false)
    expect(isStanding('ladder')).toBe(false)
  })
})

describe('perspective templates', () => {
  it('builds a portrait pitch with lanes and cross lines, empty or with dummies', () => {
    const empty = templateDrill('perspective')
    expect(empty.pitch).toMatchObject({ orientation: 'portrait', grid: 'lanesCross' })
    expect(empty.scenes[0].items).toEqual([])
    const dummies = templateDrill('perspectiveDummies')
    expect(dummies.scenes[0].items.length).toBeGreaterThan(5)
    expect(dummies.scenes[0].items.every((i) => i.type === 'figureDummy' && i.x > 52.5)).toBe(true)
    expect(parseDrill(serializeDrill(dummies))).toEqual(dummies)
  })

  it('has five lanes and a cross line in each half', () => {
    const lines = gridLines('lanesCross')
    expect(lines.filter((l) => l[1] === l[3])).toHaveLength(4)
    expect(lines.filter((l) => l[0] === l[2]).map((l) => l[0])).toEqual([34.5, 70.5])
  })
})

describe('turned 3D view', () => {
  it('turns the facing direction of standing items with the view', () => {
    const plain = makeProjector(landscape, 45, 800, 600)
    const turned = makeProjector(landscape, 45, 800, 600, 180)
    // Facing the right goal points right normally and left when seen from the other side.
    expect(Math.cos((projectedRotation(plain, 52.5, 34, 0) * Math.PI) / 180)).toBeGreaterThan(0.9)
    expect(Math.cos((projectedRotation(turned, 52.5, 34, 0) * Math.PI) / 180)).toBeLessThan(-0.9)
  })
})

describe('tail of a speech bubble in the 3D view', () => {
  const rad = (deg: number) => (deg * Math.PI) / 180

  it.each([
    ['landscape', landscape, 0, 0],
    ['landscape, turned view', landscape, 0, 120],
    ['portrait', portrait, -90, 0],
  ] as const)('still points at the same spot of the field (%s)', (_, layout, view, turnDeg) => {
    const project = makeProjector(layout, 45, 800, 600, turnDeg)
    const bubble = { x: 40, y: 20, rotation: 30, size: 1.5 }
    const tip = { x: 6, y: 9 }
    // Spot of the tip on the flat field
    const angle = rad(bubble.rotation - view)
    const spot = project(
      bubble.x + (tip.x * Math.cos(angle) - tip.y * Math.sin(angle)) * bubble.size,
      bubble.y + (tip.x * Math.sin(angle) + tip.y * Math.cos(angle)) * bubble.size,
    )
    // Where the upright bubble draws it
    const local = projectedTailTip(project, bubble, tip, view)
    const at = project(bubble.x, bubble.y)
    const own = rad(bubble.rotation)
    const unit = at.scale * bubble.size
    expect(at.x + (local.x * Math.cos(own) - local.y * Math.sin(own)) * unit).toBeCloseTo(spot.x, 5)
    expect(at.y + (local.x * Math.sin(own) + local.y * Math.cos(own)) * unit).toBeCloseTo(spot.y, 5)
  })
})

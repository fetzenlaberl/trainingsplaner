import { describe, expect, it } from 'vitest'
import { pointAtDistance, polylineLength, samplePath } from '../lines/geometry'
import type { Item, Line, Scene } from '../model/types'
import {
  findPathLine,
  frameAt,
  interpolateScenes,
  lerpAngle,
  locateTime,
  sceneStartTime,
  totalDuration,
} from './interpolate'

function item(id: string, x: number, y: number, rotation = 0, type: Item['type'] = 'player'): Item {
  return { id, type, x, y, rotation, size: 1, color: '#fff', label: '' }
}

function scene(items: Item[], lines: Line[] = [], durationMs = 1000): Scene {
  return { durationMs, items, lines }
}

const curvedPass: Line = {
  id: 'l',
  type: 'pass',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 5 },
    { x: 20, y: 0 },
  ],
  smooth: true,
  color: '#fff',
}

const zigzagRun: Line = {
  id: 'z',
  type: 'run',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 20, y: 0 },
    { x: 30, y: 10 },
  ],
  smooth: false,
  color: '#fff',
}

describe('timing', () => {
  const scenes = [scene([], [], 1000), scene([], [], 3000), scene([], [], 500)]

  it('sums the durations of all transitions (the last scene has none)', () => {
    expect(totalDuration(scenes)).toBe(4000)
    expect(totalDuration([scene([])])).toBe(0)
  })

  it('knows when each scene starts', () => {
    expect([0, 1, 2].map((i) => sceneStartTime(scenes, i))).toEqual([0, 1000, 4000])
  })

  it('maps a time to the running transition', () => {
    expect(locateTime(scenes, 0)).toEqual({ index: 0, progress: 0 })
    expect(locateTime(scenes, 500)).toEqual({ index: 0, progress: 0.5 })
    expect(locateTime(scenes, 1000)).toEqual({ index: 1, progress: 0 })
    expect(locateTime(scenes, 2500)).toEqual({ index: 1, progress: 0.5 })
  })

  it('ends on the last scene', () => {
    expect(locateTime(scenes, 4000)).toEqual({ index: 2, progress: 0 })
    expect(locateTime(scenes, 99999)).toEqual({ index: 2, progress: 0 })
  })
})

describe('lerpAngle', () => {
  it('interpolates normally', () => {
    expect(lerpAngle(0, 90, 0.5)).toBeCloseTo(45)
  })

  it('takes the shorter way across 0 degrees', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0)
    expect(lerpAngle(10, 350, 0.25)).toBeCloseTo(5)
  })
})

describe('interpolateScenes', () => {
  it('moves items in a straight line and rotates them', () => {
    const [p] = interpolateScenes(scene([item('a', 0, 0, 0)]), scene([item('a', 10, 20, 90)]), 0.5)
    expect([p.x, p.y, p.rotation, p.opacity]).toEqual([5, 10, 45, 1])
  })

  it('grows or shrinks items between scenes', () => {
    const small = { ...item('a', 0, 0), size: 1 }
    const big = { ...item('a', 0, 0), size: 2 }
    const [p] = interpolateScenes(scene([small]), scene([big]), 0.25)
    expect(p.size).toBeCloseTo(1.25)
  })

  it('is exact at the start of a transition', () => {
    const [p] = interpolateScenes(scene([item('a', 3, 4)]), scene([item('a', 10, 20)]), 0)
    expect([p.x, p.y]).toEqual([3, 4])
  })

  it('fades out items that disappear and fades in new ones', () => {
    const frame = interpolateScenes(scene([item('old', 1, 1)]), scene([item('new', 5, 5)]), 0.25)
    expect(frame.find((i) => i.id === 'old')!.opacity).toBeCloseTo(0.75)
    const added = frame.find((i) => i.id === 'new')!
    expect(added.opacity).toBeCloseTo(0.25)
    expect([added.x, added.y]).toEqual([5, 5])
  })

  it('lets the ball follow a curved pass line', () => {
    const from = scene([item('b', 0, 0, 0, 'ball')], [curvedPass])
    const to = scene([item('b', 20, 0, 0, 'ball')])
    const [b] = interpolateScenes(from, to, 0.5)
    const path = samplePath(curvedPass.points, curvedPass.smooth)
    const expected = pointAtDistance(path, polylineLength(path) / 2)
    expect(b.x).toBeCloseTo(expected.x)
    expect(b.y).toBeCloseTo(expected.y)
    expect(b.y).toBeGreaterThan(4) // clearly off the straight line
  })

  it('follows a line with several corners at constant speed', () => {
    const from = scene([item('p', 0, 0)], [zigzagRun])
    const to = scene([item('p', 30, 10)])
    // All three segments are equally long, so 1/3 of the time reaches the first corner.
    const [atCorner] = interpolateScenes(from, to, 1 / 3)
    expect(atCorner.x).toBeCloseTo(10)
    expect(atCorner.y).toBeCloseTo(10)
    const [halfway] = interpolateScenes(from, to, 0.5)
    expect(halfway.x).toBeCloseTo(15)
    expect(halfway.y).toBeCloseTo(5)
  })

  it('blends small offsets between item and line ends', () => {
    const from = scene([item('b', 1, 0, 0, 'ball')], [curvedPass])
    const to = scene([item('b', 21, 1, 0, 'ball')])
    const [start] = interpolateScenes(from, to, 0)
    expect([start.x, start.y]).toEqual([1, 0])
    const [almostEnd] = interpolateScenes(from, to, 0.999)
    expect(almostEnd.x).toBeCloseTo(21, 1)
    expect(almostEnd.y).toBeCloseTo(1, 1)
  })

  it('moves straight when the item does not end at the line end', () => {
    const from = scene([item('b', 0, 0, 0, 'ball')], [curvedPass])
    const to = scene([item('b', 0, 30, 0, 'ball')])
    const [b] = interpolateScenes(from, to, 0.5)
    expect([b.x, b.y]).toEqual([0, 15])
  })
})

describe('findPathLine', () => {
  it('requires both start and end to match', () => {
    expect(findPathLine([curvedPass], item('b', 0, 0), item('b', 20, 0))).toBe(curvedPass)
    expect(findPathLine([curvedPass], item('b', 0, 0), item('b', 40, 0))).toBeUndefined()
    expect(findPathLine([curvedPass], item('b', 10, 0), item('b', 20, 0))).toBeUndefined()
  })
})

describe('frameAt', () => {
  const scenes = [
    scene([item('a', 0, 0)], [curvedPass], 1000),
    scene([item('a', 10, 0)], [], 1000),
    scene([item('a', 10, 10)]),
  ]

  it('shows the lines of the scene the transition starts from', () => {
    expect(frameAt(scenes, 500).lines).toEqual([curvedPass])
    expect(frameAt(scenes, 1500).lines).toEqual([])
  })

  it('interpolates within the right transition', () => {
    const frame = frameAt(scenes, 1500)
    expect(frame.sceneIndex).toBe(1)
    expect([frame.items[0].x, frame.items[0].y]).toEqual([10, 5])
  })

  it('shows the last scene at the end', () => {
    const frame = frameAt(scenes, 5000)
    expect(frame.sceneIndex).toBe(2)
    expect([frame.items[0].x, frame.items[0].y, frame.items[0].opacity]).toEqual([10, 10, 1])
  })

  it('works with a single scene', () => {
    const frame = frameAt([scene([item('a', 1, 2)])], 0)
    expect(frame.items[0].x).toBe(1)
  })
})

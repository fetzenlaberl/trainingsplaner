import { describe, expect, it } from 'vitest'
import type { Item, Line, Scene } from '../model/types'
import { ATTACH_DISTANCE, nextSceneFrom } from './scenes'

function item(id: string, type: Item['type'], x: number, y: number): Item {
  return { id, type, x, y, rotation: 0, size: 1, color: '#fff', label: '' }
}

function line(id: string, type: Line['type'], x1: number, y1: number, x2: number, y2: number): Line {
  return {
    id,
    type,
    points: [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
    control: null,
    color: '#fff',
  }
}

const pos = (scene: Scene, id: string) => {
  const found = scene.items.find((i) => i.id === id)!
  return [found.x, found.y]
}

describe('nextSceneFrom', () => {
  it('keeps items and ids, drops lines and keeps the duration', () => {
    const scene: Scene = {
      durationMs: 3000,
      items: [item('c', 'cone', 1, 1)],
      lines: [line('l', 'run', 50, 50, 60, 60)],
    }
    const next = nextSceneFrom(scene)
    expect(next.items).toEqual(scene.items)
    expect(next.lines).toEqual([])
    expect(next.durationMs).toBe(3000)
  })

  it('moves the ball to the end of a pass, but not the player', () => {
    const scene: Scene = {
      durationMs: 2000,
      items: [item('p', 'player', 10, 10), item('b', 'ball', 11, 10)],
      lines: [line('l', 'pass', 10, 10, 40, 20)],
    }
    const next = nextSceneFrom(scene)
    expect(pos(next, 'b')).toEqual([40, 20])
    expect(pos(next, 'p')).toEqual([10, 10])
  })

  it('moves the ball along a shot', () => {
    const scene: Scene = {
      durationMs: 2000,
      items: [item('b', 'ball', 20, 34)],
      lines: [line('l', 'shot', 20, 34, 0, 34)],
    }
    expect(pos(nextSceneFrom(scene), 'b')).toEqual([0, 34])
  })

  it('moves a player to the end of a run, but not the ball', () => {
    const scene: Scene = {
      durationMs: 2000,
      items: [item('p', 'player', 10, 10), item('b', 'ball', 10.5, 10)],
      lines: [line('l', 'run', 10, 10, 30, 30)],
    }
    const next = nextSceneFrom(scene)
    expect(pos(next, 'p')).toEqual([30, 30])
    expect(pos(next, 'b')).toEqual([10.5, 10])
  })

  it('moves player and ball on a dribble', () => {
    const scene: Scene = {
      durationMs: 2000,
      items: [item('p', 'player', 10, 10), item('b', 'ball', 11, 10)],
      lines: [line('l', 'dribble', 10, 10, 30, 10)],
    }
    const next = nextSceneFrom(scene)
    expect(pos(next, 'p')).toEqual([30, 10])
    expect(pos(next, 'b')).toEqual([30, 10])
  })

  it('ignores items further away than the attach distance', () => {
    const scene: Scene = {
      durationMs: 2000,
      items: [item('b', 'ball', 10 + ATTACH_DISTANCE + 0.1, 10)],
      lines: [line('l', 'pass', 10, 10, 40, 10)],
    }
    expect(pos(nextSceneFrom(scene), 'b')).toEqual([10 + ATTACH_DISTANCE + 0.1, 10])
  })

  it('picks the nearest matching item and moves each item only once', () => {
    const scene: Scene = {
      durationMs: 2000,
      items: [item('far', 'player', 11.5, 10), item('near', 'player', 10.2, 10)],
      lines: [line('a', 'run', 10, 10, 30, 10), line('b', 'run', 10, 10, 10, 30)],
    }
    const next = nextSceneFrom(scene)
    expect(pos(next, 'near')).toEqual([30, 10])
    expect(pos(next, 'far')).toEqual([10, 30])
  })
})

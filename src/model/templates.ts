// Ready-made starting points for a new drill.

import { PITCH } from '../field/dimensions'
import type { Item } from './types'
import type { Drill } from './types'
import { emptyDrill } from './serialize'

export type DrillTemplate = 'perspective' | 'perspectiveDummies'

const DUMMY_COLOR = '#facc15'
const DUMMY_SIZE = 1.6

/**
 * Dummies as an opponent defending the upper half (portrait view: play goes upwards):
 * a back four, a midfield four and two forwards, slightly staggered.
 */
function opponentDummies(): Item[] {
  const mid = PITCH.width / 2
  const places: [number, number][] = [
    // back four in front of their penalty area
    [74, mid - 20],
    [76, mid - 7],
    [76, mid + 7],
    [74, mid + 20],
    // midfield four
    [62, mid - 22],
    [64, mid - 8],
    [64, mid + 8],
    [62, mid + 22],
    // two forwards just in front of the halfway line
    [54, mid - 6],
    [54, mid + 6],
  ]
  return places.map(([x, y], i) => ({
    id: `item-template-dummy-${i + 1}`,
    type: 'figureDummy',
    x,
    y,
    rotation: 180,
    size: DUMMY_SIZE,
    shape: 'circle',
    color: DUMMY_COLOR,
    label: '',
    name: '',
    highlight: false,
  }))
}

/** A perspective pitch (portrait, lanes with cross lines), empty or with dummies. */
export function templateDrill(template: DrillTemplate): Drill {
  const drill = emptyDrill()
  const withDummies = template === 'perspectiveDummies'
  return {
    ...drill,
    title: withDummies ? 'Perspektive mit Dummys' : 'Perspektive',
    area: 'tactic',
    fieldType: 'full',
    pitch: { ...drill.pitch, orientation: 'portrait', grid: 'lanesCross' },
    scenes: [{ ...drill.scenes[0], items: withDummies ? opponentDummies() : [] }],
  }
}

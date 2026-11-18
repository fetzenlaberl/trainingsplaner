import type { FieldType } from '../field/dimensions'
import type { PitchStyle } from '../field/pitchStyle'

export type ItemType = 'player' | 'ball' | 'cone' | 'goal' | 'pole' | 'text'

/** How a player is drawn; other item types ignore it. */
export type PlayerShape = 'circle' | 'triangle' | 'cross'

export interface Item {
  id: string
  type: ItemType
  /** Position in meters, relative to the pitch's top-left corner */
  x: number
  y: number
  /** Rotation in degrees, 0 = facing the right goal */
  rotation: number
  /** Display size factor, 1 = default size */
  size: number
  shape: PlayerShape
  color: string
  label: string
}

export interface Point {
  x: number
  y: number
}

export type LineType = 'pass' | 'run' | 'dribble' | 'shot'

export interface Line {
  id: string
  type: LineType
  /** Waypoints in meters: start, any number of bends, end (at least 2) */
  points: Point[]
  /** true: smooth curve through the waypoints; false: straight segments with corners */
  smooth: boolean
  color: string
}

export interface Scene {
  durationMs: number
  items: Item[]
  lines: Line[]
}

export type Category =
  | 'warmup'
  | 'technique'
  | 'passing'
  | 'shooting'
  | 'tactics'
  | 'game'
  | 'cooldown'

export interface Drill {
  title: string
  description: string
  category: Category | null
  fieldType: FieldType
  /** Pitch color and grid overlay */
  pitch: PitchStyle
  scenes: Scene[]
}

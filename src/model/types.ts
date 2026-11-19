import type { FieldType } from '../field/dimensions'
import type { PitchStyle } from '../field/pitchStyle'
import type { LinePattern, LineWeight } from '../lines/styles'
import type { DrillInfo } from './drillInfo'

export type ItemType =
  | 'player'
  | 'ball'
  | 'cone'
  | 'goal'
  | 'minigoal'
  | 'pole'
  | 'slalom'
  | 'dummy'
  | 'wall'
  | 'ladder'
  | 'hurdle'
  | 'ring'
  | 'flag'
  | 'disc'
  | 'rebounder'
  | 'text'
  | 'textbox'

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
  /** Main color; background color for text boxes */
  color: string
  /** Shirt number, or the text of text and text box items */
  label: string
  /** Name tag below a player (line-ups); empty = no tag */
  name: string
  /** Glowing ring to highlight a player */
  highlight: boolean
}

export interface Point {
  x: number
  y: number
}

/** 'line' is a plain line without arrowhead, e.g. for markings. */
export type LineType = 'pass' | 'run' | 'dribble' | 'shot' | 'line'

export interface Line {
  id: string
  type: LineType
  /** Waypoints in meters: start, any number of bends, end (at least 2) */
  points: Point[]
  /** true: smooth curve through the waypoints; false: straight segments with corners */
  smooth: boolean
  color: string
  pattern: LinePattern
  weight: LineWeight
  /** Number of the action step shown on the line (1, 2, 3 …), or null */
  step: number | null
}

export type ZoneShape = 'rect' | 'triangle' | 'ellipse'

/** Mini goals built into a rectangular zone (small-sided field): none, 2 or 3 per short side. */
export type ZoneGoals = 0 | 4 | 6

/** Marked area on the pitch (e.g. playing field, zone, area around a position). */
export interface Zone {
  id: string
  shape: ZoneShape
  /** Center in meters */
  x: number
  y: number
  /** Size in meters (bounding box before rotation) */
  width: number
  height: number
  rotation: number
  /** Outline color */
  color: string
  fillColor: string
  /** 0 = no fill, 1 = solid */
  fillOpacity: number
  /** Dashed instead of solid outline */
  dashed: boolean
  label: string
  goals: ZoneGoals
  /**
   * Free corner positions (meters, relative to the center, before rotation) for rhombus,
   * trapezoid and other uneven shapes; null = the regular rectangle or triangle.
   */
  corners: Point[] | null
}

export interface Scene {
  durationMs: number
  items: Item[]
  lines: Line[]
  zones: Zone[]
}

export type Category =
  | 'warmup'
  | 'technique'
  | 'passing'
  | 'shooting'
  | 'tactics'
  | 'game'
  | 'cooldown'

/** Library area: training drill or tactics / line-up. */
export type DrillArea = 'drill' | 'tactic'

export interface Drill {
  title: string
  description: string
  category: Category | null
  area: DrillArea
  /** Players, duration, field size and age group */
  info: DrillInfo
  fieldType: FieldType
  /** Pitch color and grid overlay */
  pitch: PitchStyle
  scenes: Scene[]
}

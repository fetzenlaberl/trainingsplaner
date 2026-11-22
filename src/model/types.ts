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
  | 'poleDummy'
  | 'figureDummy'
  | 'figure'
  | 'marker'
  | 'wall'
  | 'ladder'
  | 'hurdle'
  | 'ring'
  | 'flag'
  | 'disc'
  | 'rebounder'
  | 'agility'
  | 'coach'
  | 'image'
  | 'crest'
  | 'text'
  | 'textbox'

/** Pose of a player figure (item type 'figure'). */
export type FigurePose = 'stand' | 'run' | 'shoot' | 'keeper' | 'demand'

/** How a player is drawn; other item types ignore it. */
export type PlayerShape = 'circle' | 'triangle' | 'cross' | 'shirt'

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
  /** false: player without facing arrow (missing = with arrow) */
  facing?: boolean
  /** Pose of a player figure (only type 'figure'; missing = standing) */
  pose?: FigurePose
  /** Fixed: cannot be selected or moved on the pitch (missing = free) */
  locked?: boolean
}

export interface Point {
  x: number
  y: number
}

/** 'line' is a plain line without arrowhead, e.g. for markings. */
/** free / freeArrow: freehand stroke (finger or pen) without / with arrow head */
export type LineType = 'pass' | 'run' | 'dribble' | 'shot' | 'line' | 'free' | 'freeArrow'

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
  /** Fixed: cannot be selected or moved on the pitch (missing = free) */
  locked?: boolean
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
  /** Dashed instead of solid outline (kept in step with `pattern`) */
  dashed: boolean
  /** Outline pattern (missing = dashed or solid as `dashed` says) */
  pattern?: LinePattern
  /** Outline thickness (missing = medium, the usual width) */
  weight?: LineWeight
  /** Rounded corners (rectangles without free corners only) */
  rounded?: boolean
  /** Fixed: cannot be selected or moved on the pitch (missing = free) */
  locked?: boolean
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
  /** Imported pictures (id → data URL), used by picture items (id in the label) and the background */
  images?: Record<string, string>
}

export type ItemType = 'player' | 'ball' | 'cone' | 'goal' | 'pole' | 'text'

export interface Item {
  id: string
  type: ItemType
  /** Position in meters, relative to the pitch's top-left corner */
  x: number
  y: number
  /** Rotation in degrees, 0 = facing the right goal */
  rotation: number
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
  /** Start and end point in meters */
  points: [Point, Point]
  /** Control point of a quadratic Bézier curve; null for a straight line */
  control: Point | null
  color: string
}

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

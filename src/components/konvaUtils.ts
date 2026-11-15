import type { KonvaEventObject } from 'konva/lib/Node'

export const SELECTION_COLOR = '#38bdf8'

export function setCursor(e: KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}

// Page layout of the printable tactic sheet (A4 landscape, millimeters).

export type SheetVariant = 'one' | 'two' | 'four'

export const SHEET_VARIANTS: { key: SheetVariant; name: string }[] = [
  { key: 'one', name: '1 Feld + Notizen' },
  { key: 'two', name: '2 Felder mit Notizen' },
  { key: 'four', name: '4 Felder' },
]

export const SHEET_WIDTH = 297
export const SHEET_HEIGHT = 210
const MARGIN = 12
const HEADER = 20
const GAP = 6

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface SheetLayout {
  fields: Box[]
  notes: Box[]
}

/** Field and note boxes for a sheet variant. */
export function sheetLayout(variant: SheetVariant): SheetLayout {
  const left = MARGIN
  const top = MARGIN + HEADER
  const width = SHEET_WIDTH - 2 * MARGIN
  const height = SHEET_HEIGHT - top - MARGIN

  switch (variant) {
    case 'one': {
      const fieldWidth = width * 0.62
      return {
        fields: [{ x: left, y: top, width: fieldWidth, height }],
        notes: [{ x: left + fieldWidth + GAP, y: top, width: width - fieldWidth - GAP, height }],
      }
    }
    case 'two': {
      const rowHeight = (height - GAP) / 2
      const notesWidth = width * 0.42
      const rows = [top, top + rowHeight + GAP]
      return {
        notes: rows.map((y) => ({ x: left, y, width: notesWidth, height: rowHeight })),
        fields: rows.map((y) => ({ x: left + notesWidth + GAP, y, width: width - notesWidth - GAP, height: rowHeight })),
      }
    }
    case 'four': {
      const cellWidth = (width - GAP) / 2
      const cellHeight = (height - GAP) / 2
      const fields: Box[] = []
      for (const row of [0, 1]) {
        for (const col of [0, 1]) {
          fields.push({
            x: left + col * (cellWidth + GAP),
            y: top + row * (cellHeight + GAP),
            width: cellWidth,
            height: cellHeight,
          })
        }
      }
      return { fields, notes: [] }
    }
  }
}

/** Largest rectangle with the image's aspect ratio inside the box (with padding), centered. */
export function fitImage(box: Box, imageWidth: number, imageHeight: number, padding = 3): Box {
  const availableWidth = box.width - 2 * padding
  const availableHeight = box.height - 2 * padding
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height }
}

/** Positions of the dots of a dot grid inside a box (5 mm spacing, centered). */
export function dotGrid(box: Box, spacing = 5): { x: number; y: number }[] {
  const cols = Math.floor((box.width - spacing) / spacing)
  const rows = Math.floor((box.height - spacing) / spacing)
  const offsetX = box.x + (box.width - cols * spacing) / 2
  const offsetY = box.y + (box.height - rows * spacing) / 2
  const dots: { x: number; y: number }[] = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) dots.push({ x: offsetX + c * spacing, y: offsetY + r * spacing })
  }
  return dots
}

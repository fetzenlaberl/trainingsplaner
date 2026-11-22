// Ready-made training fields: small-sided field sizes (1:1 to 9:9), field variants with
// different goal setups, and Y-pass patterns. Everything is built from the app's own
// items, zones and lines on an empty field of the right size, so it stays editable.

import { areaRunoff, MAX_AREA, MIN_AREA, type FieldArea } from '../field/dimensions'
import type { LinePattern, LineWeight } from '../lines/styles'
import { MINIGOAL } from '../items/equipment'
import { zoneCornerRadius } from '../items/zones'
import { clampItemSize } from '../items/palette'
import { emptyDrill } from './serialize'
import type { Drill, Item, ItemType, Line, LineType, Point, Zone } from './types'

const WHITE = '#ffffff'
const RED = '#dc2626'
const BLUE = '#2563eb'
const NEUTRAL = '#facc15'
const CONE = '#f97316'
const PASS_COLOR = '#facc15'

// ---------------------------------------------------------------------------------------
// Small building blocks

interface Builder {
  items: Item[]
  lines: Line[]
  zones: Zone[]
  /** Size factor for players, cones and labels (smaller on small fields) */
  k: number
}

function builder(area: FieldArea): Builder {
  const k = Math.min(1, Math.max(0.5, Math.max(area.length, area.width) / 50))
  return { items: [], lines: [], zones: [], k }
}

function addItem(b: Builder, type: ItemType, x: number, y: number, extra: Partial<Item> = {}): void {
  b.items.push({
    id: `item-tpl-${b.items.length + 1}`,
    type,
    x,
    y,
    rotation: 0,
    size: 1,
    shape: 'circle',
    color: WHITE,
    label: '',
    name: '',
    highlight: false,
    // Players in the templates come without the facing arrow.
    ...(type === 'player' ? { facing: false } : {}),
    ...extra,
    ...(extra.size !== undefined ? { size: clampItemSize(extra.size) } : {}),
  })
}

function addLine(
  b: Builder,
  type: LineType,
  points: Point[],
  options: { color?: string; pattern?: LinePattern; weight?: LineWeight; step?: number | null; smooth?: boolean } = {},
): void {
  b.lines.push({
    id: `line-tpl-${b.lines.length + 1}`,
    type,
    points,
    smooth: options.smooth ?? false,
    color: options.color ?? WHITE,
    pattern: options.pattern ?? 'solid',
    weight: options.weight ?? 'extraThin',
    step: options.step ?? null,
  })
}

/** The playing field: white outline over the whole area, optionally dashed. */
function addOutline(b: Builder, area: FieldArea, dashed = false, style: Partial<Zone> = {}): void {
  b.zones.push({
    id: 'zone-tpl-field',
    shape: 'rect',
    x: area.length / 2,
    y: area.width / 2,
    width: area.length,
    height: area.width,
    rotation: 0,
    color: WHITE,
    fillColor: WHITE,
    fillOpacity: 0,
    dashed,
    label: '',
    goals: 0,
    corners: null,
    ...style,
  })
}

function addCornerCones(b: Builder, area: FieldArea): void {
  for (const [x, y] of [
    [0, 0],
    [area.length, 0],
    [area.length, area.width],
    [0, area.width],
  ]) {
    addItem(b, 'cone', x, y, { color: CONE, size: b.k })
  }
}

/**
 * A goal standing on a field line with its opening towards `facing` (degrees, 0 = +x).
 * The net lies outside the line.
 */
function addGoal(b: Builder, type: 'goal' | 'minigoal', x: number, y: number, facing: number, size = 1): void {
  const depth = type === 'goal' ? 2 : MINIGOAL.depth
  const rad = (facing * Math.PI) / 180
  const back = (depth * clampItemSize(size)) / 2
  addItem(b, type, x - Math.cos(rad) * back, y - Math.sin(rad) * back, { rotation: facing, size })
}

/** Size of the mini goals on a field (bigger on bigger fields, about 2–3 m wide). */
function miniGoalSize(area: FieldArea): number {
  return Math.min(2.5, Math.max(1.5, Math.min(area.length, area.width) / 10))
}

/**
 * Size label with arrows next to one side of the field.
 * side 'bottom' = along y = width (length label), 'left' = along x = 0 (width label);
 * `screenUp` turns the text so it reads along the side on screen.
 */
function addSizeLabel(
  b: Builder,
  area: FieldArea,
  side: 'bottom' | 'left',
  text: string,
  textRotation = 0,
  alpha = SIZE_LABEL_OPACITY,
): void {
  const firstItem = b.items.length
  const firstLine = b.lines.length
  addSizeLabelParts(b, area, side, text, textRotation)
  if (alpha < 1) {
    for (const item of b.items.slice(firstItem)) item.alpha = alpha
    for (const line of b.lines.slice(firstLine)) line.alpha = alpha
  }
}

/** Usual opacity of the size labels (faint, so they do not distract). */
export const SIZE_LABEL_OPACITY = 0.5

function addSizeLabelParts(b: Builder, area: FieldArea, side: 'bottom' | 'left', text: string, textRotation: number): void {
  const offset = areaRunoff(area) * 0.7
  const textSize = clampItemSize(0.75 * b.k)
  const font = 2 * textSize
  const gap = text.length * font * 0.3 + font * 0.4
  if (side === 'bottom') {
    const y = area.width + offset
    const mid = area.length / 2
    addItem(b, 'text', mid, y, { label: text, size: textSize, rotation: textRotation })
    addLine(b, 'pass', [{ x: mid - gap, y }, { x: 0.3, y }], { weight: 'extraThin' })
    addLine(b, 'pass', [{ x: mid + gap, y }, { x: area.length - 0.3, y }], { weight: 'extraThin' })
  } else {
    const x = -offset
    const mid = area.width / 2
    addItem(b, 'text', x, mid, { label: text, size: textSize, rotation: textRotation })
    addLine(b, 'pass', [{ x, y: mid - gap }, { x, y: 0.3 }], { weight: 'extraThin' })
    addLine(b, 'pass', [{ x, y: mid + gap }, { x, y: area.width - 0.3 }], { weight: 'extraThin' })
  }
}

/**
 * Players of one team in rows from their own goal line (x = 0 for blue, x = length for red);
 * rows: number of players per row, from the back.
 */
function addTeam(b: Builder, area: FieldArea, color: string, rows: number[], ownSide: 'left' | 'right', label?: (i: number) => string): void {
  let n = 0
  rows.forEach((count, row) => {
    const depth = ((row + 1) / (rows.length + 1)) * (area.length / 2) * 0.92
    for (let j = 0; j < count; j++) {
      const across = ((j + 1) / (count + 1)) * area.width
      const x = ownSide === 'left' ? depth : area.length - depth
      const y = ownSide === 'left' ? across : area.width - across
      n++
      addItem(b, 'player', x, y, {
        color,
        rotation: ownSide === 'left' ? 0 : 180,
        size: 1.5 * b.k,
        label: label ? label(n) : String(n + 1),
      })
    }
  })
}

function addBall(b: Builder, x: number, y: number): void {
  addItem(b, 'ball', x, y, { size: Math.max(0.7, b.k) })
}

/** A drill on an empty field of its own size (no grid). */
function fieldDrill(
  title: string,
  area: FieldArea,
  b: Builder,
  options: { description: string; players: number | null; fieldSize: string; orientation?: 'landscape' | 'portrait'; area?: 'drill' | 'tactic' },
): Drill {
  const drill = emptyDrill()
  return {
    ...drill,
    title,
    description: options.description,
    area: options.area ?? 'drill',
    info: { ...drill.info, players: options.players, fieldSize: options.fieldSize },
    fieldType: 'empty',
    pitch: { ...drill.pitch, grid: 'none', orientation: options.orientation ?? 'landscape', area },
    scenes: [{ ...drill.scenes[0], items: b.items, lines: b.lines, zones: b.zones }],
  }
}

// ---------------------------------------------------------------------------------------
// 1:1 to 9:9

export interface SizeFormat {
  key: string
  /** Players per team */
  players: number
  /** Range between the goals and across, in meters */
  length: [number, number]
  width: [number, number]
  goals: string
}

/** Usual field sizes for small-sided games (goal to goal × across). */
export const SIZE_FORMATS: SizeFormat[] = [
  { key: '1v1', players: 1, length: [10, 12], width: [10, 12], goals: 'Dribbling, Zweikampf, Beweglichkeit' },
  { key: '2v2', players: 2, length: [12, 16], width: [16, 20], goals: 'Über-/Unterzahl, erster Kontakt, Umschalten' },
  { key: '3v3', players: 3, length: [18, 22], width: [20, 26], goals: 'Kombinieren, Pressing, Spielintelligenz' },
  { key: '4v4', players: 4, length: [20, 25], width: [25, 30], goals: 'Positionsspiel, Anbieten, Ballzirkulation' },
  { key: '5v5', players: 5, length: [25, 30], width: [30, 36], goals: 'Raumaufteilung, Umschalten, Spieltempo' },
  { key: '6v6', players: 6, length: [30, 34], width: [36, 42], goals: 'Linienübergreifendes Spiel, Pressing' },
  { key: '7v7', players: 7, length: [34, 38], width: [42, 48], goals: 'Struktur, Spielaufbau, Kompaktheit' },
  { key: '8v8', players: 8, length: [38, 42], width: [48, 54], goals: 'Abläufe als Mannschaft, Breite und Tiefe' },
  { key: '9v9', players: 9, length: [42, 46], width: [54, 60], goals: 'Spielnahe Organisation, Systemtraining' },
]

/** Rows of field players per team, from the back. */
const SIZE_ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [2, 1],
  4: [1, 2, 1],
  5: [2, 1, 2],
  6: [2, 3, 1],
  7: [3, 3, 1],
  8: [3, 3, 2],
  9: [3, 4, 2],
  10: [4, 4, 2],
  11: [4, 4, 3],
}

const range = ([a, b]: [number, number]) => `${a}–${b}`
const middle = ([a, b]: [number, number]) => Math.round((a + b) / 2)

export function formatName(format: SizeFormat): string {
  return `${format.players}:${format.players}`
}

export function sizeFormatDrill(format: SizeFormat): Drill {
  const area = { length: middle(format.length), width: middle(format.width) }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  const goal = miniGoalSize(area)
  addGoal(b, 'minigoal', 0, area.width / 2, 0, goal)
  addGoal(b, 'minigoal', area.length, area.width / 2, 180, goal)
  const rows = SIZE_ROWS[format.players]
  addTeam(b, area, BLUE, rows, 'left')
  addTeam(b, area, RED, rows, 'right')
  addBall(b, area.length / 2, area.width / 2)
  // Shown upright like a pitch seen from behind the goal: the goal-to-goal distance runs
  // up the screen, so its label reads upwards; the width label lies along the bottom.
  addSizeLabel(b, area, 'left', `${range(format.width)} m`)
  addSizeLabel(b, area, 'bottom', `${range(format.length)} m`, -90)
  const lo = format.length[0] * format.width[0]
  const hi = format.length[1] * format.width[1]
  const name = formatName(format)
  return fieldDrill(`Feldgröße ${name}`, area, b, {
    players: format.players * 2,
    fieldSize: `${range(format.length)} × ${range(format.width)} m`,
    orientation: 'portrait',
    description:
      `Spielform ${name} auf Minitore.\n` +
      `Feldgröße: ${range(format.length)} m (Tor zu Tor) × ${range(format.width)} m, gezeichnet ${area.length} × ${area.width} m.\n` +
      `Fläche: ca. ${lo.toLocaleString('de-DE')}–${hi.toLocaleString('de-DE')} m².\n` +
      `Typische Ziele: ${format.goals}.\n` +
      'Kleineres Feld = mehr Aktionen und höhere Intensität; größeres Feld = mehr Zeit und Raum.',
  })
}

// ---------------------------------------------------------------------------------------
// Field variants with different goal setups

export type VariantKey = 'standard' | 'fourGoals' | 'counterGoals' | 'cornerGoals' | 'cross' | 'zones' | 'overload' | 'open'

export const FIELD_VARIANTS: { key: VariantKey; name: string; hint: string }[] = [
  { key: 'standard', name: 'Standard – 2 Tore', hint: 'Klassische Spielform, 40–60 × 30–40 m' },
  { key: 'fourGoals', name: '4 Tore je Seite', hint: 'Für die Viererkette, 40–50 × 25–35 m' },
  { key: 'counterGoals', name: 'Kontertore an den Seiten', hint: 'Umschalten und Breite, 40–55 × 30–40 m' },
  { key: 'cornerGoals', name: 'Tore in den Ecken', hint: 'Winkel und Verlagerung, 35–50 × 25–35 m' },
  { key: 'cross', name: '4-Tore-Form (Kreuz)', hint: 'Spiel in alle Richtungen, 40–60 × 30–40 m' },
  { key: 'zones', name: 'Zonenfeld mit Zieltoren', hint: 'Drei Zonen, 45–60 × 30–40 m' },
  { key: 'overload', name: 'Überzahl/Unterzahl', hint: 'Zum Beispiel 5:3, 35–50 × 25–35 m' },
  { key: 'open', name: 'Offenes Spielfeld', hint: 'Ohne Tore, 60–100 × 40–70 m' },
]

export function fieldVariantDrill(key: VariantKey): Drill {
  const variant = FIELD_VARIANTS.find((v) => v.key === key)!
  switch (key) {
    case 'standard': {
      const area = { length: 50, width: 35 }
      const b = builder(area)
      addOutline(b, area)
      addCornerCones(b, area)
      addGoal(b, 'goal', 0, area.width / 2, 0)
      addGoal(b, 'goal', area.length, area.width / 2, 180)
      addItem(b, 'player', 2.5, area.width / 2, { color: NEUTRAL, size: 1.5 * b.k, label: 'TW' })
      addItem(b, 'player', area.length - 2.5, area.width / 2, { color: NEUTRAL, size: 1.5 * b.k, label: 'TW', rotation: 180 })
      addTeam(b, area, BLUE, [2, 2, 1], 'left')
      addTeam(b, area, RED, [2, 2, 1], 'right')
      addBall(b, area.length / 2, area.width / 2)
      return variantDrill(variant.name, area, b, '40–60 m', '30–40 m', 12, 'Klassische Spielform auf zwei Tore mit Torhütern.\nSchwerpunkte: Spielaufbau, Positionsspiel, Umschalten.')
    }
    case 'fourGoals': {
      const area = { length: 45, width: 30 }
      const b = builder(area)
      addOutline(b, area)
      addCornerCones(b, area)
      const goal = miniGoalSize(area)
      for (let i = 0; i < 4; i++) {
        const x = ((i + 0.5) / 4) * area.length
        addGoal(b, 'minigoal', x, 0, 90, goal)
        addGoal(b, 'minigoal', x, area.width, -90, goal)
      }
      // Blue defends the top goals with a back four, red attacks them.
      for (let i = 0; i < 4; i++) {
        const x = ((i + 0.5) / 4) * area.length
        addItem(b, 'player', x, area.width * 0.3, { color: BLUE, size: 1.5 * b.k, label: String(i + 2), rotation: 90 })
        addItem(b, 'player', x + (i % 2 ? 4 : -4), area.width * 0.6, { color: RED, size: 1.5 * b.k, label: String(i + 7), rotation: -90 })
      }
      addBall(b, area.length / 2, area.width * 0.66)
      return variantDrill(
        variant.name,
        area,
        b,
        '40–50 m',
        '25–35 m',
        8,
        'Vier Minitore an jeder langen Seite. Die Viererkette verteidigt ihre vier Tore und verschiebt ballorientiert.\nSchwerpunkte: Spielaufbau, Verlagerung, Druck erkennen.',
      )
    }
    case 'counterGoals': {
      const area = { length: 48, width: 35 }
      const b = builder(area)
      addOutline(b, area)
      addCornerCones(b, area)
      const goal = miniGoalSize(area)
      addGoal(b, 'minigoal', area.length / 2, 0, 90, goal + 0.5)
      addGoal(b, 'minigoal', area.length / 2, area.width, -90, goal + 0.5)
      for (const y of [area.width * 0.25, area.width * 0.75]) {
        addGoal(b, 'minigoal', 0, y, 0, goal - 0.5)
        addGoal(b, 'minigoal', area.length, y, 180, goal - 0.5)
      }
      addTeamAcross(b, area, BLUE, [3, 2], 'top')
      addTeamAcross(b, area, RED, [3, 2], 'bottom')
      addBall(b, area.length / 2, area.width / 2)
      return variantDrill(
        variant.name,
        area,
        b,
        '40–55 m',
        '30–40 m',
        10,
        'Gespielt wird auf die Tore oben und unten. Nach Ballgewinn darf zusätzlich schnell auf die kleinen Kontertore an den Seiten gespielt werden.\nSchwerpunkte: Umschalten, Breite.',
      )
    }
    case 'cornerGoals': {
      const area = { length: 42, width: 30 }
      const b = builder(area)
      addOutline(b, area)
      const goal = miniGoalSize(area)
      const inset = 1.5
      addGoal(b, 'minigoal', inset, inset, 45, goal)
      addGoal(b, 'minigoal', area.length - inset, inset, 135, goal)
      addGoal(b, 'minigoal', area.length - inset, area.width - inset, -135, goal)
      addGoal(b, 'minigoal', inset, area.width - inset, -45, goal)
      addTeam(b, area, BLUE, [2, 2], 'left')
      addTeam(b, area, RED, [2, 2], 'right')
      addBall(b, area.length / 2, area.width / 2)
      return variantDrill(
        variant.name,
        area,
        b,
        '35–50 m',
        '25–35 m',
        8,
        'Je ein Minitor in jeder Ecke, schräg zur Mitte gestellt. Jedes Team greift die beiden Tore der anderen Seite an.\nSchwerpunkte: Winkel, Spielverlagerung, Diagonalspiel.',
      )
    }
    case 'cross': {
      const area = { length: 50, width: 35 }
      const b = builder(area)
      addOutline(b, area)
      addCornerCones(b, area)
      const goal = miniGoalSize(area)
      addGoal(b, 'minigoal', 0, area.width / 2, 0, goal)
      addGoal(b, 'minigoal', area.length, area.width / 2, 180, goal)
      addGoal(b, 'minigoal', area.length / 2, 0, 90, goal)
      addGoal(b, 'minigoal', area.length / 2, area.width, -90, goal)
      addTeam(b, area, BLUE, [2, 2], 'left')
      addTeam(b, area, RED, [2, 2], 'right')
      addBall(b, area.length / 2, area.width / 2)
      return variantDrill(
        variant.name,
        area,
        b,
        '40–60 m',
        '30–40 m',
        8,
        'Ein Tor an jeder Seite: Jedes Team verteidigt zwei Tore und greift zwei an.\nSchwerpunkte: Orientierung, Umschalten, Spielverlagerung.',
      )
    }
    case 'zones': {
      const area = { length: 52, width: 35 }
      const b = builder(area)
      addOutline(b, area)
      addCornerCones(b, area)
      addGoal(b, 'goal', 0, area.width / 2, 0)
      addGoal(b, 'goal', area.length, area.width / 2, 180)
      for (const x of [area.length / 3, (2 * area.length) / 3]) {
        addLine(b, 'line', [{ x, y: 0 }, { x, y: area.width }], { pattern: 'dashed' })
      }
      addItem(b, 'player', 2.5, area.width / 2, { color: NEUTRAL, size: 1.5 * b.k, label: 'TW' })
      addItem(b, 'player', area.length - 2.5, area.width / 2, { color: NEUTRAL, size: 1.5 * b.k, label: 'TW', rotation: 180 })
      addTeam(b, area, BLUE, [2, 2, 1], 'left')
      addTeam(b, area, RED, [2, 2, 1], 'right')
      addBall(b, area.length / 2, area.width / 2)
      return variantDrill(
        variant.name,
        area,
        b,
        '45–60 m',
        '30–40 m',
        12,
        'Das Feld ist in drei Zonen geteilt. Regeln je Zone möglich, zum Beispiel Kontaktbegrenzung oder Überzahl im Mittelfeld.\nSchwerpunkte: Raumstruktur, Progression, Zonen überspielen.',
      )
    }
    case 'overload': {
      const area = { length: 42, width: 30 }
      const b = builder(area)
      addOutline(b, area)
      addCornerCones(b, area)
      const goal = miniGoalSize(area)
      addGoal(b, 'minigoal', 0, area.width / 2, 0, goal)
      addGoal(b, 'minigoal', area.length, area.width / 2, 180, goal)
      addTeam(b, area, BLUE, [2, 1, 2], 'left')
      addTeam(b, area, RED, [2, 1], 'right')
      addBall(b, area.length * 0.4, area.width / 2)
      return variantDrill(
        variant.name,
        area,
        b,
        '35–50 m',
        '25–35 m',
        8,
        'Spiel in Überzahl, hier 5 gegen 3. Die Spielerzahl je nach Ziel verändern (z. B. 5:3, 6:4).\nSchwerpunkte: Ballzirkulation, Pressing, Lösungen unter Druck.',
      )
    }
    case 'open': {
      const area = { length: 80, width: 55 }
      const b = builder(area)
      addOutline(b, area, true)
      addCornerCones(b, area)
      return variantDrill(
        variant.name,
        area,
        b,
        '60–100 m',
        '40–70 m',
        null,
        'Offenes Feld ohne Tore, nur mit Hütchen abgesteckt.\nFür Positionsspiel, Drucksteuerung und taktische Abläufe.',
      )
    }
  }
}

/** Players in rows from the top (y = 0) or bottom touchline, for fields played across. */
function addTeamAcross(b: Builder, area: FieldArea, color: string, rows: number[], ownSide: 'top' | 'bottom'): void {
  let n = 0
  rows.forEach((count, row) => {
    const depth = ((row + 1) / (rows.length + 1)) * (area.width / 2) * 0.9
    for (let j = 0; j < count; j++) {
      const along = ((j + 1) / (count + 1)) * area.length
      n++
      addItem(b, 'player', ownSide === 'top' ? along : area.length - along, ownSide === 'top' ? depth : area.width - depth, {
        color,
        rotation: ownSide === 'top' ? 90 : -90,
        size: 1.5 * b.k,
        label: String(n + 1),
      })
    }
  })
}

function variantDrill(
  title: string,
  area: FieldArea,
  b: Builder,
  lengthText: string,
  widthText: string,
  players: number | null,
  description: string,
): Drill {
  addSizeLabel(b, area, 'bottom', lengthText)
  addSizeLabel(b, area, 'left', widthText, -90)
  return fieldDrill(title, area, b, { description, players, fieldSize: `${lengthText.replace(' m', '')} × ${widthText}` })
}

// ---------------------------------------------------------------------------------------
// Y-pass patterns

export type YPassKey = 'basic' | 'vertical' | 'triangle' | 'opponent' | 'zones' | 'buildUp'

export const Y_PASS_VARIANTS: { key: YPassKey; name: string; hint: string }[] = [
  { key: 'basic', name: 'Y-Pass – Grundform', hint: 'A auf B, Rückpass, Verlagerung auf C' },
  { key: 'vertical', name: 'Y-Form – vertikaler Start', hint: 'A vertikal auf B, Ablage, A wahlweise auf C oder D' },
  { key: 'triangle', name: 'Dreiecks-Form', hint: 'A – B – C im Dreieck' },
  { key: 'opponent', name: 'Y-Pass – mit Gegenspieler', hint: 'Gegner binden, dann verlagern' },
  { key: 'zones', name: 'Y-Pass – in Zonen', hint: 'Außen – Zentrum – Außen' },
  { key: 'buildUp', name: 'Y-Pass – im Spielaufbau', hint: 'Mit der Viererkette' },
]

const Y_PASS_PRINCIPLE =
  'Prinzip Y-Pass: Dreieck mit Rückpass – Winkel öffnen, Gegner binden, dann schnell auf die andere Seite verlagern.'

/** Direction (degrees) from one point to another, for players facing their pass partner. */
function facing(from: Point, to: Point): number {
  return Math.round((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI)
}

/** Point `d` meters from `from` towards `to`. */
function toward(from: Point, to: Point, d: number): Point {
  const len = Math.hypot(to.x - from.x, to.y - from.y)
  return { x: from.x + ((to.x - from.x) / len) * d, y: from.y + ((to.y - from.y) / len) * d }
}

/** Pass line between two players, starting and ending a little away from them; `offset` moves it sideways. */
function addPass(b: Builder, from: Point, to: Point, step: number, options: { offset?: number; pattern?: LinePattern } = {}): void {
  const gap = 1.6
  const len = Math.hypot(to.x - from.x, to.y - from.y)
  const o = options.offset ?? 0
  const side = { x: (-(to.y - from.y) / len) * o, y: ((to.x - from.x) / len) * o }
  const shift = (p: Point): Point => ({ x: p.x + side.x, y: p.y + side.y })
  addLine(b, 'pass', [shift(toward(from, to, gap)), shift(toward(to, from, gap))], {
    color: PASS_COLOR,
    step,
    pattern: options.pattern ?? 'solid',
  })
}

/** Y-form with a vertical start: A → B straight ahead, lay-off to A, then A to C or D. */
function verticalYDrill(name: string): Drill {
  const area = { length: 30, width: 26 }
  const b = builder(area)
  b.k = 0.8
  addOutline(b, area)
  addCornerCones(b, area)
  const a = { x: 15, y: 22 }
  const bPos = { x: 15, y: 12 }
  const c = { x: 25, y: 4 }
  const d = { x: 5, y: 4 }
  const player = (p: Point, label: string, rotation: number) =>
    addItem(b, 'player', p.x, p.y, { color: BLUE, size: 1.3, label, rotation })
  player(a, 'A', -90)
  player(bPos, 'B', 90)
  player(c, 'C', facing(c, a))
  player(d, 'D', facing(d, a))
  addBall(b, a.x + 1, a.y - 1)
  addPass(b, a, bPos, 1, { offset: -1 })
  addPass(b, bPos, a, 2, { offset: -1 })
  addPass(b, a, c, 3, { pattern: 'dashed' })
  addPass(b, a, d, 3, { pattern: 'dashed' })
  return fieldDrill(name, area, b, {
    players: 4,
    fieldSize: `${area.length} × ${area.width} m`,
    area: 'tactic',
    description:
      '1. A passt vertikal auf B\n2. B legt ab zu A\n3. A spielt wahlweise rechts auf C oder links auf D (im Ypsilon)\n\n' +
      'Danach die Positionen wechseln, zum Beispiel jeder läuft seinem Pass nach.\n' +
      Y_PASS_PRINCIPLE,
  })
}

/** Triangle: A → B → C → A. */
function triangleDrill(name: string): Drill {
  const area = { length: 30, width: 24 }
  const b = builder(area)
  b.k = 0.8
  addOutline(b, area)
  addCornerCones(b, area)
  const a = { x: 7, y: 19 }
  const bPos = { x: 15, y: 5 }
  const c = { x: 23, y: 19 }
  addItem(b, 'player', a.x, a.y, { color: BLUE, size: 1.3, label: 'A', rotation: facing(a, bPos) })
  addItem(b, 'player', bPos.x, bPos.y, { color: BLUE, size: 1.3, label: 'B', rotation: facing(bPos, c) })
  addItem(b, 'player', c.x, c.y, { color: BLUE, size: 1.3, label: 'C', rotation: facing(c, a) })
  addBall(b, a.x + 1.2, a.y - 0.6)
  addPass(b, a, bPos, 1)
  addPass(b, bPos, c, 2)
  addPass(b, c, a, 3)
  return fieldDrill(name, area, b, {
    players: 3,
    fieldSize: `${area.length} × ${area.width} m`,
    area: 'tactic',
    description:
      '1. A passt auf B\n2. B passt auf C\n3. C passt auf A\n\n' +
      'Varianten: Richtung wechseln, direkt spielen, nach dem Pass auf die Position des Partners laufen.',
  })
}

export function yPassDrill(key: YPassKey): Drill {
  const variant = Y_PASS_VARIANTS.find((v) => v.key === key)!
  if (key === 'vertical') return verticalYDrill(variant.name)
  if (key === 'triangle') return triangleDrill(variant.name)
  const wide = key === 'buildUp'
  const area = wide ? { length: 50, width: 28 } : key === 'zones' ? { length: 36, width: 22 } : { length: 30, width: 20 }
  const b = builder(area)
  b.k = 0.8
  addOutline(b, area)
  addCornerCones(b, area)
  const player = (x: number, y: number, label: string, extra: Partial<Item> = {}) =>
    addItem(b, 'player', x, y, { color: BLUE, size: 1.3, label, rotation: -90, ...extra })

  const top = area.width * 0.25
  const bottom = area.width * 0.75
  const a = { x: area.length * (wide ? 0.4 : 0.5), y: bottom }
  const bPos = { x: area.length * (wide ? 0.14 : 0.15), y: top }
  const c = { x: area.length * (wide ? 0.86 : 0.85), y: top }

  player(a.x, a.y, 'A')
  player(bPos.x, bPos.y, 'B', { rotation: 45 })
  player(c.x, c.y, 'C', { rotation: 135 })
  addBall(b, a.x + 1, a.y - 1)

  let steps: string[]
  if (key === 'opponent') {
    addItem(b, 'player', a.x, (top + bottom) / 2 - 1, { color: RED, size: 1.3, label: '1', rotation: 90 })
    steps = ['Anspiel von A auf B (oder C)', 'Rückpass auf A – der Gegner wird gebunden', 'Spielverlagerung von A auf die freie Seite (C)']
  } else if (key === 'zones') {
    for (const x of [area.length / 3, (2 * area.length) / 3]) {
      addLine(b, 'line', [{ x, y: 0 }, { x, y: area.width }], { pattern: 'dashed' })
    }
    addItem(b, 'text', area.length / 6, area.width - 1.8, { label: 'Außen', size: 0.6 })
    addItem(b, 'text', area.length / 2, area.width - 1.2, { label: 'Zentrum', size: 0.6 })
    addItem(b, 'text', (5 * area.length) / 6, area.width - 1.8, { label: 'Außen', size: 0.6 })
    steps = ['Vertikaler Pass von A in die Halbraum-Zone (B)', 'Rückpass ins Zentrum (A)', 'Diagonale Verlagerung von A auf die andere Seite (C)']
  } else if (key === 'buildUp') {
    // Back four: A is the left centre back; B and C are pushed up.
    player(area.length * 0.12, bottom, '3', { name: 'LV' })
    player(area.length * 0.62, bottom, '5', { name: 'IV' })
    player(area.length * 0.88, bottom, '2', { name: 'RV' })
    b.items.find((i) => i.label === 'A')!.name = 'IV'
    steps = ['Innenverteidiger (A) spielt auf B', 'Rückpass auf A – der Gegner wird angelockt', 'Verlagerung von A auf die gegenüberliegende Seite (C)']
  } else {
    steps = ['Pass von A auf B', 'Rückpass von B auf A', 'Verlagerung von A auf C']
  }

  // 1: A → B, 2: back pass B → A (slightly curved beside the first), 3: A → C (dashed).
  const gap = 1.6
  addLine(b, 'pass', [toward(a, bPos, gap), toward(bPos, a, gap)], { color: PASS_COLOR, step: 1 })
  // The back pass runs parallel to the first pass, a little to the side.
  const len = Math.hypot(a.x - bPos.x, a.y - bPos.y)
  const side = { x: ((a.y - bPos.y) / len) * 2.4, y: (-(a.x - bPos.x) / len) * 2.4 }
  const shift = (p: Point): Point => ({ x: p.x + side.x, y: p.y + side.y })
  addLine(b, 'pass', [shift(toward(bPos, a, gap)), shift(toward(a, bPos, gap))], { color: PASS_COLOR, step: 2 })
  addLine(b, 'pass', [toward(a, c, gap), toward(c, a, gap)], { color: PASS_COLOR, step: 3, pattern: 'dashed' })

  return fieldDrill(variant.name, area, b, {
    players: wide ? 6 : key === 'opponent' ? 4 : 3,
    fieldSize: `${area.length} × ${area.width} m`,
    area: 'tactic',
    description: `${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${Y_PASS_PRINCIPLE}`,
  })
}

// ---------------------------------------------------------------------------------------
// Own size of the empty field, drawn in

/** Small-sided format whose usual area is closest to the given field (1:1 to 9:9). */
export function standardFormat(area: FieldArea): SizeFormat {
  const size = area.length * area.width
  const usual = (f: SizeFormat) => middle(f.length) * middle(f.width)
  return SIZE_FORMATS.reduce((best, f) =>
    Math.abs(Math.log(usual(f) / size)) < Math.abs(Math.log(usual(best) / size)) ? f : best,
  )
}

/** Item types that belong to the field itself (fixed with it); players and the ball stay movable. */
const FIELD_PART_TYPES = new Set<ItemType>(['text', 'cone', 'goal', 'minigoal'])

/** True for the parts of a drawn-in field that are fixed with it. */
export function isFieldPart(element: Item | Line | Zone): boolean {
  return 'type' in element && 'size' in element ? FIELD_PART_TYPES.has((element as Item).type) : true
}

/** Fixes the field: outline, size labels with their arrows, cones and goals. */
function lockFieldParts(b: Builder): void {
  for (const item of b.items) if (FIELD_PART_TYPES.has(item.type)) item.locked = true
  for (const line of b.lines) line.locked = true
  for (const zone of b.zones) zone.locked = true
}

/** Most players per team for a field from the player count */
export const MAX_TEAM_PLAYERS = 11

/** How the drawn-in field looks: outline, fill, corners and players. */
export interface FieldDrawOptions {
  pattern: LinePattern
  weight: LineWeight
  color: string
  /** Fill color inside the outline, null = no fill */
  fill: string | null
  fillOpacity: number
  rounded: boolean
  /** Players as circle with facing arrow, or plain circles / triangles */
  playerShape: 'arrow' | 'circle' | 'triangle'
  /** Shirt numbers on the players */
  numbers: boolean
  /** Colors of the two teams (first = left/bottom team) */
  teamColors: [string, string]
  /** Cones on the four corners */
  cones: boolean
  /** Cones spread along each side between the corners (0–5; none where a goal stands) */
  sideCones: number
  coneColor: string
  coneSize: ConeSize
  /** Goals on each side as seen on screen (0–4, spread evenly) */
  goals: Record<ScreenSide, number>
  goalType: 'minigoal' | 'goal'
  /** Outline, size labels, cones and goals fixed (players and ball stay movable) */
  lockField: boolean
  /** Opacity of the size labels: 0 = none, else 0.1–1 */
  labelOpacity: number
}

/** Valid opacity of the size labels: 0 (none) or 0.1–1. */
export function isLabelOpacity(value: unknown): value is number {
  return typeof value === 'number' && (value === 0 || (value >= 0.1 && value <= 1))
}

export type ConeSize = 'normal' | 'large' | 'xlarge'
export const CONE_SIZES: { value: ConeSize; label: string; factor: number }[] = [
  { value: 'normal', label: 'Normal', factor: 1 },
  { value: 'large', label: 'Groß', factor: 1.6 },
  { value: 'xlarge', label: 'Sehr groß', factor: 2.2 },
]
export const MAX_SIDE_CONES = 5

export type ScreenSide = 'top' | 'bottom' | 'left' | 'right'
export const SCREEN_SIDES: ScreenSide[] = ['top', 'bottom', 'left', 'right']
export const MAX_SIDE_GOALS = 4

export const DEFAULT_FIELD_DRAW_OPTIONS: FieldDrawOptions = {
  pattern: 'dashed',
  weight: 'medium',
  color: WHITE,
  fill: null,
  fillOpacity: 0.25,
  rounded: false,
  playerShape: 'arrow',
  numbers: true,
  teamColors: [BLUE, RED],
  cones: false,
  sideCones: 0,
  coneColor: CONE,
  coneSize: 'large',
  goals: { top: 0, bottom: 0, left: 0, right: 0 },
  goalType: 'minigoal',
  lockField: true,
  labelOpacity: 0.5,
}

/**
 * Field side for a side as seen on screen; portrait turns the view by -90°, so the
 * field's start (x = 0) is at the bottom there.
 */
function fieldSide(side: ScreenSide, orientation: 'landscape' | 'portrait'): FieldSide {
  if (orientation === 'landscape') return { left: 'start', right: 'end', top: 'near', bottom: 'far' }[side] as 'start'
  return { bottom: 'start', top: 'end', left: 'near', right: 'far' }[side] as 'start'
}

type FieldSide = 'start' | 'end' | 'near' | 'far'

/** Size and places (meters along the side) of `count` goals spread evenly along one side. */
function sideGoalLayout(area: FieldArea, side: FieldSide, count: number, type: 'minigoal' | 'goal') {
  const n = Math.min(MAX_SIDE_GOALS, Math.max(0, Math.round(count)))
  const along = side === 'start' || side === 'end' ? area.width : area.length
  // Big goals (5 m wide at size 1) shrink when several share a short side.
  const size = type === 'goal' ? clampItemSize(Math.min(1, along / (n + 1) / 6)) : miniGoalSize(area)
  const width = (type === 'goal' ? 5 : MINIGOAL.width) * size
  return { size, width, places: Array.from({ length: n }, (_, i) => ((i + 1) / (n + 1)) * along) }
}

/** Point on a side, `t` meters along it. */
function sidePoint(area: FieldArea, side: FieldSide, t: number): Point {
  if (side === 'start') return { x: 0, y: t }
  if (side === 'end') return { x: area.length, y: t }
  if (side === 'near') return { x: t, y: 0 }
  return { x: t, y: area.width }
}

const SIDE_FACING: Record<FieldSide, number> = { start: 0, end: 180, near: 90, far: -90 }

/** Goals spread evenly along one side, opening into the field. */
function addSideGoals(b: Builder, area: FieldArea, side: FieldSide, count: number, type: 'minigoal' | 'goal'): void {
  const { size, places } = sideGoalLayout(area, side, count, type)
  for (const t of places) {
    const p = sidePoint(area, side, t)
    addGoal(b, type, p.x, p.y, SIDE_FACING[side], size)
  }
}

/**
 * Field size for a player count, e.g. 6 against 3: the usual space per player of the
 * small-sided formats (in between two formats it is interpolated) and their shape.
 */
export function areaForPlayers(teamA: number, teamB: number): FieldArea {
  const perTeam = Math.max(0.5, (teamA + teamB) / 2)
  const usualArea = (f: SizeFormat) => middle(f.length) * middle(f.width)
  const ratio = (f: SizeFormat) => middle(f.length) / middle(f.width)
  const perPlayer = (f: SizeFormat) => usualArea(f) / (2 * f.players)
  const first = SIZE_FORMATS[0]
  const last = SIZE_FORMATS[SIZE_FORMATS.length - 1]
  let spacePerPlayer: number
  let shape: number
  if (perTeam <= first.players) {
    spacePerPlayer = perPlayer(first)
    shape = ratio(first)
  } else if (perTeam >= last.players) {
    spacePerPlayer = perPlayer(last)
    shape = ratio(last)
  } else {
    const upper = SIZE_FORMATS.findIndex((f) => f.players >= perTeam)
    const a = SIZE_FORMATS[upper - 1]
    const b = SIZE_FORMATS[upper]
    const t = (perTeam - a.players) / (b.players - a.players)
    spacePerPlayer = perPlayer(a) + (perPlayer(b) - perPlayer(a)) * t
    shape = ratio(a) + (ratio(b) - ratio(a)) * t
  }
  const total = spacePerPlayer * perTeam * 2
  const clamp = (v: number) => Math.min(MAX_AREA, Math.max(MIN_AREA, Math.round(v)))
  return { length: clamp(Math.sqrt(total * shape)), width: clamp(Math.sqrt(total / shape)) }
}

/**
 * Scene content for an own-size empty field: outline with the entered size, size labels and
 * the players (the usual number for that size, or `teams` = players of blue and red).
 */
export function customFieldScene(
  area: FieldArea,
  orientation: 'landscape' | 'portrait',
  options: FieldDrawOptions = DEFAULT_FIELD_DRAW_OPTIONS,
  teams?: [number, number],
): { items: Item[]; lines: Line[]; zones: Zone[]; format: SizeFormat } {
  const b = builder(area)
  addOutline(b, area, options.pattern !== 'solid', {
    pattern: options.pattern,
    weight: options.weight,
    color: options.color,
    fillColor: options.fill ?? options.color,
    fillOpacity: options.fill ? options.fillOpacity : 0,
    ...(options.rounded ? { rounded: true } : {}),
  })
  const format = standardFormat(area)
  const coneSize = clampItemSize(b.k * (CONE_SIZES.find((c) => c.value === options.coneSize)?.factor ?? 1))
  const cone = (x: number, y: number) => addItem(b, 'cone', x, y, { color: options.coneColor, size: coneSize })
  if (options.cones) {
    // On rounded corners the cones sit on the middle of the curve (45°).
    const r = options.rounded
      ? zoneCornerRadius({ shape: 'rect', width: area.length, height: area.width, corners: null, rounded: true })
      : 0
    const inset = r - r / Math.SQRT2
    cone(inset, inset)
    cone(area.length - inset, inset)
    cone(area.length - inset, area.width - inset)
    cone(inset, area.width - inset)
  }
  const sideCones = Math.min(MAX_SIDE_CONES, Math.max(0, Math.round(options.sideCones)))
  for (const side of SCREEN_SIDES) {
    const fs = fieldSide(side, orientation)
    const goals = sideGoalLayout(area, fs, options.goals[side], options.goalType)
    const along = fs === 'start' || fs === 'end' ? area.width : area.length
    for (let i = 1; i <= sideCones; i++) {
      const t = (i / (sideCones + 1)) * along
      // No cone where a goal stands.
      if (goals.places.some((g) => Math.abs(g - t) < goals.width / 2 + 0.8)) continue
      const p = sidePoint(area, fs, t)
      cone(p.x, p.y)
    }
    addSideGoals(b, area, fs, options.goals[side], options.goalType)
  }
  const [blue, red] = teams ?? [format.players, format.players]
  const label = options.numbers ? undefined : () => ''
  if (blue > 0) addTeam(b, area, options.teamColors[0], SIZE_ROWS[Math.min(blue, MAX_TEAM_PLAYERS)], 'left', label)
  if (red > 0) addTeam(b, area, options.teamColors[1], SIZE_ROWS[Math.min(red, MAX_TEAM_PLAYERS)], 'right', label)
  for (const item of b.items) {
    if (item.type !== 'player') continue
    if (options.playerShape === 'arrow') delete item.facing
    else Object.assign(item, { shape: options.playerShape, facing: false })
  }
  addBall(b, area.length / 2, area.width / 2)
  const meters = (v: number) => `${v.toLocaleString('de-DE')} m`
  // The labels read along their side on screen in both orientations.
  const portrait = orientation === 'portrait'
  if (options.labelOpacity > 0) {
    addSizeLabel(b, area, 'bottom', meters(area.length), portrait ? -90 : 0, options.labelOpacity)
    addSizeLabel(b, area, 'left', meters(area.width), portrait ? 0 : -90, options.labelOpacity)
  }
  if (options.lockField) lockFieldParts(b)
  return { items: b.items, lines: b.lines, zones: b.zones, format }
}

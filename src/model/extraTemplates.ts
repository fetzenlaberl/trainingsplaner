// More ready-made fields: zone layouts of the big pitch, running drills, small-sided games and
// tactical structures. Only the set-up (sizes, goals, positions) is taken over from common
// coaching ideas; everything is drawn with the app's own items, lines and zones.

import { PITCH } from '../field/dimensions'
import { TURQUOISE_LINE, type PitchStyle } from '../field/pitchStyle'
import type { LinePattern } from '../lines/styles'
import {
  addBall,
  addCornerCones,
  addGoal,
  addItem,
  addLine,
  addOutline,
  builder,
  fieldDrill,
  type Builder,
} from './fieldTemplates'
import { emptyDrill } from './serialize'
import type { Category, Drill, Item, Point, Zone } from './types'

export const WHITE = '#ffffff'
export const RED = '#dc2626'
export const BLUE = '#2563eb'
export const YELLOW = '#facc15'
export const ORANGE = '#f97316'
export const BLACK = '#111827'
export const GREEN = '#22c55e'
export const GREY = '#9ca3af'
export const PASS = '#facc15'
export const SKY = '#38bdf8'
export const PURPLE = '#a855f7'
const NAVY_TEAM = '#1e3a8a'
const CYAN_TEAM = '#22d3ee'

export type Pt = [number, number]

export const FULL = { length: PITCH.length, width: PITCH.width }
/** Penalty area edges across the pitch and the inner lanes (half-spaces) */
export const PA_NEAR = PITCH.penaltyAreaDepth
export const PA_FAR = PITCH.length - PITCH.penaltyAreaDepth
export const SIDE_L = (PITCH.width - PITCH.penaltyAreaWidth) / 2
export const SIDE_R = PITCH.width - SIDE_L
const LANE_L = 27.9
const LANE_R = PITCH.width - LANE_L
export const HALF = PITCH.length / 2

export const pts = (list: Pt[]): Point[] => list.map(([x, y]) => ({ x, y }))

/** Marking line of the field (fixed with it). */
export function mark(b: Builder, list: Pt[], pattern: LinePattern = 'dashed', color = WHITE): void {
  addLine(b, 'line', pts(list), { pattern, weight: 'extraThin', color })
  b.lines[b.lines.length - 1].locked = true
}

/** Plain drawn line, e.g. connections between players (not fixed). */
export function link(b: Builder, a: Pt, c: Pt, color = GREY, pattern: LinePattern = 'solid'): void {
  addLine(b, 'line', pts([a, c]), { pattern, weight: 'extraThin', color })
}

export function run(b: Builder, list: Pt[], pattern: LinePattern = 'solid', color = WHITE): void {
  addLine(b, 'run', pts(list), { pattern, weight: 'extraThin', color })
}

export function pass(b: Builder, from: Pt, to: Pt, pattern: LinePattern = 'dashed', step: number | null = null): void {
  addLine(b, 'pass', pts([from, to]), { pattern, color: PASS, step })
}

export function player(b: Builder, color: string, label: string, [x, y]: Pt, extra: Partial<Item> = {}): void {
  addItem(b, 'player', x, y, { color, label, size: 1.5 * b.k, ...extra })
}

export function team(b: Builder, color: string, list: [string, number, number][], rotation = 0): void {
  for (const [label, x, y] of list) player(b, color, label, [x, y], { rotation })
}

export function text(b: Builder, label: string, [x, y]: Pt, size = 0.6, rotation = 0): void {
  addItem(b, 'text', x, y, { label, size, rotation })
}

export function cone(b: Builder, [x, y]: Pt): void {
  addItem(b, 'cone', x, y, { color: ORANGE, size: b.k })
}

/** Rectangle zone from corner (x0, y0) to (x1, y1). */
export function rect(b: Builder, x0: number, y0: number, x1: number, y1: number, style: Partial<Zone> = {}): void {
  b.zones.push({
    id: `zone-tpl-z${b.zones.length + 1}`,
    shape: 'rect',
    x: (x0 + x1) / 2,
    y: (y0 + y1) / 2,
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
    rotation: 0,
    color: WHITE,
    fillColor: WHITE,
    fillOpacity: 0,
    dashed: false,
    label: '',
    goals: 0,
    corners: null,
    ...style,
  })
}

/** Zone with free corners (e.g. pentagon or block shape), given as points on the field. */
export function poly(b: Builder, corners: Pt[], style: Partial<Zone> = {}): void {
  const xs = corners.map((c) => c[0])
  const ys = corners.map((c) => c[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  rect(b, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), {
    corners: corners.map(([x, y]) => ({ x: x - cx, y: y - cy })),
    ...style,
  })
}

/** Lines through several players in a row (a chain), e.g. a defensive line. */
export function chain(b: Builder, list: Pt[], color = WHITE): void {
  for (let i = 1; i < list.length; i++) link(b, list[i - 1], list[i], color)
}

export interface DrillOptions {
  description: string
  players: number | null
  area: 'drill' | 'tactic'
  category: Category | null
  fieldSize?: string
  pitch?: Partial<PitchStyle>
}

/** Drill on the big pitch or half pitch, shown upright (own goal at the bottom). */
export function pitchDrill(title: string, fieldType: 'full' | 'half', b: Builder, o: DrillOptions): Drill {
  const drill = emptyDrill()
  return {
    ...drill,
    title,
    description: o.description,
    area: o.area,
    category: o.category,
    info: { ...drill.info, players: o.players, fieldSize: o.fieldSize ?? '' },
    fieldType,
    pitch: { ...drill.pitch, orientation: 'portrait', ...o.pitch },
    scenes: [{ ...drill.scenes[0], items: b.items, lines: b.lines, zones: b.zones }],
  }
}

/** Drill on an empty field of its own size. */
export function areaDrill(
  title: string,
  area: { length: number; width: number },
  b: Builder,
  o: DrillOptions & { orientation?: 'landscape' | 'portrait' },
): Drill {
  const drill = fieldDrill(title, area, b, {
    description: o.description,
    players: o.players,
    fieldSize: o.fieldSize ?? `${area.length} × ${area.width} m`,
    orientation: o.orientation ?? 'landscape',
    area: o.area,
  })
  return { ...drill, category: o.category, pitch: { ...drill.pitch, ...o.pitch } }
}

// ---------------------------------------------------------------------------------------
// Zone layouts of the big pitch

function zonesGrid(name: string): Drill {
  const b = builder(FULL)
  for (const x of [PA_NEAR, 35, 70, PA_FAR]) mark(b, [[x, 0], [x, PITCH.width]])
  for (const y of [SIDE_L, LANE_L, LANE_R, SIDE_R]) mark(b, [[PA_NEAR, y], [PA_FAR, y]])
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: null,
    description:
      'Großfeld in Zonen: Querlinien an den Strafräumen und bei 35 m / 70 m, Längslinien an der Strafraumbreite und an den Halbräumen.\n' +
      'Für Positionsspiel, Abstände und Verschieben.',
  })
}

function lanesWithBoxes(name: string): Drill {
  const b = builder(FULL)
  for (const x of [PA_NEAR, PA_FAR]) mark(b, [[x, 0], [x, PITCH.width]], 'solid')
  for (const y of [SIDE_L, LANE_L, LANE_R, SIDE_R]) mark(b, [[PA_NEAR, y], [PA_FAR, y]], 'solid')
  for (const x of [35, 70]) {
    mark(b, [[x, 0], [x, SIDE_L]], 'solid')
    mark(b, [[x, SIDE_R], [x, PITCH.width]], 'solid')
  }
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: null,
    description:
      'Fünf Längskorridore (Flügel, Halbräume, Zentrum) zwischen den Strafräumen; die Flügel zusätzlich in Kästen geteilt.\n' +
      'Regel zum Beispiel: höchstens zwei Spieler im selben Korridor, höchstens drei auf einer Höhe.',
  })
}

function diagonalZones(name: string): Drill {
  const b = builder(FULL)
  for (const x of [35, 70]) mark(b, [[x, 0], [x, PITCH.width]])
  for (const y of [SIDE_L, SIDE_R]) mark(b, [[PA_NEAR, y], [PA_FAR, y]])
  for (const y of [LANE_L, LANE_R]) mark(b, [[35, y], [70, y]])
  mark(b, [[PA_NEAR, SIDE_L], [0, LANE_L]])
  mark(b, [[PA_NEAR, SIDE_R], [0, LANE_R]])
  mark(b, [[PA_FAR, SIDE_L], [PITCH.length, LANE_L]])
  mark(b, [[PA_FAR, SIDE_R], [PITCH.length, LANE_R]])
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: null,
    description:
      'Zonen mit schrägen Linien von den Strafraumecken zum Tor: Sie zeigen den Raum, aus dem Torschüsse am gefährlichsten sind.\n' +
      'Mittelfeld in Drittel und Halbräume geteilt.',
  })
}

function middleBlock(name: string): Drill {
  const b = builder(FULL)
  for (const x of [35, 70]) mark(b, [[x, 0], [x, PITCH.width]])
  for (const y of [SIDE_L, SIDE_R]) mark(b, [[PA_NEAR, y], [PA_FAR, y]])
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: null,
    description:
      'Mittlerer Block: Querlinien bei 35 m und 70 m, Längslinien an der Strafraumbreite.\n' +
      'Für Verteidigen im kompakten Block und Verschieben als Einheit.',
  })
}

// ---------------------------------------------------------------------------------------
// Running drills on the big pitch

function shuttleRuns(name: string): Drill {
  const b = builder(FULL)
  const lengths = [5.5, 11, 16.5, 34.5]
  lengths.forEach((len, i) => {
    const y = 58 + i * 2.2
    run(b, [[0, y], [len, y]])
    run(b, [[len, y + 0.8], [0, y + 0.8]])
    cone(b, [len + 0.8, y + 0.4])
  })
  player(b, BLUE, '', [-2, 61])
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'warmup',
    players: 1,
    description:
      'Pendelläufe von der Torlinie: 5,5 m, 11 m, 16,5 m und 34,5 m jeweils hin und zurück = 135 m je Durchgang.\n' +
      '3 Durchgänge = 405 m mit hoher Intensität. Pause zwischen den Durchgängen nach Belastungsziel.',
  })
}

function boxToBoxRuns(name: string): Drill {
  const b = builder(FULL)
  run(b, [[PA_NEAR, SIDE_L], [PA_FAR, SIDE_L]])
  run(b, [[PA_FAR, SIDE_L], [PA_FAR, SIDE_R]], 'dotted')
  run(b, [[PA_FAR, SIDE_R], [PA_NEAR, SIDE_R]])
  run(b, [[PA_NEAR, SIDE_R], [PA_NEAR, SIDE_L]], 'dotted')
  for (const p of [[PA_NEAR, SIDE_L], [PA_FAR, SIDE_L], [PA_FAR, SIDE_R], [PA_NEAR, SIDE_R]] as Pt[]) cone(b, p)
  player(b, BLUE, '', [PA_NEAR - 2, SIDE_L])
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'warmup',
    players: 1,
    description:
      'Rechteck von Strafraum zu Strafraum: lange Seiten (72 m) im Sprint, kurze Seiten (40 m) locker traben.\n' +
      '8 Runden. Gepunktet = traben, durchgezogen = Sprint.',
  })
}

function boxToBoxSprints(name: string): Drill {
  const b = builder(FULL)
  const y1 = 29
  const y2 = 37
  run(b, [[0, y1], [PA_NEAR, y1]], 'dashed')
  run(b, [[PA_NEAR, y1], [PA_FAR, y1]])
  run(b, [[PA_FAR, y1], [99, y1], [99, y2], [PA_FAR, y2]], 'dashed')
  run(b, [[PA_FAR, y2], [PA_NEAR, y2]])
  for (const p of [[PA_NEAR, y1], [PA_FAR, y1], [PA_FAR, y2], [PA_NEAR, y2]] as Pt[]) cone(b, p)
  player(b, BLUE, '', [1.5, y1 - 2])
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'warmup',
    players: 1,
    description:
      'Antraben bis zur Strafraumlinie, Sprint bis zum anderen Strafraum, im Strafraum locker wenden, Sprint zurück.\n' +
      '6 Durchgänge. Gestrichelt = traben, durchgezogen = Sprint.',
  })
}

function wSprints(name: string): Drill {
  const b = builder(FULL)
  const start: Pt = [18.5, 34]
  const targets: Pt[] = [
    [HALF, 15],
    [HALF, 34],
    [HALF, 53],
  ]
  for (const [x, y] of targets) {
    const side = y < 34 ? -1 : y > 34 ? 1 : 0
    run(b, [start, [x, y]])
    run(b, [[x, y + (side === 0 ? 1 : side * 1.2)], [start[0], start[1] + (side === 0 ? 1 : side * 0.6)]])
    cone(b, [x + 1, y])
  }
  player(b, BLUE, '', [start[0] - 2, start[1]])
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'warmup',
    players: 1,
    description:
      'Vom Strafraum zu drei Hütchen an der Mittellinie (links, Mitte, rechts) und jeweils zurück – Laufweg wie ein W.\n' +
      '3 Durchgänge, Ziel unter 45 Sekunden je Durchgang.',
  })
}

// ---------------------------------------------------------------------------------------
// Small-sided games

function squareOutside(name: string): Drill {
  const area = { length: 20, width: 20 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  team(b, BLUE, [
    ['2', 5, 6],
    ['3', 15, 5],
    ['4', 6, 15],
    ['5', 15, 14],
  ])
  team(b, ORANGE, [
    ['2', 10, 8],
    ['3', 7, 11],
    ['4', 13, 11],
    ['5', 10, 15],
  ])
  team(b, YELLOW, [
    ['N', 10, -2],
    ['N', 22, 10],
    ['N', 10, 22],
    ['N', -2, 10],
  ])
  addBall(b, 5.8, 7)
  pass(b, [5, 6], [15, 5])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 12,
    description:
      'Ballbesitz 4 gegen 4 im Quadrat mit 4 neutralen Außenspielern (Gelb), die immer mit dem Team in Ballbesitz spielen.\n' +
      'Varianten: Kontakte der Außenspieler begrenzen, Punkt für 8 Pässe in Folge, nach Ballverlust sofort Gegenpressing.',
  })
}

function squareFive(name: string): Drill {
  const area = { length: 22, width: 22 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  team(b, BLUE, [
    ['2', 5, 5],
    ['3', 17, 6],
    ['4', 11, 11],
    ['5', 5, 17],
    ['6', 17, 16],
  ])
  team(b, ORANGE, [
    ['2', 11, 4],
    ['3', 7, 10],
    ['4', 15, 11],
    ['5', 11, 18],
    ['6', 13, 15],
  ])
  addBall(b, 11.8, 11.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 10,
    description: 'Ballbesitz 5 gegen 5 im Quadrat ohne Tore. Punkt für 10 Pässe in Folge.\nSchwerpunkte: Freilaufen, Körperstellung, Spiel unter Druck.',
  })
}

function squareTwoPlusTwo(name: string): Drill {
  const area = { length: 20, width: 20 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  team(b, BLUE, [
    ['2', 7, 7],
    ['3', 13, 13],
    ['4', -2, 10],
    ['5', 22, 10],
  ])
  team(b, RED, [
    ['2', 13, 7],
    ['3', 7, 13],
    ['4', 10, -2],
    ['5', 10, 22],
  ])
  addBall(b, 7.8, 7.8)
  pass(b, [-2, 10], [7, 7])
  pass(b, [7, 7], [13, 13])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 8,
    description:
      'Je Team 2 Spieler im Quadrat und 2 Außenspieler an gegenüberliegenden Seiten (Blau links/rechts, Rot oben/unten).\n' +
      'Punkt, wenn der Ball von einem Außenspieler über die Innenspieler zum anderen Außenspieler kommt.',
  })
}

function twoHalves(name: string): Drill {
  const area = { length: 30, width: 20 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[0, 10], [30, 10]], 'solid')
  team(b, RED, [
    ['2', 6, 3],
    ['3', 23, 4],
  ])
  team(b, BLUE, [
    ['2', 5, 16],
    ['3', 24, 16],
  ])
  team(b, YELLOW, [
    ['A', 14, 6],
    ['A', 16, 14],
  ])
  addBall(b, 5.2, 15)
  pass(b, [5, 16], [24, 16])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 6,
    description:
      'In jeder Hälfte 2 gegen 1: Rot und Blau bekommen einen Punkt für 5 Pässe in Folge. Die Gelben verteidigen; erobern sie den Ball und dribbeln hinaus, bekommen sie den Punkt.\n' +
      'Coaching: Ist der Pass gut genug, damit der Mitspieler direkt spielen kann? Wann langsam, wann schnell?',
  })
}

function sixGoals(name: string): Drill {
  const area = { length: 45, width: 32 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  for (const [x, size] of [
    [7.5, 2],
    [22.5, 2.5],
    [37.5, 2],
  ]) {
    addGoal(b, 'minigoal', x, 0, 90, size)
    addGoal(b, 'minigoal', x, area.width, -90, size)
  }
  team(b, RED, [
    ['2', 6, 7],
    ['3', 16, 8],
    ['4', 26, 9],
    ['5', 36, 7],
    ['6', 11, 15],
    ['7', 30, 15],
  ])
  team(b, BLUE, [
    ['2', 8, 25],
    ['3', 18, 24],
    ['4', 28, 25],
    ['5', 38, 24],
    ['6', 20, 18],
    ['7', 36, 18],
  ])
  team(b, ORANGE, [
    ['N', 15, -2.5],
    ['N', 30, -2.5],
    ['N', 15, 34.5],
    ['N', 30, 34.5],
    ['N', -2.5, 16],
    ['N', 47.5, 16],
  ])
  addBall(b, 22.5, 16)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 18,
    description:
      'Gerichteter Ballbesitz 6 gegen 6 plus 6 Neutrale (Orange) mit einem Kontakt. Rot spielt auf die drei Tore unten, Blau auf die drei oben.\n' +
      'Tor in der Mitte = 2 Punkte, außen = 1 Punkt.\n' +
      'Mit Ball: Ist ein Tor zu, ein anderes suchen – kurze Verlagerungen auf den richtigen Fuß.\n' +
      'Gegen den Ball: Räume kontrollieren, mit Deckungsschatten Passwege schließen.',
  })
}

function nineVsSix(name: string): Drill {
  const b = builder(FULL)
  addGoal(b, 'goal', 0, 34, 0)
  // Mini goals just inside the halfway line (the half pitch ends there).
  addGoal(b, 'minigoal', HALF - 2, 20, 180, 2.5)
  addGoal(b, 'minigoal', HALF - 2, 48, 180, 2.5)
  mark(b, [[0, 34], [HALF, 34]])
  player(b, GREEN, 'TW', [2.5, 34])
  team(b, BLUE, [
    ['2', 10, 28],
    ['3', 10, 40],
    ['4', 18, 22],
    ['5', 18, 46],
    ['6', 28, 34],
    ['7', 38, 34],
  ])
  team(b, RED, [
    ['2', 38, 60],
    ['3', 38, 40],
    ['4', 46, 50],
    ['6', 30, 46],
    ['7', 22, 62],
    ['8', 32, 56],
    ['9', 14, 54],
    ['10', 24, 50],
    ['11', 44, 64],
  ], 180)
  addBall(b, 46, 52)
  pass(b, [46, 50], [32, 56])
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'game',
    players: 16,
    fieldSize: 'Halbfeld',
    description:
      'Rot spielt 9 gegen 6 in einer Längshälfte und braucht 5 Pässe, bevor in die andere Hälfte verlagert und aufs Tor gespielt werden darf. Nach 10 Pässen zählt ein Tor auch direkt aus der eigenen Hälfte.\n' +
      'Blau erobert den Ball und kontert auf die zwei Minitore an der Mittellinie.\n' +
      'Mit Ball: ständig anbieten, nach 5 Pässen schnell verlagern und abschließen, bevor der Gegner verschiebt.',
  })
}

function fourRondos(name: string): Drill {
  const area = { length: 30, width: 30 }
  const b = builder(area)
  for (const [cx, cy] of [
    [8, 8],
    [22, 8],
    [8, 22],
    [22, 22],
  ]) {
    rect(b, cx - 6, cy - 6, cx + 6, cy + 6, { dashed: true, pattern: 'dashed' })
    player(b, RED, '', [cx - 4, cy - 4])
    player(b, RED, '', [cx + 4, cy - 4])
    player(b, RED, '', [cx, cy + 4.5])
    player(b, BLUE, '', [cx, cy])
  }
  addBall(b, 4.8, 4.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'warmup',
    players: 16,
    fieldSize: '4 × 12 × 12 m',
    description:
      '4 Rondos 3 gegen 1 nebeneinander, 3 × 2 Minuten, Verteidiger regelmäßig wechseln.\n' +
      'Coaching: Qualität der Ballannahme, Passschärfe, offene Körperstellung, Ball mit dem Körper schützen.',
  })
}

function tenVsSix(name: string): Drill {
  const area = { length: 44, width: 32 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  team(b, BLUE, [
    ['1', 2.5, 16],
    ['2', 10, 3],
    ['5', 10, 29],
    ['3', 22, 3],
    ['4', 22, 29],
    ['6', 16, 16],
    ['8', 26, 10],
    ['10', 26, 22],
    ['7', 38, 5],
    ['11', 38, 27],
  ])
  team(b, RED, [
    ['', 14, 10],
    ['', 14, 22],
    ['', 22, 16],
    ['', 30, 13],
    ['', 30, 19],
    ['', 36, 16],
  ], 180)
  addBall(b, 3.4, 17)
  pass(b, [2.5, 16], [10, 3])
  pass(b, [10, 3], [26, 10])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 16,
    description:
      'Ballbesitz 10 gegen 6, 4 × 4 Minuten, die 6 Verteidiger wechseln. Das Team in Ballbesitz stellt sich in seiner Grundordnung auf (z. B. 4-3-3).\n' +
      'Coaching: um den Gegner herum und durch ihn hindurch spielen, Druck anlocken, Technik bei Annahme und Pass.',
  })
}

function possessionThreeVsTwo(name: string): Drill {
  const area = { length: 50, width: 35 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[34, 0], [34, 35]], 'dashed')
  addGoal(b, 'goal', 50, 17.5, 180, 0.7)
  player(b, RED, 'TW', [48.5, 17.5], { rotation: 180 })
  team(b, BLUE, [
    ['2', 6, 6],
    ['3', 6, 29],
    ['4', 14, 17.5],
    ['5', 22, 5],
    ['6', 22, 30],
    ['7', 28, 17.5],
    ['9', 42, 17.5],
  ], 0)
  team(b, RED, [
    ['', 12, 11],
    ['', 12, 24],
    ['', 22, 14],
    ['', 22, 21],
    ['', 39, 12],
    ['', 39, 23],
  ], 180)
  addBall(b, 6.8, 7)
  pass(b, [6, 6], [22, 5])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 14,
    orientation: 'portrait',
    description:
      'Ballbesitz 6 gegen 4 in der großen Zone; nach mindestens 5 Pässen darf in die Angriffszone gespielt werden. Zwei Spieler laufen nach – 3 gegen 2 aufs Tor.\n' +
      '2 × 8 Minuten. Coaching: Spiel unter Druck, Linien überspielen.',
  })
}

function buildUpTwoGoals(name: string): Drill {
  const b = builder(FULL)
  // Top line a little in front of the halfway line, so the coach behind it stays on the half pitch.
  const top = 46
  mark(b, [[top, 0], [top, PITCH.width]], 'solid')
  for (const y of [10.4, 34, 57.6]) mark(b, [[0, y], [top, y]])
  for (const x of [19.5, 39]) mark(b, [[x, 0], [x, PITCH.width]])
  addGoal(b, 'minigoal', top, 10, 180, 2.5)
  addGoal(b, 'minigoal', top, 58, 180, 2.5)
  team(b, RED, [
    ['1', 5, 29],
    ['5', 20, 13],
    ['6', 19, 40],
    ['4', 34, 21],
    ['2', 28, 59],
    ['8', 39, 39],
    ['3', 36, 1],
  ])
  addItem(b, 'coach', top + 3, 34, { label: 'TR', size: 1.3 })
  addItem(b, 'coach', -1.5, 17, { label: 'TR', size: 1.3 })
  for (const p of [
    [top + 3, 37],
    [top + 2, 38.5],
    [-2.5, 19],
    [-1.5, 20.5],
    [-3, 21],
  ] as Pt[]) {
    addBall(b, p[0], p[1])
  }
  addBall(b, 31, 17)
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'tactics',
    players: 7,
    fieldSize: '46 m × Feldbreite',
    description:
      'Spielaufbau aus dem 4-2-3-1: Torwart, Viererkette, Doppelsechs. Die Trainer spielen Bälle ein (vom Tor oder von der Seite).\n' +
      'Ziel: über die Zonen herausspielen und eines der zwei Minitore treffen. Später Gegenspieler dazu.',
  })
}

function channels231(name: string): Drill {
  const area = { length: 50, width: 40 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  for (const y of [12, 28]) mark(b, [[0, y], [50, y]])
  addGoal(b, 'goal', 0, 20, 0, 0.6)
  addGoal(b, 'goal', 50, 20, 180, 0.6)
  player(b, YELLOW, 'TW', [2, 20])
  player(b, BLUE, 'TW', [48, 20], { rotation: 180 })
  team(b, YELLOW, [
    ['2', 11.4, 5.5],
    ['3', 10.2, 31.2],
    ['4', 25.7, 2.3],
    ['6', 23.6, 24.1],
    ['5', 25.7, 37.7],
    ['9', 39.4, 20],
  ])
  team(b, BLUE, [
    ['2', 38.9, 15.3],
    ['3', 40.5, 27.9],
    ['4', 25.4, 13.9],
    ['6', 25.8, 22.5],
    ['5', 26.8, 32.3],
    ['9', 13.4, 20.6],
  ], 180)
  addBall(b, 3.5, 21)
  pass(b, [2, 20], [25.7, 2.3])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 14,
    orientation: 'portrait',
    fieldSize: '50–60 × 30–40 m',
    description:
      'Spielform, beide Teams im 2-3-1, drei Längskorridore. Gegen den Ball darf ein Team nur zwei der drei Korridore besetzen, mit Ball muss es alle drei besetzen.\n' +
      'So lohnt sich die Verlagerung um den Gegner herum. Coaching: Anbieten, Abstände, hohes Balltempo, erkennen wann und wie verlagert wird.',
  })
}

function overloadHalves(name: string): Drill {
  const area = { length: 40, width: 25 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[20, 0], [20, 25]])
  for (const x of [10, 30]) {
    addGoal(b, 'minigoal', x, 0, 90, 2)
    addGoal(b, 'minigoal', x, 25, -90, 2)
  }
  team(b, YELLOW, [
    ['', 10, 2.2],
    ['', 2, 11.6],
    ['', 17.8, 12.3],
    ['', 10, 22.8],
    ['', 35, 14.9],
  ])
  team(b, BLUE, [
    ['', 10.9, 8.6],
    ['', 8.3, 16.7],
    ['', 36.9, 13],
  ], 180)
  player(b, GREEN, 'S', [-2.7, 12.3])
  player(b, GREEN, 'S', [42.8, 8.3])
  addBall(b, 4, 15)
  run(b, [[10, 2.2], [22, 2.2]], 'solid')
  run(b, [[10, 22.8], [22, 22.8]], 'solid')
  pass(b, [17.8, 12.3], [35, 14.9])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 10,
    description:
      'Überladen, um zu isolieren: Gelb (5) hält den Ball in einer Hälfte für 5 Pässe, verlagert dann in die andere Hälfte und schießt auf eines der Minitore.\n' +
      'Blau (3) schickt zwei ins Pressing, einer bleibt in der anderen Hälfte. Nach Ballgewinn auf die Minitore. Zwei Unterstützer (Grün) helfen dem Team in Ballbesitz.',
  })
}

function fivePlusKeeperVsSix(name: string): Drill {
  const area = { length: 40, width: 40 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[20, 0], [20, 40]], 'solid')
  for (const y of [10.6, 28.9]) mark(b, [[0, y], [40, y]])
  addGoal(b, 'goal', 0, 20, 0, 0.7)
  for (const y of [6.5, 20, 33.5]) addGoal(b, 'minigoal', 40, y, 180, 2)
  team(b, BLACK, [
    ['IV', 36, 20],
    ['6', 29.8, 8.7],
    ['6', 26.7, 35.8],
    ['10', 18.3, 9.2],
    ['10', 18.9, 33.6],
    ['ST', 15.4, 20.4],
  ], 180)
  team(b, RED, [
    ['TW', 1.8, 22],
    ['6', 11.6, 15.1],
    ['6', 13.6, 27.1],
    ['10', 21.4, 15.1],
    ['10', 22.1, 27.4],
    ['ST', 31.4, 22.6],
  ])
  addBall(b, 35, 23)
  pass(b, [36, 20], [29.8, 8.7])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 12,
    orientation: 'portrait',
    description:
      'Positionsspiel 5 + Torwart gegen 6: Schwarz beginnt mit Ball und will aufs große Tor treffen. Rot verteidigt in Unterzahl kompakt im 2-2-1 und hat nach Ballgewinn 8 Sekunden, um eines der 3 Minitore zu treffen.\n' +
      'Größer: 8 + TW gegen 11 im 3-2-2-1, 10 Sekunden zum Kontern.\n' +
      'Coaching: Abstand zwischen den Linien 8–12 m, Zentrum schützen, auf die Flügel lenken, als Einheit verschieben.',
  })
}

function eightVsEight(name: string): Drill {
  const area = { length: 45, width: 32 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  for (const y of [4.3, 16, 27.7]) {
    addGoal(b, 'minigoal', 45, y, 180, 2)
    addGoal(b, 'minigoal', 0, y, 0, 2)
  }
  team(b, BLACK, [
    ['IV', 39.8, 16],
    ['IV', 35.3, 7.2],
    ['IV', 35.3, 25.2],
    ['6', 24, 12.8],
    ['6', 24, 21.5],
    ['10', 19, 5.8],
    ['10', 13.3, 21.7],
    ['ST', 12.3, 10],
  ], 180)
  team(b, RED, [
    ['ST', 35.2, 14.4],
    ['10', 29.4, 4.9],
    ['10', 28.2, 26.2],
    ['6', 20, 10.8],
    ['6', 20, 19],
    ['IV', 11.1, 5.2],
    ['IV', 9.8, 27.1],
    ['IV', 5.8, 16.7],
  ])
  addBall(b, 30.5, 6.5)
  pass(b, [5.8, 16.7], [11.1, 5.2])
  pass(b, [11.1, 5.2], [20, 10.8])
  pass(b, [20, 19], [35.2, 14.4])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 16,
    orientation: 'portrait',
    description:
      'Spielform 8 gegen 8, beide Teams im 3-2-3, je drei Minitore. Abseits ab der gegnerischen Hälfte.\n' +
      'Ziel: Zusammenspiel von Dreierkette, Doppelsechs, Zehnern und Stürmer, zentral gegen den Mittelfeldblock vorankommen.\n' +
      'Coaching: den dritten Mann finden, Druck anlocken, vertikal spielen, Läufe hinter die Kette.',
  })
}

function centralBuildUp(name: string): Drill {
  const area = { length: 55, width: 40 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[50, 0], [50, 40]], 'solid')
  mark(b, [[15.6, 0], [15.6, 40]], 'solid')
  mark(b, [[10.4, 0], [0, 11]], 'solid')
  mark(b, [[10.4, 40], [0, 29]], 'solid')
  for (const y of [11, 29]) mark(b, [[0, y], [50, y]])
  mark(b, [[32.7, 0], [32.7, 40]])
  addGoal(b, 'goal', 0, 20, 0, 0.7)
  for (const y of [5.4, 15.3, 24.6, 34.6]) addGoal(b, 'minigoal', 50, y, 180, 2)
  team(b, ORANGE, [
    ['1', 2.4, 20.3],
    ['5', 10.2, 7.4],
    ['4', 10.2, 33.9],
    ['6', 18.6, 19.7],
    ['8', 21.3, 6.6],
    ['10', 21.8, 31.7],
    ['11', 35.4, 3.8],
    ['9', 37.7, 19.9],
    ['7', 35.2, 36.3],
  ])
  team(b, BLACK, [
    ['4', 43.1, 22.2],
    ['5', 41, 11],
    ['6', 36.8, 29.3],
    ['7', 27, 8.6],
    ['8', 28.2, 21.7],
    ['10', 26.6, 33.7],
    ['11', 16.1, 24.6],
    ['9', 11.6, 16.3],
  ], 180)
  addBall(b, 4, 19)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 17,
    orientation: 'portrait',
    description:
      'Zentraler Spielaufbau 8 + Torwart gegen 8: Orange baut vom Torwart auf und will über das Zentrum eines der 4 Minitore treffen. Schwarz presst und kontert nach Ballgewinn aufs große Tor.\n' +
      'Die schrägen Linien begrenzen den Raum neben dem Tor, damit der Aufbau zentral beginnt.',
  })
}

// ---------------------------------------------------------------------------------------
// Tactical structures

const BLACK_RED: Partial<PitchStyle> = { color: 'black', lineColor: RED, lineWidth: 'thin' }

type Pos = [string, number, number]

/** Opponent in a low 4-4-2 block in front of the top goal. */
const LOW_BLOCK: Pos[] = [
  ['1', 102.5, 34],
  ['2', 89, 14],
  ['4', 89.5, 27],
  ['5', 89.5, 41],
  ['3', 89, 54],
  ['7', 79, 12],
  ['6', 78, 26],
  ['8', 78, 42],
  ['11', 79, 56],
  ['9', 70, 28],
  ['10', 70, 40],
]

/** Own team in a 3-2-5 attacking structure. */
const SHAPE_325: Record<string, Pt> = {
  ST: [85.5, 34],
  LWB: [84, 3],
  ACM_L: [81, 21],
  ACM_R: [81, 47],
  RWB: [84, 65],
  CDM_L: [65, 27],
  CDM_R: [65, 41],
  CB_L: [57, 16],
  CB_C: [54, 34],
  CB_R: [57, 52],
}

const LABEL_325: Record<string, string> = {
  ST: 'ST',
  LWB: 'LS',
  ACM_L: '8',
  ACM_R: '10',
  RWB: 'RS',
  CDM_L: '6',
  CDM_R: '6',
  CB_L: 'IV',
  CB_C: 'IV',
  CB_R: 'IV',
}

function add325(b: Builder): void {
  team(b, RED, LOW_BLOCK, 180)
  for (const [key, p] of Object.entries(SHAPE_325)) player(b, WHITE, LABEL_325[key], p)
  addBall(b, 58.5, 53.5)
}

function structure325(name: string): Drill {
  const b = builder(FULL)
  for (const [y0, y1] of [
    [SIDE_L, SIDE_L + 11],
    [SIDE_R - 11, SIDE_R],
  ]) {
    rect(b, 70, y0, 95, y1, { color: WHITE, fillColor: WHITE, fillOpacity: 0.12, alpha: 0.9 })
    text(b, 'HALBRAUM', [71.8, (y0 + y1) / 2], 0.55)
  }
  for (const [x, y0, y1, label] of [
    [79.5, 3, 65, '5'],
    [69.5, 27, 41, '2'],
    [61.5, 16, 52, '3'],
  ] as [number, number, number, string][]) {
    link(b, [x, y0], [x, 31.5], WHITE)
    link(b, [x, 36.5], [x, y1], WHITE)
    text(b, label, [x, 34], 1.2)
  }
  add325(b)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 21,
    pitch: BLACK_RED,
    description:
      'Angriffsstruktur 3-2-5 gegen einen tiefen Block (4-4-2): drei Innenverteidiger, Doppelsechs und fünf Spieler auf einer Höhe in den fünf Korridoren.\n' +
      'Die Achter besetzen die Halbräume zwischen Außen- und Innenverteidiger, die Schienenspieler geben die Breite.',
  })
}

function connections325(name: string): Drill {
  const b = builder(FULL)
  const s = SHAPE_325
  const pairs: [string, string][] = [
    ['LWB', 'ACM_L'],
    ['ACM_L', 'ST'],
    ['ST', 'ACM_R'],
    ['ACM_R', 'RWB'],
    ['LWB', 'CB_L'],
    ['RWB', 'CB_R'],
    ['ACM_L', 'CDM_L'],
    ['ST', 'CDM_L'],
    ['ST', 'CDM_R'],
    ['ACM_R', 'CDM_R'],
    ['CDM_L', 'CDM_R'],
    ['CDM_L', 'CB_L'],
    ['CDM_L', 'CB_C'],
    ['CDM_R', 'CB_C'],
    ['CDM_R', 'CB_R'],
    ['CB_L', 'CB_C'],
    ['CB_C', 'CB_R'],
  ]
  for (const [a, c] of pairs) link(b, s[a], s[c])
  rect(b, 51, 13, 70, 55, { dashed: true, pattern: 'dashed' })
  addItem(b, 'textbox', 72, 47, { label: '3 gegen 2', color: RED, size: 1 })
  add325(b)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 21,
    pitch: BLACK_RED,
    description:
      'Positionsspiel im 3-2-5: Die Linien zeigen die Passverbindungen – jeder Spieler hat mindestens zwei Anspielstationen, es entstehen Dreiecke.\n' +
      'Im Aufbau spielen drei Innenverteidiger und zwei Sechser gegen die zwei Stürmer des Gegners: 3 gegen 2.',
  })
}

function superiority3223(name: string): Drill {
  const b = builder(FULL)
  const p: Record<string, Pt> = {
    '9': [66.6, 34],
    '11': [59.4, 12.1],
    '7': [60.1, 56.3],
    '8': [51.9, 19.2],
    '10': [51.9, 48.6],
    '3': [41.3, 5.1],
    '6': [41, 34],
    '2': [41.3, 63.1],
    '5': [30.8, 18.9],
    '4': [30.8, 49],
    '1': [14.2, 34],
  }
  rect(b, 39, 2, 43.5, 66, { color: TURQUOISE_LINE, fillColor: TURQUOISE_LINE, fillOpacity: 0.2, alpha: 0.8 })
  for (const y of [19.2, 48.6]) {
    rect(b, 25, y - 2.5, 57, y + 2.5, { color: TURQUOISE_LINE, fillColor: TURQUOISE_LINE, fillOpacity: 0.2, alpha: 0.8 })
  }
  const pairs: [string, string][] = [
    ['1', '5'],
    ['1', '4'],
    ['5', '3'],
    ['5', '6'],
    ['4', '6'],
    ['4', '2'],
    ['3', '8'],
    ['6', '8'],
    ['6', '10'],
    ['2', '10'],
    ['3', '11'],
    ['8', '11'],
    ['8', '9'],
    ['10', '9'],
    ['10', '7'],
    ['2', '7'],
    ['11', '9'],
    ['9', '7'],
  ]
  for (const [a, c] of pairs) link(b, p[a], p[c], TURQUOISE_LINE)
  for (const [label, pos] of Object.entries(p)) player(b, TURQUOISE_LINE, label, pos, { symbol: 'outline' })
  text(b, 'Zwischen den Linien', [70.5, 34], 0.5)
  text(b, 'Zwischen den Linien', [63.5, 12], 0.5)
  text(b, 'Zwischen den Linien', [63.5, 56], 0.5)
  text(b, 'Dreiecke: zwei Passoptionen', [46.5, 34], 0.45)
  text(b, 'Max. 3 auf einer Höhe', [37, 34], 0.45)
  text(b, 'Max. 2 in einer Linie', [22.5, 19], 0.45)
  text(b, 'Max. 2 in einer Linie', [22.5, 49], 0.45)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    pitch: { color: 'navy', lineColor: TURQUOISE_LINE, lineWidth: 'thin' },
    description:
      'Positionsspiel im 3-2-2-3: Spieler zwischen den Linien des Gegners, überall Dreiecke mit zwei Passoptionen.\n' +
      'Faustregeln: höchstens drei Spieler auf einer Höhe, höchstens zwei in einer Längslinie.',
  })
}

function plusOne(name: string): Drill {
  const b = builder(FULL)
  for (const y of [SIDE_L, SIDE_L + 11, SIDE_R - 11, SIDE_R]) mark(b, [[0, y], [HALF, y]], 'dashed', ORANGE)
  for (const x of [16.4, 34.3]) mark(b, [[x, 0], [x, PITCH.width]], 'dashed', ORANGE)
  for (const [y0, y1] of [
    [SIDE_L, SIDE_L + 11],
    [SIDE_R - 11, SIDE_R],
  ]) {
    rect(b, 27.6, y0, 44.6, y1, { color: ORANGE, fillColor: ORANGE, fillOpacity: 0.3, alpha: 0.8 })
  }
  team(b, ORANGE, [
    ['1', 2.6, 34.2],
    ['5', 13.6, 22.7],
    ['4', 13.6, 45.5],
    ['3', 25.2, 8.6],
    ['2', 25.2, 59.8],
    ['6', 25.2, 34.2],
    ['8', 38.7, 19.3],
    ['10', 38.7, 49.1],
    ['11', 47.2, 2.7],
    ['9', 49.2, 34.2],
    ['7', 47.2, 65.3],
  ])
  team(b, WHITE, [
    ['3', 49.9, 8.1],
    ['5', 50.7, 24.7],
    ['4', 50.7, 42.9],
    ['2', 50.3, 58.7],
    ['6', 39.6, 34.2],
    ['8', 31.3, 26.3],
    ['10', 31.5, 41.9],
    ['11', 29.7, 10.4],
    ['7', 29.7, 55.7],
    ['9', 18.7, 34.1],
  ], 180)
  run(b, [[36.6, 19.3], [30, 19.3]], 'dashed', ORANGE)
  run(b, [[36.6, 49.1], [30, 49.1]], 'dashed', ORANGE)
  addBall(b, 5, 34.2)
  return pitchDrill(name, 'half', b, {
    area: 'tactic',
    category: 'tactics',
    players: 21,
    pitch: { color: 'black', lineColor: ORANGE, lineWidth: 'thin' },
    description:
      '+1-Konzept im tiefen Spielaufbau (4-3-3 gegen 4-3-3): Ein oder beide Achter lassen sich in den Halbraum fallen (markierte Zonen). So entsteht im Aufbau eine Überzahl: einer mehr als die pressenden Gegner.',
  })
}

// ---------------------------------------------------------------------------------------
// Rondos and positional games

function rotationRondo(name: string): Drill {
  const area = { length: 20, width: 15 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[10, 0], [10, 15]])
  mark(b, [[0, 7.5], [20, 7.5]])
  team(b, GREEN, [
    ['9', 21.5, 3.8],
    ['3', 11.3, -1.5],
    ['2', 1.8, 16.5],
    ['5', -1.5, 7.1],
  ])
  team(b, SKY, [
    ['8', 15.8, 10.3],
    ['10', 4.9, 2.6],
    ['6', 3.9, 11.7],
  ])
  team(b, BLACK, [
    ['6', 13.6, 7.5],
    ['8', 8.8, 6.5],
    ['10', 6.8, 11.2],
  ], 180)
  addBall(b, 5.6, 3.4)
  pass(b, [3.9, 11.7], [4.9, 2.6], 'solid', 1)
  pass(b, [-1.5, 7.1], [3.9, 11.7], 'solid', 2)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 10,
    orientation: 'portrait',
    description:
      'Rondo 3 gegen 3 plus 4 neutrale Außenspieler (Grün) auf 20 × 15 m, in vier Felder geteilt.\n' +
      'Das Team in Ballbesitz rotiert: Nach jedem Pass wechselt ein Spieler das Feld, damit immer in jedem Feld eine Anspielstation frei ist.\n' +
      'Coaching: Freilaufen in den freien Raum, offene Körperstellung, nach dem Pass sofort neu anbieten.',
  })
}

function rondoEightTwo(name: string): Drill {
  const area = { length: 14, width: 14 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  for (const t of [1 / 3, 2 / 3]) {
    player(b, RED, '', [t * 14, 0])
    player(b, RED, '', [t * 14, 14])
    player(b, RED, '', [0, t * 14])
    player(b, RED, '', [14, t * 14])
  }
  player(b, BLACK, '', [6, 6.5])
  player(b, BLACK, '', [8.5, 8])
  for (const p of [
    [-2.5, 2],
    [-2.5, 4],
    [16.5, 10],
    [16.5, 12],
  ] as Pt[]) {
    player(b, BLACK, '', p)
  }
  addBall(b, 4.7, -1)
  addBall(b, 15.5, 4)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'warmup',
    players: 14,
    description:
      'Rondo 8 gegen 2 mit hoher Intensität: zwei Rote auf jeder Seite, zwei Verteidiger in der Mitte. Draußen warten die nächsten Paare.\n' +
      'Kurze Belastung (z. B. 45 Sekunden), dann wechseln die Verteidiger. Ballverlust = sofort neuer Ball vom Rand.',
  })
}

function fourFourFour(name: string): Drill {
  const area = { length: 24, width: 24 }
  const b = builder(area)
  addOutline(b, area, true)
  addCornerCones(b, area)
  rect(b, 6, 6, 18, 18, { color: WHITE, fillColor: '#d97706', fillOpacity: 0.25 })
  team(b, YELLOW, [
    ['', 12, 0.5],
    ['', 0.5, 9],
    ['', 23.5, 16],
    ['', 12, 23.5],
  ])
  team(b, BLUE, [
    ['', 7, 7],
    ['', 17, 7],
    ['', 7, 17],
    ['', 17, 17],
  ])
  team(b, RED, [
    ['', 10.5, 12],
    ['', 13.5, 12],
    ['', 3, 18],
    ['', 21, 5],
  ])
  addBall(b, 6.2, 6.2)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 12,
    description:
      '4 gegen 4 gegen 4: Ein Team spielt außen (Gelb), eines an den Ecken des inneren Quadrats (Blau); beide halten zusammen den Ball gegen Rot.\n' +
      'Das Team, das den Ball verliert, wird zum Jäger. Im inneren Quadrat nur ein Kontakt.',
  })
}

function wallPlayersRondo(name: string): Drill {
  const area = { length: 36, width: 28 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  rect(b, 6, 6, 30, 22)
  team(b, RED, [
    ['', 12, 10],
    ['', 22, 9],
    ['', 15, 17],
    ['', 25, 16],
    ['', 12, 2.5],
    ['', 24, 2.5],
    ['', 12, 25.5],
    ['', 24, 25.5],
  ])
  team(b, BLUE, [
    ['', 17, 11],
    ['', 27, 11],
    ['', 10, 14],
    ['', 20, 19],
    ['', 2.5, 9],
    ['', 2.5, 19],
    ['', 33.5, 9],
    ['', 33.5, 19],
  ], 180)
  player(b, YELLOW, 'J', [18, 14])
  addBall(b, 12.8, 10.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 17,
    description:
      'Mittleres Feld mit Kanälen außen herum: Rot gegen Blau, je 4 innen und 4 außen als Wandspieler, dazu ein Joker (Gelb) für das Team in Ballbesitz.\n' +
      'Punkt, wenn der Ball von einem Wandspieler über die Innenspieler zu einem Wandspieler auf der anderen Seite kommt. Innen und außen regelmäßig tauschen.',
  })
}

function pentagonRondo(name: string): Drill {
  const area = { length: 16, width: 16 }
  const b = builder(area)
  const r = 7 / (2 * Math.sin(Math.PI / 5))
  const corners: Pt[] = [0, 1, 2, 3, 4].map((i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180
    return [8 + Math.cos(a) * r, 8.4 + Math.sin(a) * r]
  })
  poly(b, corners, { color: SKY })
  corners.forEach((c, i) => {
    cone(b, c)
    player(b, RED, String(i + 1), [c[0] + (c[0] - 8) * 0.18, c[1] + (c[1] - 8.4) * 0.18])
  })
  team(b, YELLOW, [
    ['7', 9.8, 4.6],
    ['8', 10.4, 11.6],
  ])
  team(b, PURPLE, [
    ['9', 5.4, 7.2],
    ['10', 10.6, 8],
    ['6', 6.6, 11.6],
  ], 180)
  addBall(b, corners[3][0] - 1, corners[3][1] + 1.2)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 10,
    fieldSize: 'Fünfeck, 7 m zwischen den Hütchen',
    description:
      'Rondo 5 + 2 gegen 3: fünf Spieler auf den Ecken eines Fünfecks (7 m zwischen den Hütchen), zwei Spieler innen helfen dem Team in Ballbesitz, drei Verteidiger jagen den Ball.\n' +
      'Ziel: zentral durchspielen – Pässe zu den Innenspielern zählen doppelt. Kontakte begrenzen.',
  })
}

function switchRondo(name: string): Drill {
  const area = { length: 25, width: 25 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[12.5, 0], [12.5, 25]])
  team(b, BLUE, [
    ['IV', -1.5, 4],
    ['IV', -1.5, 21],
    ['AV', 8, -1.5],
    ['AV', 8, 26.5],
    ['ST', 26.5, 4],
    ['ST', 26.5, 21],
    ['ZM', 7, 7],
    ['ZM', 8, 15],
  ])
  team(b, YELLOW, [
    ['', 9, 6],
    ['', 5, 18],
    ['', 17, 6],
    ['', 17, 15],
  ], 180)
  addBall(b, -0.5, 20)
  pass(b, [-1.5, 21], [7, 7], 'solid', 1)
  pass(b, [7, 7], [8, 15], 'solid', 2)
  pass(b, [8, 15], [26.5, 4], 'solid', 3)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 12,
    description:
      'Verlagerungs-Rondo: Blau will den Ball von den Innenverteidigern über die zwei Zentralen zu den Stürmern auf der anderen Seite bringen. Gelb verteidigt mit höchstens zwei Spielern je Hälfte.\n' +
      'Innenverteidiger spielen nur untereinander oder ins Zentrum, Zentrale haben einen Kontakt, Außenverteidiger zwei.\n' +
      'Punkte: über die Außenverteidiger = 1, direkt über die Zentralen = 3.',
  })
}

function rondoToFinish(name: string): Drill {
  const b = builder(FULL)
  const c: Pt = [HALF, 34]
  for (const [dx, dy] of [
    [7, 0],
    [0, -7],
    [0, 7],
    [-7, 0],
  ]) {
    player(b, RED, '', [c[0] + dx, c[1] + dy])
  }
  player(b, WHITE, '', [c[0] + 2, c[1] - 1.5], { rotation: 180 })
  player(b, WHITE, '', [c[0] - 2, c[1] + 1.5], { rotation: 180 })
  team(b, RED, [
    ['9', 80, 34],
    ['11', 84, 4],
    ['7', 84, 64],
    ['3', 70, 4],
    ['2', 70, 64],
  ])
  player(b, WHITE, 'TW', [103, 34], { rotation: 180 })
  addBall(b, c[0] + 7.5, c[1] + 1)
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'shooting',
    players: 12,
    description:
      'Rondo 4 gegen 2 im Mittelkreis. Nach 6 Pässen (oder einem Pass durch die Mitte) bricht der Ballbesitzer aus und spielt die Angreifer an – Abschluss ohne Gegenspieler gegen den Torwart.\n' +
      'Coaching: Tempo beim Ausbrechen, Timing der Läufe, sauberer erster Kontakt vor dem Abschluss.',
  })
}

function rondoIntoAttack(name: string): Drill {
  const b = builder(FULL)
  rect(b, 52, 18, 76, 50, { dashed: true, pattern: 'dashed' })
  team(b, RED, [
    ['8', 72, 22],
    ['10', 64, 24],
    ['6', 57, 30],
    ['7', 66, 46],
  ])
  team(b, WHITE, [
    ['5', 66, 32],
    ['6', 62, 40],
    ['8', 60, 22],
  ], 180)
  team(b, RED, [
    ['16', 58, 6],
    ['14', 82, 6],
    ['17', 82, 62],
  ])
  addGoal(b, 'minigoal', 50, 18, 0, 2)
  addGoal(b, 'minigoal', 50, 50, 0, 2)
  player(b, WHITE, 'TW', [103, 34], { rotation: 180 })
  addItem(b, 'coach', 50, 34, { label: 'TR', size: 1.3 })
  addBall(b, 49, 36)
  addBall(b, 61, 33)
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'shooting',
    players: 11,
    description:
      'Rondo 4 gegen 3 im Feld vor dem Strafraum. Nach 8 Pässen wird ein Flügelspieler angespielt, der flankt; die Innenspieler laufen in den Strafraum ein.\n' +
      'Erobern die Weißen den Ball, kontern sie auf die zwei Minitore. Der Trainer spielt neue Bälle ein.',
  })
}

function fiveFivePlusOne(name: string): Drill {
  const area = { length: 30, width: 18 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[15, 0], [15, 18]])
  addGoal(b, 'goal', 0, 9, 0, 0.45)
  addGoal(b, 'goal', 30, 9, 180, 0.45)
  player(b, PURPLE, 'TW', [1.4, 9])
  player(b, PURPLE, 'TW', [28.6, 9], { rotation: 180 })
  team(b, RED, [
    ['2', 6.2, 2.4],
    ['4', 11.6, 8.9],
    ['3', 6.2, 15.5],
    ['5', 20.6, 10.9],
  ])
  team(b, BLUE, [
    ['2', 9.5, 5.9],
    ['4', 6.5, 8.9],
    ['3', 9.5, 12.5],
    ['5', 24.3, 9.9],
  ], 180)
  player(b, YELLOW, 'N', [13.1, 3.9])
  addBall(b, 2.6, 9.6)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 11,
    description:
      'Positionsspiel 5 gegen 5 (je 4 + Torwart) plus 1 Neutraler auf 30 × 18 m mit zwei Toren.\n' +
      'Aufbau vom Torwart, der Neutrale spielt immer mit dem Team in Ballbesitz. Tor zählt erst nach mindestens 5 Pässen.',
  })
}

function squareBeforeBox(name: string): Drill {
  const b = builder(FULL)
  addGoal(b, 'goal', 0, 34, 0)
  player(b, PURPLE, 'TW', [1.5, 34])
  const x0 = PA_NEAR + 5
  rect(b, x0, 24, x0 + 20, 44, { color: SKY, fillColor: SKY, fillOpacity: 0.12 })
  for (const p of [
    [x0, 24],
    [x0 + 20, 24],
    [x0, 44],
    [x0 + 20, 44],
  ] as Pt[]) {
    cone(b, p)
  }
  team(b, WHITE, [
    ['9', x0 + 4, 29],
    ['10', x0 + 10, 37],
    ['11', x0 + 16, 27],
    ['7', x0 + 15, 41],
  ])
  team(b, BLUE, [
    ['2', x0 + 7, 32],
    ['3', x0 + 13, 30],
    ['4', x0 + 5, 40],
    ['5', x0 + 12, 42],
  ], 180)
  player(b, YELLOW, 'N', [x0 + 10, 33])
  addBall(b, x0 + 10.8, 37.6)
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'shooting',
    players: 10,
    fieldSize: '20 × 20 m, 5 m vor dem Strafraum',
    description:
      'Quadrat 20 × 20 m, 5 m vor dem Strafraum: Weiß hält mit dem Neutralen den Ball gegen Blau (4 + 1 gegen 4).\n' +
      'Stufe 1: 5 Pässe in Folge = Punkt. Stufe 2: Danach darf ein Spieler mit Ball aus dem Quadrat und aufs Tor abschließen. Stufe 3: Zwei Verteidiger sichern das Tor – um sie herum oder über den Neutralen durchspielen.',
  })
}

function nineNinePlusFive(name: string): Drill {
  const area = { length: 70, width: 45 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  for (const x of [15, 35, 55]) mark(b, [[x, 0], [x, 45]], x === 35 ? 'dashed' : 'solid')
  text(b, 'ABSCHLUSSZONE', [7.5, 22.5], 0.5)
  text(b, 'ABSCHLUSSZONE', [62.5, 22.5], 0.5)
  addGoal(b, 'goal', 0, 22.5, 0, 0.7)
  addGoal(b, 'goal', 70, 22.5, 180, 0.7)
  player(b, CYAN_TEAM, 'TW', [1.5, 22.5])
  player(b, BLACK, 'TW', [68.5, 22.5], { rotation: 180 })
  team(b, CYAN_TEAM, [
    ['2', 20, 4],
    ['5', 19, 17],
    ['4', 19, 28],
    ['3', 20, 41],
    ['6', 28, 22],
    ['8', 40, 14],
    ['10', 40, 31],
    ['11', 48, 5],
    ['7', 48, 40],
  ])
  team(b, BLACK, [
    ['2', 50, 40],
    ['5', 51, 28],
    ['4', 51, 17],
    ['3', 50, 4],
    ['6', 42, 22],
    ['8', 30, 31],
    ['10', 30, 14],
    ['9', 23, 22],
  ], 180)
  team(b, YELLOW, [
    ['N', 35, -2.5],
    ['N', 35, 47.5],
    ['N', 35, 22.5],
    ['N', 12, -2.5],
    ['N', 58, 47.5],
  ])
  addBall(b, 2.5, 23.5)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 25,
    orientation: 'portrait',
    description:
      'Positionsspiel 9 gegen 9 plus 5 Neutrale (Gelb) in Zonen: Aufbau aus der eigenen Hälfte, Abschluss nur aus den Abschlusszonen.\n' +
      'Schwerpunkt dritter Mann: Der Ball kommt über einen Spieler zu einem zweiten, der schon in Richtung Tor läuft (Klatschen und Steil). Ein Tor nach Kombination über den dritten Mann zählt doppelt.',
  })
}

function eightEightMidBlock(name: string): Drill {
  const area = { length: 60, width: 45 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[40, 0], [40, 45]])
  for (const y of [6, 17, 28, 39]) addGoal(b, 'minigoal', 60, y, 180, 2)
  addGoal(b, 'goal', 0, 22.5, 0, 0.6)
  player(b, CYAN_TEAM, 'TW', [1.5, 22.5])
  team(b, CYAN_TEAM, [
    ['4', 10, 15],
    ['5', 10, 30],
    ['2', 24, 4],
    ['8', 26, 17],
    ['10', 26, 28],
    ['3', 24, 41],
    ['11', 38, 6],
    ['9', 38, 22.5],
  ])
  team(b, NAVY_TEAM, [
    ['', 34, 12],
    ['', 34, 22.5],
    ['', 34, 33],
    ['', 26, 8],
    ['', 28, 22],
    ['', 26, 37],
    ['', 20, 17],
    ['', 20, 28],
  ], 180)
  player(b, ORANGE, '6', [17, 18])
  player(b, ORANGE, '6', [17, 27])
  addBall(b, 11, 16)
  pass(b, [10, 15], [17, 18])
  pass(b, [17, 18], [26, 28])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 19,
    orientation: 'portrait',
    description:
      'Positionsspiel 8 gegen 8 plus 2 Neutrale (die Doppelsechs, Orange) gegen einen Mittelfeldblock. Das Team in Ballbesitz baut im 2-4-4 von den Innenverteidigern auf und will in die Abschlusszone eindringen und eines der 4 Minitore treffen.\n' +
      'Die Linie zwischen Aufbau- und Abschlusszone gilt als Abseitslinie.\n' +
      'Coaching: stabile 2 + 2-Basis hinter dem Ball, versetzte Sechser, Spieler zwischen den Linien, Läufe hinter die Kette im richtigen Moment.',
  })
}

function eightEightFourGoals(name: string): Drill {
  const area = { length: 45, width: 35 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  for (const y of [9, 26]) {
    addGoal(b, 'minigoal', 45, y, 180, 2)
    addGoal(b, 'minigoal', 0, y, 0, 2)
  }
  team(b, NAVY_TEAM, [
    ['', 6, 8],
    ['', 6, 27],
    ['', 15, 17],
    ['', 22, 5],
    ['', 22, 30],
    ['', 30, 13],
    ['', 30, 23],
    ['', 39, 17],
  ])
  team(b, SKY, [
    ['', 12, 10],
    ['', 12, 25],
    ['', 20, 17],
    ['', 27, 8],
    ['', 27, 27],
    ['', 35, 11],
    ['', 35, 24],
    ['', 40, 30],
  ], 180)
  player(b, ORANGE, 'N', [22.5, -2.5])
  player(b, ORANGE, 'N', [22.5, 37.5])
  addBall(b, 15.8, 17.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 18,
    orientation: 'portrait',
    description:
      'Ballbesitz 8 gegen 8 plus 2 Neutrale (Orange, höchstens zwei Kontakte) mit 4 Minitoren. Das Team in Ballbesitz braucht 5 Pässe in Folge, dann darf es auf eines der Tore schießen.\n' +
      'Das verteidigende Team darf nach Ballgewinn sofort schießen. Nach Ballverlust sofort Gegenpressing.',
  })
}

// ---------------------------------------------------------------------------------------
// More small-sided games

function thirdManAttackDefence(name: string): Drill {
  const area = { length: 35, width: 35 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  rect(b, 29, 10, 35, 25)
  addGoal(b, 'goal', 35, 17.5, 180, 0.7)
  addGoal(b, 'minigoal', 0, 9, 0, 2)
  addGoal(b, 'minigoal', 0, 26, 0, 2)
  player(b, YELLOW, 'TW', [33.5, 17.5], { rotation: 180 })
  team(b, RED, [
    ['', 5, 4],
    ['', 4, 23],
  ])
  team(b, BLUE, [
    ['', 3, 13],
    ['', 17, 8],
    ['', 9, 33],
  ])
  player(b, GREEN, 'N', [-2, 17.5])
  player(b, GREEN, 'N', [17, 17.5])
  team(b, YELLOW, [
    ['', 16, 4],
    ['', 21, 10],
    ['', 17, 14],
    ['', 22, 19],
    ['', 18, 24],
    ['', 25, 13],
  ], 180)
  addBall(b, 3.8, 13.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 14,
    fieldSize: 'ca. 35 × 35 m',
    description:
      '8 Angreifer (Rot, Blau, Grün) gegen 6 Verteidiger und einen Torwart (Gelb). Rot spielt nur zu Blau, Blau nur zu Rot, Grün (einer innen, einer außen) zu allen.\n' +
      'Die Angreifer wollen aufs große Tor treffen, Gelb kontert nach Ballgewinn auf die zwei Minitore.\n' +
      'Punkte: Tor = 1, nach Vorlage oder Direktabschluss = 2, beides = 3. Coaching: Bewegung des dritten Mannes, den nächsten Pass erkennen, Timing.',
  })
}

function pressingThirds(name: string): Drill {
  const area = { length: 45, width: 25 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[5, 0], [5, 25]], 'solid')
  mark(b, [[40, 0], [40, 25]], 'solid')
  mark(b, [[16.8, 0], [16.8, 25]])
  mark(b, [[28.5, 0], [28.5, 25]])
  addGoal(b, 'goal', 0, 12.5, 0, 0.5)
  addGoal(b, 'goal', 45, 12.5, 180, 0.5)
  player(b, GREEN, 'TW', [1.5, 12.5])
  player(b, GREEN, 'TW', [43.5, 12.5], { rotation: 180 })
  const at = (px: number, py: number): [number, number] => [(px - 963) / 7.87, (py - 1272) / 8.12]
  team(b, BLUE, [
    ['', ...at(1047, 1325)],
    ['', ...at(1083, 1378)],
    ['', ...at(1023, 1407)],
    ['', ...at(1047, 1443)],
  ])
  team(b, RED, [
    ['', ...at(1039, 1397)],
    ['', ...at(1081, 1413)],
    ['', ...at(1159, 1360)],
    ['', ...at(1157, 1408)],
  ], 180)
  team(b, YELLOW, [
    ['', ...at(1213, 1329)],
    ['', ...at(1244, 1352)],
    ['', ...at(1203, 1389)],
    ['', ...at(1240, 1444)],
  ], 180)
  addBall(b, 11.5, 16)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 14,
    fieldSize: 'ca. 45 × 25 m',
    description:
      'Feld in drei Drittel, dazu je ein Torraum mit Torwart. Blau und Gelb halten den Ball in ihrem Drittel und verlagern übers Mitteldrittel zum anderen Team. Rot presst mit zwei Spielern im Ballbesitz-Drittel, zwei warten in der Mitte.\n' +
      'Erobert Rot den Ball, greift es das Tor an, auf das es schaut (4 gegen 4 gegen das Team, das den Ball verloren hat).\n' +
      'Punkte: gelungene Verlagerung = 1, Ballgewinn und Tor = 3.',
  })
}

function halfSpaceEndZones(name: string): Drill {
  const area = { length: 45, width: 35 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  rect(b, 0, 0, 10, 35, { color: RED, fillColor: RED, fillOpacity: 0.25 })
  rect(b, 35, 0, 45, 35, { color: RED, fillColor: RED, fillOpacity: 0.25 })
  for (const y of [6.7, 10.4, 24.6, 28.3]) mark(b, [[10, y], [35, y]])
  const at = (px: number, py: number): [number, number] => [(px - 1440) / 7.49, (py - 1222) / 7.49]
  team(b, BLUE, [
    ['', ...at(1580, 1250)],
    ['', ...at(1627, 1287)],
    ['', ...at(1540, 1350)],
    ['', ...at(1623, 1361)],
    ['', ...at(1675, 1358)],
    ['', ...at(1645, 1449)],
  ])
  team(b, YELLOW, [
    ['', ...at(1673, 1282)],
    ['', ...at(1642, 1318)],
    ['', ...at(1583, 1342)],
    ['', ...at(1681, 1326)],
    ['', ...at(1693, 1378)],
    ['', ...at(1642, 1395)],
  ], 180)
  addBall(b, ...([at(1627, 1287)[0] + 0.8, at(1627, 1287)[1] + 0.8] as [number, number]))
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 12,
    description:
      'Endzonen-Spiel: Jedes Team greift eine 10 m tiefe Endzone an. Die Halbräume sind im Mittelfeld markiert. Verteidiger dürfen erst in die Endzone, wenn der Pass gespielt ist.\n' +
      'Punkte: in die Endzone dribbeln = 1, Steilpass in die Endzone = 2, Steilpass aus einem Halbraum in die Endzone = 3.\n' +
      'Coaching: Timing und Winkel der Läufe, Läufe in den toten Winkel, Halbräume nutzen.',
  })
}

function runsInBehind(name: string): Drill {
  const area = { length: 30, width: 20 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[15, 0], [15, 20]])
  const at = (px: number, py: number): [number, number] => [(px - 25) / 13.57, (py - 247) / 13]
  team(b, BLUE, [
    ['', ...at(182, 302)],
    ['', ...at(127, 336)],
    ['', ...at(58, 434)],
    ['', ...at(186, 459)],
  ])
  team(b, YELLOW, [
    ['', ...at(108, 319)],
    ['', ...at(156, 342)],
    ['', ...at(206, 386)],
    ['', ...at(168, 419)],
  ], 180)
  player(b, RED, 'N', at(154, 401))
  player(b, RED, 'N', [8.2, -1.8])
  player(b, RED, 'N', [8.2, 21.8])
  run(b, [at(182, 302), [19.5, 5]], 'dashed', WHITE)
  pass(b, at(154, 401), [19, 5.5], 'solid')
  addBall(b, ...at(132, 350))
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 11,
    description:
      '4 gegen 4 plus 3 Neutrale (Rot: einer innen, zwei außen auf den Längsseiten). Beide Teams spielen in einer Hälfte; das Team in Ballbesitz will mit einem Steilpass in die andere Hälfte verlagern, den ein Mitspieler hinter der Linie annimmt.\n' +
      'Danach wechseln alle in die neue Hälfte. Die Mittellinie gilt als Abseitslinie.\n' +
      'Coaching: gerade Pässe für diagonale Läufe und umgekehrt, Timing, Weg des Passes.',
  })
}

function buildUpRedZone(name: string): Drill {
  const area = { length: 55, width: 45 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[0, 8], [6, 0]], 'solid')
  mark(b, [[0, 37], [6, 45]], 'solid')
  rect(b, 46, 13, 55, 32)
  rect(b, 8.5, 13.9, 28.2, 30.9, { color: RED, dashed: true, pattern: 'dashed' })
  addGoal(b, 'minigoal', 15.6, 13.9, -90, 1.6)
  addGoal(b, 'minigoal', 15.6, 30.9, 90, 1.6)
  addGoal(b, 'minigoal', 8.5, 22.3, 180, 1.6)
  addGoal(b, 'minigoal', 28.2, 22.3, 0, 1.6)
  addGoal(b, 'minigoal', 33.6, 0, 90, 2)
  addGoal(b, 'minigoal', 33.6, 45, -90, 2)
  addGoal(b, 'goal', 55, 22.5, 180, 0.7)
  player(b, BLUE, 'TW', [53.5, 22.5], { rotation: 180 })
  team(b, BLUE, [
    ['', 26.7, 3],
    ['', 24.7, 10],
    ['', 5.6, 19.6],
    ['', 12, 24],
    ['', 20, 26],
    ['', 33, 21],
    ['', 40, 12],
    ['', 40, 34],
    ['', 30, 42],
  ])
  team(b, YELLOW, [
    ['', 22, 6],
    ['', 6, 16],
    ['', 14, 18],
    ['', 23, 19],
    ['', 19, 31],
    ['', 31, 26],
    ['', 37, 28],
  ], 180)
  addBall(b, 25.5, 4)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 17,
    description:
      'Aufbauspiel 9 gegen 7: Blau beginnt mit Ball und greift die Minitore in der roten Zone an, die nach außen zeigen. Gelb erobert den Ball und greift die beiden Flügel-Minitore oder das große Tor mit Torwart an.\n' +
      'Blau darf sich frei bewegen, auch durch die rote Zone. Abseits gilt, wenn Gelb in Ballbesitz ist.\n' +
      'Punkte Blau: Tor = 1, nach Vorlage aus der roten Zone = 2. Punkte Gelb: Flügeltor = 1, großes Tor = 4.',
  })
}

function centreBackGame(name: string): Drill {
  const area = { length: 55, width: 40 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[18, 0], [18, 40]], 'solid')
  mark(b, [[18, 20], [55, 20]])
  addGoal(b, 'goal', 0, 20, 0, 0.6)
  addGoal(b, 'goal', 55, 20, 180, 0.6)
  player(b, BLUE, 'TW', [1.5, 20])
  player(b, YELLOW, 'TW', [53.5, 20], { rotation: 180 })
  team(b, BLUE, [
    ['IV', 7, 6],
    ['IV', 7, 34],
    ['', 30, 8],
    ['', 34, 30],
    ['', 42, 14],
    ['', 46, 27],
    ['', 24, 18],
  ])
  team(b, YELLOW, [
    ['', 12, 13],
    ['', 14, 27],
    ['', 28, 26],
    ['', 34, 12],
    ['', 40, 22],
    ['', 47, 9],
    ['', 23, 33],
  ], 180)
  addBall(b, 7.8, 6.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'tactics',
    players: 16,
    orientation: 'portrait',
    description:
      'Spiel für Innenverteidiger, 8 gegen 8 mit Torhütern. Jedes Spiel beginnt im unteren Drittel: Torwart und zwei Innenverteidiger gegen zwei Gelbe (2 + TW gegen 2) – der Ball soll ins obere Feld.\n' +
      'Lässt sich ein blauer Mittelfeldspieler fallen, darf ihm ein Gelber folgen. Ist der Ball im oberen Feld, ist das Spiel frei.\n' +
      'Punkte Gelb: Ball im unteren Drittel erobert oder erster Spieler oben kann den Ball nicht halten = 1.',
  })
}

function buildUpVsPress(name: string): Drill {
  const b = builder(FULL)
  rect(b, 38, 0, 50, 12, { dashed: true, pattern: 'dashed' })
  rect(b, 38, 56, 50, 68, { dashed: true, pattern: 'dashed' })
  player(b, BLUE, '1', [2.5, 34])
  team(b, BLUE, [
    ['4', 11, 23],
    ['5', 11, 45],
    ['3', 20, 5],
    ['2', 20, 63],
    ['6', 22, 34],
    ['8', 32, 26],
  ])
  team(b, YELLOW, [
    ['9', 16, 34],
    ['10', 24, 22],
    ['7', 28, 50],
    ['11', 44, 6],
    ['8', 44, 62],
  ], 180)
  addBall(b, 4, 35)
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'tactics',
    players: 12,
    description:
      'Spielaufbau gegen Pressing: Blau baut mit Torwart, Viererkette und Sechsern auf, Gelb presst mit drei Spielern; je ein Gelber wartet in den Seitenzonen.\n' +
      'Ziel Blau: einen Spieler in einer Seitenzone anspielen oder über die Mittellinie dribbeln. Gelb kontert nach Ballgewinn aufs Tor.',
  })
}

function buildUpToMidfield(name: string): Drill {
  const b = builder(FULL)
  rect(b, 20, 12, 44, 56, { dashed: true, pattern: 'dashed' })
  for (const p of [
    [20, 12],
    [44, 12],
    [20, 56],
    [44, 56],
  ] as Pt[]) {
    cone(b, p)
  }
  addGoal(b, 'minigoal', 46, 18, 180, 2)
  addGoal(b, 'minigoal', 46, 50, 180, 2)
  player(b, PURPLE, '1', [2.5, 34])
  team(b, BLUE, [
    ['2', 14, 60],
    ['3', 14, 8],
    ['4', 10, 26],
    ['5', 10, 42],
    ['6', 26, 32],
    ['7', 38, 48],
  ])
  team(b, RED, [
    ['11', 32, 40],
    ['12', 30, 24],
    ['13', 38, 30],
  ], 180)
  addItem(b, 'coach', 2, 52, { label: 'TR', size: 1.3 })
  addBall(b, 2.5, 54)
  addBall(b, 3.5, 54.5)
  addBall(b, 4, 35)
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'tactics',
    players: 10,
    description:
      'Verbindung vom Aufbau ins Mittelfeld: Torwart und Abwehr spielen in die Zone, in der der Sechser und ein Achter gegen drei Rote freie Räume suchen.\n' +
      'Ziel: aus der Zone heraus auf eines der zwei Minitore spielen. Rot kontert nach Ballgewinn aufs große Tor. Der Trainer spielt neue Bälle ein.',
  })
}

function counterThreePhases(name: string): Drill {
  const area = { length: 50, width: 40 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  mark(b, [[25, 0], [25, 40]], 'solid')
  addGoal(b, 'goal', 0, 20, 0, 0.6)
  addGoal(b, 'goal', 50, 20, 180, 0.6)
  player(b, WHITE, 'TW', [1.5, 20])
  player(b, WHITE, 'TW', [48.5, 20], { rotation: 180 })
  team(b, BLUE, [
    ['10', 53, 6],
    ['7', 52, 34],
    ['9', 35, 28],
  ], 180)
  team(b, YELLOW, [
    ['7', -2, 10],
    ['10', -3, 14],
    ['9', -2, 30],
  ])
  addBall(b, 51.5, 8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 8,
    orientation: 'portrait',
    description:
      'Konter in 3 Phasen: Phase 1 – zwei Blaue starten von oben und greifen gegen einen Verteidiger an (2 gegen 1).\n' +
      'Phase 2 – nach Abschluss oder Ballgewinn kontern drei Gelbe sofort in die andere Richtung (3 gegen 2).\n' +
      'Phase 3 – der nächste Konter mit allen Spielern auf dem Feld. Schnell umschalten, mit wenigen Kontakten zum Tor.',
  })
}

function waveTransitions(name: string): Drill {
  const area = { length: 36, width: 24 }
  const b = builder(area)
  addOutline(b, area)
  addCornerCones(b, area)
  addGoal(b, 'goal', 0, 12, 0, 0.5)
  addGoal(b, 'goal', 36, 12, 180, 0.5)
  player(b, YELLOW, 'TW', [1.5, 12])
  player(b, YELLOW, 'TW', [34.5, 12], { rotation: 180 })
  for (const x of [30, 33]) addItem(b, 'pole', x, -2.5, { size: 1 })
  team(b, ORANGE, [
    ['', 18, 6],
    ['', 15, 12],
    ['', 22, 15],
  ])
  team(b, BLUE, [
    ['', 13, 9],
    ['', 20, 9],
    ['', 23, 19],
  ], 180)
  addBall(b, 15.7, 12.8)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 8,
    orientation: 'portrait',
    description:
      'Wellen mit Umschalten: 2 gegen 0 → 2 gegen 2 → 2 gegen 3 → 3 gegen 3. Nach jedem Abschluss kommt sofort die nächste Welle ins Feld.\n' +
      'Variante: Ein Spieler dribbelt außen durch die Stangen und flankt, der andere schließt ab.',
  })
}

function highPressFull(name: string): Drill {
  const b = builder(FULL)
  for (const y of [10, 34, 58]) addGoal(b, 'minigoal', 58, y, 180, 2.5)
  player(b, YELLOW, 'TW', [103, 34], { rotation: 180 })
  team(b, WHITE, [
    ['IV', 92, 24],
    ['IV', 92, 44],
    ['AV', 86, 6],
    ['AV', 86, 62],
    ['6', 80, 34],
    ['8', 72, 22],
    ['10', 72, 46],
  ], 180)
  team(b, RED, [
    ['9', 90, 34],
    ['11', 86, 16],
    ['7', 86, 52],
    ['10', 78, 40],
    ['8', 70, 30],
    ['6', 64, 38],
  ])
  addItem(b, 'coach', 54, 1, { label: 'TR', size: 1.3 })
  addItem(b, 'coach', 54, 67, { label: 'TR', size: 1.3 })
  addBall(b, 101.5, 35)
  return pitchDrill(name, 'full', b, {
    area: 'drill',
    category: 'tactics',
    players: 14,
    description:
      'Hohes Pressing: Weiß baut vom Torwart auf und will durch ein Minitor in der eigenen Hälfte dribbeln oder passen. Rot presst früh, lenkt das Spiel auf eine Seite und schließt nach Ballgewinn schnell aufs große Tor ab.\n' +
      'Die Trainer an der Mittellinie spielen neue Bälle ein.',
  })
}

// ---------------------------------------------------------------------------------------
// More tactical structures

const NAVY_PITCH: Partial<PitchStyle> = { color: 'navy', lineColor: TURQUOISE_LINE, lineWidth: 'thin', mowing: 'none' }
const DARK_PITCH: Partial<PitchStyle> = { color: 'black', lineColor: TURQUOISE_LINE, lineWidth: 'thin', mowing: 'none' }

function widthAndDepth(name: string): Drill {
  const b = builder(FULL)
  const own: [string, Pt][] = [
    ['TW', [11, 33.9]],
    ['P', [73.3, 5.8]],
    ['P', [77.7, 34.3]],
    ['P', [72.6, 62.6]],
    ['F', [67.6, 21.2]],
    ['F', [66.9, 37.8]],
    ['F', [64, 52.5]],
    ['A', [52.4, 33.9]],
    ['A', [44.2, 21]],
    ['A', [44.2, 48.4]],
    ['A', [38, 34.3]],
  ]
  chain(b, [own[1][1], own[2][1], own[3][1]], TURQUOISE_LINE)
  chain(b, [own[8][1], own[10][1], own[9][1], own[7][1], own[8][1]], TURQUOISE_LINE)
  for (const [label, p] of own) player(b, TURQUOISE_LINE, label, p, { symbol: 'outline' })
  for (const p of [
    [101, 35.2],
    [77.9, 13.4],
    [80.8, 30.5],
    [79.5, 41],
    [76.8, 60],
    [69.3, 26.6],
    [70.4, 37.4],
    [64.5, 47.3],
    [61, 24.6],
    [48.4, 29.8],
  ] as Pt[]) {
    player(b, RED, '', p, { rotation: 180, size: 1 })
  }
  text(b, 'P = Pinner: binden die Kette', [29, 34], 0.45)
  text(b, 'F = Floater: zwischen den Linien', [26, 34], 0.45)
  text(b, 'A = Anker: Absicherung', [23, 34], 0.45)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 21,
    pitch: NAVY_PITCH,
    description:
      'Breite und Tiefe halten statt starrer Positionen: drei „Pinner“ binden die gegnerische Kette (Breite und Tiefe), drei „Floater“ bewegen sich zwischen den Linien, vier „Anker“ sichern ab und bauen auf.\n' +
      'Wer welche Rolle hat, darf wechseln – die Struktur bleibt.',
  })
}

function lanes235(name: string): Drill {
  const b = builder(FULL)
  for (const y of [SIDE_L, SIDE_L + 11, SIDE_R - 11, SIDE_R]) mark(b, [[0, y], [PITCH.length, y]], 'dashed', TURQUOISE_LINE)
  for (const [label, y] of [
    ['FLÜGEL', SIDE_L / 2],
    ['HALBRAUM', SIDE_L + 5.5],
    ['ZENTRUM', 34],
    ['HALBRAUM', SIDE_R - 5.5],
    ['FLÜGEL', SIDE_R + SIDE_L / 2],
  ] as [string, number][]) {
    text(b, label, [92, y], 0.45)
  }
  team(b, TURQUOISE_LINE, [
    ['11', 80, 4],
    ['9', 84, 34],
    ['7', 80, 64],
    ['8', 72, 19.3],
    ['10', 72, 48.7],
    ['3', 60, 16],
    ['6', 58, 34],
    ['2', 60, 52],
    ['5', 46, 26],
    ['4', 46, 42],
    ['1', 8, 34],
  ])
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    pitch: NAVY_PITCH,
    description:
      'Angriffsformation 2-3-5 in fünf Korridoren: Flügelspieler geben die Breite, die Achter besetzen die Halbräume, der Stürmer bindet die Innenverteidiger (oder lässt sich als falsche Neun fallen).\n' +
      'Dahinter drei Spieler für Unterstützung und Absicherung, ganz hinten zwei Innenverteidiger.',
  })
}

function threeOneSix(name: string): Drill {
  const b = builder(FULL)
  rect(b, 46, 12, 66, 56, { color: RED, fillColor: RED, fillOpacity: 0.2, alpha: 0.9 })
  team(b, BLUE, [
    ['TW', 102, 34],
    ['', 90, 8],
    ['', 90, 20],
    ['', 90, 34],
    ['', 90, 48],
    ['', 90, 60],
    ['', 80, 14],
    ['', 80, 28],
    ['', 80, 40],
    ['', 80, 54],
    ['', 68, 34],
  ], 180)
  team(b, RED, [
    ['TW', 5, 34],
    ['IV', 52, 18],
    ['IV', 50, 34],
    ['IV', 52, 50],
    ['6', 62, 34],
    ['', 86, 3],
    ['', 85, 15],
    ['', 85, 27],
    ['', 85, 41],
    ['', 85, 53],
    ['', 86, 65],
  ])
  addBall(b, 62, 36)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 22,
    pitch: { color: 'blue', lineWidth: 'thin', mowing: 'none' },
    description:
      '3-1-6 gegen einen tiefen Block (5-4-1): sechs Spieler binden die gesamte gegnerische Kette, dahinter sichern drei Innenverteidiger und ein Sechser ab (markierte Restverteidigung).\n' +
      'Die Absicherung verhindert Konter, die sechs vorne suchen Lücken in der Kette.',
  })
}

/** 4-4-2 opponent pressing high against the own build-up (goal at the bottom). */
function buildUpRole(name: string, role: 'cdm' | 'fullback'): Drill {
  const b = builder(FULL)
  const at = (px: number, py: number): Pt => [(667 - py) / 4.54, (px - 950) / 5.88]
  if (role === 'cdm') {
    rect(b, 24.2, 15.3, 35.7, 52.7, { color: WHITE, fillColor: WHITE, fillOpacity: 0.15 })
    text(b, 'POSITIONIEREN', [33.5, 22], 0.45)
    text(b, 'TASCHEN', [33.5, 47], 0.45)
  } else {
    rect(b, 30, 0, 40, 68, { color: WHITE, fillColor: WHITE, fillOpacity: 0.15 })
    text(b, 'POSITIONIEREN', [37, 34], 0.5)
  }
  player(b, BLACK, '1', at(1150, 655))
  team(b, BLUE, [
    ['5', ...at(1060, 652)],
    ['4', ...at(1237, 652)],
    ['3', ...(role === 'fullback' ? ([34, 4] as Pt) : at(971, 557))],
    ['2', ...(role === 'fullback' ? ([34, 64] as Pt) : at(1330, 555))],
    ['6', ...at(1150, 530)],
    ['8', ...at(1097, 440)],
    ['10', ...at(1212, 440)],
    ['9', ...at(1150, 415)],
    ['11', ...at(1001, 431)],
    ['7', ...at(1294, 428)],
  ])
  team(b, RED, [
    ['9', ...at(1150, 583)],
    ['11', ...at(1025, 569)],
    ['7', ...at(1275, 569)],
    ['8', ...at(1083, 467)],
    ['6', ...at(1218, 467)],
    ['10', ...at(1150, 490)],
    ['4', ...at(1117, 400)],
    ['5', ...at(1183, 400)],
    ['2', ...at(1033, 405)],
    ['3', ...at(1267, 405)],
    ['TW', ...at(1150, 258)],
  ], 180)
  if (role === 'fullback') {
    run(b, [[34, 4], [44, 4]], 'dashed')
    run(b, [[34, 64], [44, 64]], 'dashed')
  } else {
    run(b, [at(1150, 530), [30, 28]], 'dashed')
  }
  addBall(b, 2.5, 35.5)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 22,
    description:
      role === 'cdm'
        ? 'Der Sechser im Spielaufbau gegen ein 4-4-2-Pressing: Er sucht die Taschen zwischen den gegnerischen Stürmern und Mittelfeldspielern (markierte Zone) und bietet sich mit offener Körperstellung an.\nSo kann der Ball durch die erste Pressinglinie gespielt werden.'
        : 'Die Außenverteidiger im Spielaufbau: Ihre Position (hoch oder tief, breit oder eingerückt) zieht die gegnerischen Flügelspieler mit und öffnet Passwege nach innen.\nMarkierte Zone: Hier positionieren sie sich je nach Pressing des Gegners.',
  })
}

function oneUnitThirds(name: string): Drill {
  const b = builder(FULL)
  for (const x of [35, 70]) mark(b, [[x, 0], [x, PITCH.width]], 'dashed', CYAN_TEAM)
  rect(b, 7, 1, 54, 67, { color: CYAN_TEAM, dashed: true, pattern: 'dashed' })
  text(b, 'EINE EINHEIT', [55.5, 60], 0.5)
  text(b, 'ABWEHRDRITTEL', [17.5, -2.5], 0.45)
  text(b, 'MITTELDRITTEL', [52.5, -2.5], 0.45)
  text(b, 'ANGRIFFSDRITTEL', [87.5, -2.5], 0.45)
  team(b, CYAN_TEAM, [
    ['11', 46.2, 5.7],
    ['9', 48.1, 33.7],
    ['7', 46.2, 61.8],
    ['8', 33.9, 22],
    ['10', 33.9, 46.1],
    ['3', 21.9, 5.7],
    ['6', 21.9, 33.7],
    ['2', 21.9, 61.8],
    ['5', 12.3, 23.9],
    ['4', 12.3, 44.1],
  ])
  team(b, WHITE, [
    ['1', 100.3, 33.7],
    ['2', 60.1, 15.7],
    ['4', 61.1, 27.8],
    ['5', 61.1, 40],
    ['3', 60.1, 51.8],
    ['7', 44.4, 13.7],
    ['6', 45.2, 26.7],
    ['8', 45.2, 40.8],
    ['11', 44.4, 53.9],
    ['9', 30.1, 27.8],
    ['10', 30.1, 40],
  ], 180)
  addBall(b, 13.5, 24.7)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 21,
    pitch: DARK_PITCH,
    description:
      'Positionsspiel: Die Mannschaft bewegt sich als eine Einheit durch die Drittel – kompakt, mit kurzen Abständen zwischen den Linien.\n' +
      'Rückt der Ball ein Drittel weiter, rückt die ganze Einheit mit (gestrichelter Rahmen).',
  })
}

function rotation325(name: string): Drill {
  const b = builder(FULL)
  const front: Pt[] = [
    [65, 4.2],
    [71.8, 18.1],
    [75.7, 33.8],
    [71.8, 49.8],
    [64.1, 64.7],
  ]
  const middle: Pt[] = [
    [54.6, 24.9],
    [54.6, 43],
  ]
  const back: Pt[] = [
    [37.4, 16],
    [34.7, 34],
    [37.2, 52.9],
  ]
  chain(b, front, ORANGE)
  chain(b, middle, ORANGE)
  chain(b, back, ORANGE)
  ;['11', '8', '9', '10', '7'].forEach((l, i) => player(b, ORANGE, l, front[i]))
  ;['6', '3'].forEach((l, i) => player(b, ORANGE, l, middle[i]))
  ;['5', '4', '2'].forEach((l, i) => player(b, ORANGE, l, back[i]))
  player(b, ORANGE, '1', [13.3, 34])
  text(b, 'ROTATION IN DIE 3-2-5-STRUKTUR', [62, 34], 0.6)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    pitch: DARK_PITCH,
    description:
      'Vom 4-3-3 in die 3-2-5-Struktur: zum Beispiel rückt ein Außenverteidiger neben den Sechser ein, der andere bildet mit den Innenverteidigern die Dreierkette; die Achter schieben in die Halbräume.\n' +
      'Es gibt nicht den einen Weg – wichtig ist, dass am Ende 3 hinten, 2 davor und 5 vorne stehen.',
  })
}

function halfSpaceRuns(name: string): Drill {
  const b = builder(FULL)
  team(b, WHITE, [
    ['1', 4, 34],
    ['7', 77.5, 2.7],
    ['9', 79.8, 34],
    ['11', 77.5, 64.5],
    ['10', 72.2, 21.8],
    ['8', 72.2, 47.3],
    ['6', 65.6, 34.4],
    ['3', 58.6, 4.7],
    ['2', 58.6, 62.6],
    ['4', 52.5, 26],
    ['5', 52.5, 42.1],
  ])
  team(b, BLUE, [
    ['TW', 102, 34.7],
    ['', 81.2, 15.8],
    ['', 81.2, 28.5],
    ['', 81.2, 40],
    ['', 81.2, 52.9],
    ['', 74, 15.3],
    ['', 74, 28.5],
    ['', 74, 40],
    ['', 74, 52.9],
    ['', 63.3, 28.5],
    ['', 63.3, 40],
  ], 180)
  run(b, [[72.2, 21.8], [80, 22.5], [92, 21]], 'dashed')
  run(b, [[72.2, 47.3], [80, 46.5], [92, 47]], 'dashed')
  addBall(b, 59.5, 5.5)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 22,
    pitch: NAVY_PITCH,
    description:
      'Läufe in den Halbraum: Der Achter oder Zehner startet in die Lücke zwischen Außen- und Innenverteidiger. Hat der Flügelspieler den Außenverteidiger gebunden, ist der Raum frei.\n' +
      'Timing: Der Lauf beginnt, wenn der Pass vorbereitet wird – nicht erst, wenn er gespielt ist.',
  })
}

function midBlock442(name: string): Drill {
  const b = builder(FULL)
  const back: Pt[] = [
    [41.8, 14.7],
    [41.8, 28.2],
    [41.8, 40.9],
    [41.8, 54.4],
  ]
  const mid: Pt[] = [
    [54.6, 14.7],
    [54.6, 28.1],
    [54.6, 40.8],
    [54.6, 54.4],
  ]
  const front: Pt[] = [
    [66, 28.1],
    [66, 40.3],
  ]
  poly(b, [mid[0], front[0], front[1], mid[3], back[3], back[0]], { color: WHITE, fillColor: WHITE, fillOpacity: 0.12, alpha: 0.9 })
  chain(b, back, YELLOW)
  chain(b, mid, YELLOW)
  chain(b, front, YELLOW)
  ;['2', '4', '5', '3'].forEach((l, i) => player(b, YELLOW, l, back[i]))
  ;['7', '6', '8', '11'].forEach((l, i) => player(b, YELLOW, l, mid[i]))
  ;['10', '9'].forEach((l, i) => player(b, YELLOW, l, front[i]))
  player(b, YELLOW, '1', [5.1, 34.2])
  team(b, BLUE, [
    ['', 97, 34.8],
    ['', 77.2, 23.7],
    ['', 77.2, 43.7],
    ['', 66.5, 3.9],
    ['', 67, 64.7],
    ['', 64.1, 34],
    ['', 54.6, 21.3],
    ['', 54.6, 47.9],
    ['', 44.6, 34.2],
    ['', 47, 3.9],
    ['', 47, 64.7],
  ], 180)
  return pitchDrill(name, 'full', b, {
    area: 'tactic',
    category: 'tactics',
    players: 22,
    pitch: NAVY_PITCH,
    description:
      'Der 4-4-2-Mittelfeldblock: zwei Viererketten und zwei Stürmer, kompakt um die Mittellinie (markierte Fläche).\n' +
      'Die Stürmer lenken das Spiel nach außen und schließen den Weg zum Sechser, die Ketten verschieben gemeinsam zur Ballseite. Abstand zwischen den Ketten 10–12 m.',
  })
}

// ---------------------------------------------------------------------------------------
// Pressing and counter-pressing

const TEAL = '#14b8a6'

/** Round highlight on the field (e.g. the space around the ball). */
function spot(b: Builder, [x, y]: Pt, radius: number): void {
  rect(b, x - radius, y - radius, x + radius, y + radius, { shape: 'ellipse', color: TEAL, fillColor: TEAL, fillOpacity: 0.45 })
}

/** Pass or shot in a team color with a step number. */
function teamPass(b: Builder, from: Pt, to: Pt, color: string, step: number, type: 'pass' | 'shot' = 'pass'): void {
  addLine(b, type, pts([from, to]), { color, step })
}

function counterPressMiniGoals(name: string): Drill {
  const area = { length: 25, width: 35 }
  const b = builder(area)
  addOutline(b, area)
  for (const y of [5.5, 29.5]) mark(b, [[0, y], [25, y]])
  addGoal(b, 'goal', 0, 17.5, 0, 0.75)
  addGoal(b, 'goal', 25, 17.5, 180, 0.75)
  for (const y of [14.6, 20.4]) {
    addGoal(b, 'minigoal', 14.6, y, 0, 1.5)
    addGoal(b, 'minigoal', 10.4, y, 180, 1.5)
  }
  player(b, GREY, 'TW', [1.4, 17.5])
  player(b, GREY, 'TW', [23.6, 17.5], { rotation: 180 })
  team(b, RED, [
    ['', 4.3, 2.8],
    ['', 18.2, 3.2],
    ['', 5.3, 32.5],
    ['', 18.3, 33],
  ])
  team(b, BLUE, [
    ['', 8.9, 10.2],
    ['', 5.2, 10.2],
    ['', 9.1, 24.3],
    ['', 5.1, 23.4],
  ])
  player(b, YELLOW, 'J', [8.9, 15.3])
  teamPass(b, [1.8, 16], [4.3, 3.8], RED, 1)
  teamPass(b, [5, 3.6], [8.6, 9.3], RED, 2)
  teamPass(b, [8.6, 11.2], [5.5, 22.5], BLUE, 3)
  teamPass(b, [4.4, 24], [0.6, 19.8], BLUE, 4, 'shot')
  addBall(b, 2.3, 16.6)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 11,
    orientation: 'portrait',
    description:
      'Blau (4) spielt mit dem gelben Joker im Mittelfeld, Rot (4) steht in den Außenzonen. Der Torwart eröffnet über einen roten Außenspieler, Blau kombiniert mit den Außenspielern und schließt auf ein großes Tor ab.\n' +
      'Gegenpressing: Nach einem Ballverlust jagt Blau den Ball sofort zurück. Wer den Ball erobert, kann in 6 Sekunden auf eines der 4 Minitore in der Mitte treffen – danach zählen nur noch die großen Tore.\n' +
      'Rollen nach 3 Minuten tauschen.',
  })
}

/** Players of the pressing pictures on the half pitch (own goal at the bottom, blue defends). */
const PRESS_BLUE: [string, number, number][] = [
  ['', 20, 16.7],
  ['', 18.8, 27.5],
  ['', 18.8, 39.4],
  ['', 19.2, 51.1],
  ['', 28, 19],
  ['', 25.8, 29.7],
  ['', 25.3, 37.9],
  ['', 26.9, 47.9],
  ['', 35.3, 27.5],
  ['', 34.7, 37.7],
]
const PRESS_RED: [string, number, number][] = [
  ['', 27.6, 7.8],
  ['', 23.3, 22.3],
  ['', 21.3, 33.4],
  ['', 20.9, 43.4],
  ['', 29.2, 30.7],
  ['', 28.7, 39.6],
  ['', 27.6, 59.4],
  ['', 34.9, 32.6],
  ['', 41.9, 20.8],
  ['', 40.8, 46.3],
]

function pressingHalf(b: Builder): void {
  rect(b, PA_NEAR, SIDE_L, 33, SIDE_R, { fillOpacity: 0.12, color: WHITE })
  for (const y of [SIDE_L, SIDE_R]) mark(b, [[PA_NEAR, y], [HALF, y]])
  mark(b, [[33, SIDE_L], [33, SIDE_R]])
  for (const y of [17.5, 50.5]) addGoal(b, 'minigoal', 51.2, y, 180, 1.5)
  player(b, GREY, 'TW', [2, 34])
  team(b, BLUE, PRESS_BLUE)
  team(b, RED, PRESS_RED, 180)
}

function closestPresses(name: string): Drill {
  const b = builder(FULL)
  spot(b, [23.3, 22.3], 4.5)
  pressingHalf(b)
  teamPass(b, [40.9, 21], [24.6, 22.2], RED, 1)
  run(b, [[27, 19.5], [24.9, 21.1]], 'dashed', BLUE)
  addBall(b, 41, 22.2)
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'tactics',
    players: 21,
    description:
      'Rot greift auf das große Tor an, Blau verteidigt im markierten Mittelfeldraum zwischen den gestrichelten Linien. Die roten Spieler ganz außen sind Anspieler.\n' +
      'Regel: Der Blaue, der dem Ball am nächsten ist, presst sofort (markierter Kreis um den Passempfänger) – die anderen rücken nach und schließen die Passwege. Nach Ballgewinn kontert Blau auf die 2 Minitore an der Mittellinie.',
  })
}

function decisionDistances(name: string): Drill {
  const b = builder(FULL)
  spot(b, [26.9, 47.9], 4.5)
  pressingHalf(b)
  addBall(b, 29.2, 48)
  return pitchDrill(name, 'half', b, {
    area: 'drill',
    category: 'tactics',
    players: 21,
    description:
      'Gleicher Aufbau wie „Nächster Spieler presst“: Der Blaue im markierten Kreis hat den Ball erobert.\n' +
      'Entscheidung: sofort nach vorne auf die Minitore kontern, auf die andere Seite verlagern oder sichern. Rot schaltet um, hält die Abstände zwischen den Linien klein (10–12 m) und läuft den Ballführenden so an, dass der Weg nach vorne zu ist.',
  })
}

/** Square of 40 × 26 m with a dashed inner square and four red outside players. */
function pressSquare(b: Builder, area: { length: number; width: number }): void {
  addOutline(b, area)
  rect(b, 13.5, 6.5, 26.5, 19.5, { dashed: true })
  team(b, RED, [
    ['', 20, -1.8],
    ['', 20, 27.8],
    ['', -1.8, 13],
    ['', 41.8, 13],
  ])
  team(b, BLUE, [
    ['', 7.9, 5],
    ['', 30.4, 4.8],
    ['', 6.3, 13],
    ['', 33.2, 12.9],
    ['', 8.7, 22],
    ['', 30.3, 22],
  ])
}

function counterPressEight(name: string): Drill {
  const area = { length: 40, width: 26 }
  const b = builder(area)
  pressSquare(b, area)
  team(b, RED, [
    ['', 15.3, 8.8],
    ['', 24, 8.8],
    ['', 15.3, 16.8],
    ['', 24, 16.8],
  ])
  team(b, BLUE, [
    ['', 18.5, 10.9],
    ['', 21.3, 14],
  ])
  addBall(b, 16.4, 9.6)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 16,
    description:
      'Rot hält den Ball im inneren Quadrat 4 gegen 2. Gewinnt Blau den Ball, spielt es ihn aus dem Quadrat zu einem blauen Spieler außen – jetzt heißt es 8 gegen 4 im großen Feld.\n' +
      'Rot muss den Ball sofort zurückerobern (Gegenpressing), die 4 roten Außenspieler helfen als Anspielstationen. Punkte: Rot für 6 Pässe im Quadrat oder Ballgewinn außen, Blau für 8 Pässe in Folge.',
  })
}

function blockTheLine(name: string): Drill {
  const area = { length: 40, width: 26 }
  const b = builder(area)
  pressSquare(b, area)
  team(b, RED, [
    ['', 18.1, 8.8],
    ['', 17.6, 16.8],
    ['', 8.7, 10],
    ['', 11.1, 15.9],
  ])
  team(b, BLUE, [
    ['', 18.5, 10.9],
    ['', 21.9, 15],
  ])
  teamPass(b, [7.9, 6.3], [8.3, 8.8], BLUE, 1)
  teamPass(b, [7.7, 10.4], [-0.6, 12.7], RED, 2)
  addBall(b, 7.9, 6.4)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 16,
    description:
      'Aufbau wie „8 gegen 8 Gegenpressing“: Blau hat den Ball außen. Der nächste Rote läuft so an, dass er die Passlinie zum nächsten Blauen mit dem Körper zustellt (Deckungsschatten).\n' +
      'Spielt Blau trotzdem in diese Linie, fängt Rot ab und spielt sofort zu einem roten Außenspieler. Coaching: im Bogen anlaufen, nicht gerade auf den Ball.',
  })
}

// ---------------------------------------------------------------------------------------
// Catalog

export type ExtraGroup = 'zoning' | 'running' | 'rondos' | 'games' | 'pressing' | 'tactics'

export const EXTRA_GROUPS: { group: ExtraGroup; title: string }[] = [
  { group: 'zoning', title: 'Raumaufteilung Großfeld' },
  { group: 'running', title: 'Laufübungen' },
  { group: 'rondos', title: 'Rondos und Positionsspiel' },
  { group: 'games', title: 'Spielformen' },
  { group: 'pressing', title: 'Pressing und Gegenpressing' },
  { group: 'tactics', title: 'Taktik und Aufstellung' },
]

export interface ExtraTemplate {
  key: string
  group: ExtraGroup
  name: string
  hint: string
  build: (name: string) => Drill
}

export const EXTRA_TEMPLATES: ExtraTemplate[] = [
  { key: 'zonesGrid', group: 'zoning', name: 'Zonen 3 × 5 (gestrichelt)', hint: 'Querlinien an Strafräumen und Dritteln', build: zonesGrid },
  { key: 'lanesBoxes', group: 'zoning', name: 'Korridore mit Flügelkästen', hint: '5 Korridore zwischen den Strafräumen', build: lanesWithBoxes },
  { key: 'diagonal', group: 'zoning', name: 'Zonen mit Schräglinien zum Tor', hint: 'Gefährliche Räume vor dem Tor', build: diagonalZones },
  { key: 'middleBlock', group: 'zoning', name: 'Mittlerer Block', hint: 'Kompakt verteidigen, verschieben', build: middleBlock },
  { key: 'shuttle', group: 'running', name: 'Pendelläufe Halbfeld', hint: '3 × 135 m hohe Intensität', build: shuttleRuns },
  { key: 'boxRuns', group: 'running', name: 'Strafraum zu Strafraum (Runden)', hint: 'Sprint lang, traben kurz – 8 Runden', build: boxToBoxRuns },
  { key: 'boxSprints', group: 'running', name: 'Box-to-Box-Sprints', hint: '6 Sprints hin und zurück', build: boxToBoxSprints },
  { key: 'wSprints', group: 'running', name: 'W-Sprints', hint: '3 Hütchen an der Mittellinie', build: wSprints },
  { key: 'square4', group: 'games', name: 'Quadrat 4:4 + 4 Außenspieler', hint: 'Ballbesitz, 20 × 20 m', build: squareOutside },
  { key: 'square5', group: 'games', name: 'Quadrat 5:5', hint: 'Ballbesitz ohne Tore, 22 × 22 m', build: squareFive },
  { key: 'square2', group: 'games', name: 'Quadrat 2+2 gegen 2+2', hint: 'Durchspielen von Außen zu Außen', build: squareTwoPlusTwo },
  { key: 'halves', group: 'games', name: '2:1 in zwei Hälften', hint: 'Zusammen 4:2, 30 × 20 m', build: twoHalves },
  { key: 'sixGoals', group: 'games', name: '6-Tore-Spiel 6:6 + 6', hint: 'Gerichteter Ballbesitz, 45 × 32 m', build: sixGoals },
  { key: 'nineSix', group: 'games', name: '9:6 auf dem Halbfeld', hint: 'Verlagern und abschließen, Konter auf 2 Minitore', build: nineVsSix },
  { key: 'rondos', group: 'games', name: '4 × Rondo 3:1', hint: 'Aufwärmen, 4 Felder 12 × 12 m', build: fourRondos },
  { key: 'tenSix', group: 'games', name: 'Ballbesitz 10:6', hint: 'In Grundordnung, 44 × 32 m', build: tenVsSix },
  { key: 'into3v2', group: 'games', name: 'Ballbesitz ins 3:2', hint: '6:4, dann 3:2 aufs Tor', build: possessionThreeVsTwo },
  { key: 'buildUp4231', group: 'games', name: 'Spielaufbau 4-2-3-1 auf 2 Minitore', hint: 'Halbfeld, 46 m tief', build: buildUpTwoGoals },
  { key: 'channels231', group: 'games', name: '2-3-1 gegen 2-3-1 in 3 Korridoren', hint: 'Verlagern, 50 × 40 m', build: channels231 },
  { key: 'overload', group: 'games', name: 'Überladen 5:3 + 2, 4 Minitore', hint: 'Eine Hälfte überladen, andere angreifen', build: overloadHalves },
  { key: 'fiveSix', group: 'games', name: '5 + TW gegen 6, 3 Minitore', hint: 'Kompakt verteidigen im 2-2-1', build: fivePlusKeeperVsSix },
  { key: 'eightEight', group: 'games', name: '8:8 im 3-2-3, je 3 Minitore', hint: 'Zentral gegen den Mittelfeldblock', build: eightVsEight },
  { key: 'centralBuildUp', group: 'games', name: 'Zentraler Aufbau 8 + TW gegen 8', hint: '4 Minitore, 55 × 40 m', build: centralBuildUp },
  { key: 'structure325', group: 'tactics', name: '3-2-5 mit Halbräumen', hint: 'Gegen tiefen Block 4-4-2', build: structure325 },
  { key: 'connections325', group: 'tactics', name: '3-2-5 mit Passverbindungen', hint: '3 gegen 2 im Aufbau', build: connections325 },
  { key: 'superiority', group: 'tactics', name: 'Positionsspiel 3-2-2-3', hint: 'Dreiecke, zwischen den Linien', build: superiority3223 },
  { key: 'plusOne', group: 'tactics', name: '+1-Konzept im Spielaufbau', hint: '4-3-3 gegen 4-3-3, Achter fallen ab', build: plusOne },
  { key: 'rotationRondo', group: 'rondos', name: 'Rotations-Rondo 3:3 + 4', hint: '20 × 15 m, vier Felder', build: rotationRondo },
  { key: 'rondo82', group: 'rondos', name: 'Rondo 8:2 (hohe Intensität)', hint: '14 × 14 m, Verteidiger wechseln', build: rondoEightTwo },
  { key: 'fourFourFour', group: 'rondos', name: '4:4:4 im Quadrat', hint: 'Drei Teams, inneres Quadrat', build: fourFourFour },
  { key: 'wallPlayers', group: 'rondos', name: 'Positionsrondo mit Wandspielern', hint: '4 + 4 gegen 4 + 4 + Joker', build: wallPlayersRondo },
  { key: 'pentagon', group: 'rondos', name: 'Rondo 5 + 2:3 im Fünfeck', hint: '7 m zwischen den Hütchen', build: pentagonRondo },
  { key: 'switchRondo', group: 'rondos', name: 'Verlagerungs-Rondo', hint: '25 × 25 m, von IV zu ST', build: switchRondo },
  { key: 'rondoFinish', group: 'rondos', name: 'Rondo zum Abschluss', hint: '4:2 im Mittelkreis, dann aufs Tor', build: rondoToFinish },
  { key: 'rondoAttack', group: 'rondos', name: 'Rondo in den Angriff', hint: 'Nach 8 Pässen Flanke', build: rondoIntoAttack },
  { key: 'fiveFiveOne', group: 'rondos', name: 'Positionsspiel 5:5 + 1', hint: '30 × 18 m, zwei Tore', build: fiveFivePlusOne },
  { key: 'squareBox', group: 'rondos', name: '4:4 + 1 vor dem Strafraum', hint: 'Quadrat 20 × 20 m, dann Abschluss', build: squareBeforeBox },
  { key: 'nineNineFive', group: 'rondos', name: '9:9 + 5 in Zonen (dritter Mann)', hint: '70 × 45 m, Abschlusszonen', build: nineNinePlusFive },
  { key: 'eightMidBlock', group: 'rondos', name: '8:8 + 2 gegen Mittelblock', hint: 'Aufbau im 2-4-4, 4 Minitore', build: eightEightMidBlock },
  { key: 'eightFourGoals', group: 'rondos', name: 'Ballbesitz 8:8 + 2, 4 Minitore', hint: '5 Pässe, dann Abschluss', build: eightEightFourGoals },
  { key: 'thirdMan', group: 'games', name: 'Dritter Mann: Angriff gegen Abwehr', hint: '8 gegen 6 + TW, 35 × 35 m', build: thirdManAttackDefence },
  { key: 'pressingThirds', group: 'games', name: 'Pressingspiel in Dritteln', hint: '4 + 4 gegen 4, 45 × 25 m', build: pressingThirds },
  { key: 'halfSpaceEnd', group: 'games', name: 'Halbraum-Endzonen-Spiel', hint: '6:6, 45 × 35 m', build: halfSpaceEndZones },
  { key: 'runsBehind', group: 'games', name: 'Läufe in die Tiefe', hint: '4:4 + 3, 30 × 20 m', build: runsInBehind },
  { key: 'redZone', group: 'games', name: 'Aufbauspiel mit Zone', hint: '9:7, 55 × 45 m', build: buildUpRedZone },
  { key: 'centreBacks', group: 'games', name: 'Spiel für Innenverteidiger', hint: '8:8 mit TW, 55 × 40 m', build: centreBackGame },
  { key: 'buildUpPress', group: 'games', name: 'Aufbau gegen Pressing', hint: 'Halbfeld, Seitenzonen', build: buildUpVsPress },
  { key: 'buildUpMidfield', group: 'games', name: 'Aufbau ins Mittelfeld', hint: 'Zone mit 2 Minitoren', build: buildUpToMidfield },
  { key: 'counter3', group: 'games', name: 'Konter in 3 Phasen', hint: '2:1, dann 3:2 zurück', build: counterThreePhases },
  { key: 'waves', group: 'games', name: 'Wellen 2:0 → 2:2 → 3:3', hint: '36 × 24 m, zwei Tore', build: waveTransitions },
  { key: 'highPress', group: 'games', name: 'Hohes Pressing (Großfeld)', hint: 'Gegen Aufbau, 3 Minitore', build: highPressFull },
  { key: 'pressMiniGoals', group: 'pressing', name: 'Gegenpressing mit 4 Minitoren', hint: '4:4 + Joker, Außenzonen, 25 × 35 m', build: counterPressMiniGoals },
  { key: 'closestPresses', group: 'pressing', name: 'Nächster Spieler presst', hint: 'Halbfeld, Mittelfeldraum, 2 Minitore', build: closestPresses },
  { key: 'decisionDistances', group: 'pressing', name: 'Entscheidung und Abstände', hint: 'Nach Ballgewinn kontern oder sichern', build: decisionDistances },
  { key: 'counterPress8', group: 'pressing', name: '8 gegen 8 Gegenpressing', hint: 'Innen 4:2, außen 8:4, 40 × 26 m', build: counterPressEight },
  { key: 'blockLine', group: 'pressing', name: 'Passlinie zustellen', hint: 'Anlaufen im Deckungsschatten', build: blockTheLine },
  { key: 'widthDepth', group: 'tactics', name: 'Breite und Tiefe (Rollen)', hint: 'Pinner, Floater, Anker', build: widthAndDepth },
  { key: 'lanes235', group: 'tactics', name: '2-3-5 in fünf Korridoren', hint: 'Flügel, Halbräume, Zentrum', build: lanes235 },
  { key: 'threeOneSix', group: 'tactics', name: '3-1-6 gegen tiefen Block', hint: 'Mit Restverteidigung', build: threeOneSix },
  { key: 'cdmBuildUp', group: 'tactics', name: 'Der Sechser im Spielaufbau', hint: 'Taschen gegen 4-4-2', build: (n) => buildUpRole(n, 'cdm') },
  { key: 'fullbackBuildUp', group: 'tactics', name: 'Außenverteidiger im Spielaufbau', hint: 'Position zieht den Gegner', build: (n) => buildUpRole(n, 'fullback') },
  { key: 'oneUnit', group: 'tactics', name: 'Eine Einheit durch die Drittel', hint: 'Kompakt aufrücken', build: oneUnitThirds },
  { key: 'rotation325', group: 'tactics', name: 'Rotation 4-3-3 → 3-2-5', hint: 'Ziel-Struktur im Angriff', build: rotation325 },
  { key: 'halfSpaceRuns', group: 'tactics', name: 'Läufe in den Halbraum', hint: 'Lücke zwischen AV und IV', build: halfSpaceRuns },
  { key: 'midBlock442', group: 'tactics', name: '4-4-2-Mittelfeldblock', hint: 'Kompakt um die Mittellinie', build: midBlock442 },
]

export function extraTemplateDrill(key: string): Drill {
  const template = EXTRA_TEMPLATES.find((t) => t.key === key)
  if (!template) throw new Error(`Unknown template ${key}`)
  return template.build(template.name)
}

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

const WHITE = '#ffffff'
const RED = '#dc2626'
const BLUE = '#2563eb'
const YELLOW = '#facc15'
const ORANGE = '#f97316'
const BLACK = '#111827'
const GREEN = '#22c55e'
const GREY = '#9ca3af'
const PASS = '#facc15'

type Pt = [number, number]

const FULL = { length: PITCH.length, width: PITCH.width }
/** Penalty area edges across the pitch and the inner lanes (half-spaces) */
const PA_NEAR = PITCH.penaltyAreaDepth
const PA_FAR = PITCH.length - PITCH.penaltyAreaDepth
const SIDE_L = (PITCH.width - PITCH.penaltyAreaWidth) / 2
const SIDE_R = PITCH.width - SIDE_L
const LANE_L = 27.9
const LANE_R = PITCH.width - LANE_L
const HALF = PITCH.length / 2

const pts = (list: Pt[]): Point[] => list.map(([x, y]) => ({ x, y }))

/** Marking line of the field (fixed with it). */
function mark(b: Builder, list: Pt[], pattern: LinePattern = 'dashed', color = WHITE): void {
  addLine(b, 'line', pts(list), { pattern, weight: 'extraThin', color })
  b.lines[b.lines.length - 1].locked = true
}

/** Plain drawn line, e.g. connections between players (not fixed). */
function link(b: Builder, a: Pt, c: Pt, color = GREY, pattern: LinePattern = 'solid'): void {
  addLine(b, 'line', pts([a, c]), { pattern, weight: 'extraThin', color })
}

function run(b: Builder, list: Pt[], pattern: LinePattern = 'solid', color = WHITE): void {
  addLine(b, 'run', pts(list), { pattern, weight: 'extraThin', color })
}

function pass(b: Builder, from: Pt, to: Pt, pattern: LinePattern = 'dashed', step: number | null = null): void {
  addLine(b, 'pass', pts([from, to]), { pattern, color: PASS, step })
}

function player(b: Builder, color: string, label: string, [x, y]: Pt, extra: Partial<Item> = {}): void {
  addItem(b, 'player', x, y, { color, label, size: 1.5 * b.k, ...extra })
}

function team(b: Builder, color: string, list: [string, number, number][], rotation = 0): void {
  for (const [label, x, y] of list) player(b, color, label, [x, y], { rotation })
}

function text(b: Builder, label: string, [x, y]: Pt, size = 0.6, rotation = 0): void {
  addItem(b, 'text', x, y, { label, size, rotation })
}

function cone(b: Builder, [x, y]: Pt): void {
  addItem(b, 'cone', x, y, { color: ORANGE, size: b.k })
}

/** Rectangle zone from corner (x0, y0) to (x1, y1). */
function rect(b: Builder, x0: number, y0: number, x1: number, y1: number, style: Partial<Zone> = {}): void {
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

interface DrillOptions {
  description: string
  players: number | null
  area: 'drill' | 'tactic'
  category: Category | null
  fieldSize?: string
  pitch?: Partial<PitchStyle>
}

/** Drill on the big pitch or half pitch, shown upright (own goal at the bottom). */
function pitchDrill(title: string, fieldType: 'full' | 'half', b: Builder, o: DrillOptions): Drill {
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
function areaDrill(
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
// Catalog

export type ExtraGroup = 'zoning' | 'running' | 'games' | 'tactics'

export const EXTRA_GROUPS: { group: ExtraGroup; title: string }[] = [
  { group: 'zoning', title: 'Raumaufteilung Großfeld' },
  { group: 'running', title: 'Laufübungen' },
  { group: 'games', title: 'Spielformen' },
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
]

export function extraTemplateDrill(key: string): Drill {
  const template = EXTRA_TEMPLATES.find((t) => t.key === key)
  if (!template) throw new Error(`Unknown template ${key}`)
  return template.build(template.name)
}

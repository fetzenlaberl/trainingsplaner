// "Fango Grafiken": templates made from the coach's own drawings (set pieces, team shapes,
// build-up patterns and training forms). Only the set-up is taken over – positions, zones,
// runs and short German notes. No names of players, clubs or opponents; everything is drawn
// with the app's own items, lines and zones.

import { PITCH } from '../field/dimensions'
import type { PitchStyle } from '../field/pitchStyle'
import { addBall, addGoal, addItem, addLine, addOutline, builder, type Builder } from './fieldTemplates'
import {
  areaDrill as plainAreaDrill,
  BLACK,
  BLUE,
  cone,
  FULL,
  GREEN,
  GREY,
  HALF,
  mark,
  PA_NEAR,
  pass,
  pitchDrill,
  player,
  pts,
  PURPLE,
  rect,
  RED,
  run,
  SIDE_L,
  SIDE_R,
  team,
  text,
  WHITE,
  YELLOW,
  type DrillOptions,
  type Pt,
} from './extraTemplates'
import type { Drill } from './types'

/** Striped grass like on the original drawings. */
const GRASS: Partial<PitchStyle> = { color: 'grass', lineWidth: 'thin' }

type Pos = [string, number, number]

const W = PITCH.width
const SKY_LINE = '#38bdf8'
const MID_Y = W / 2

function keeper(b: Builder, [x, y]: Pt, color = YELLOW): void {
  player(b, color, 'TW', [x, y])
}

/** Longer coaching note in a small white box (plain texts wrap after about 13 characters). */
function note(b: Builder, label: string, [x, y]: Pt): void {
  addItem(b, 'textbox', x, y, { label, color: WHITE, size: b.k, box: b.k >= 1 ? { width: 'wide' } : { width: 'wide', font: 'small' } })
}

function shot(b: Builder, from: Pt, to: Pt): void {
  addLine(b, 'shot', pts([from, to]), { color: WHITE })
}

function dribble(b: Builder, list: Pt[]): void {
  addLine(b, 'dribble', pts(list), { color: WHITE })
}

/** Curved ball flight (e.g. a cross or a free kick) through a middle point. */
function flight(b: Builder, list: Pt[], color = YELLOW): void {
  addLine(b, 'pass', pts(list), { color, pattern: 'dashed', smooth: true })
}

function marker(b: Builder, label: string, [x, y]: Pt, color = RED): void {
  addItem(b, 'marker', x, y, { label, color, size: b.k })
}

function coach(b: Builder, [x, y]: Pt): void {
  addItem(b, 'coach', x, y, { label: 'TR', size: 1.3 })
}

const half = (name: string, b: Builder, o: Omit<DrillOptions, 'pitch'>): Drill => pitchDrill(name, 'half', b, { ...o, pitch: GRASS })
const full = (name: string, b: Builder, o: Omit<DrillOptions, 'pitch'>): Drill => pitchDrill(name, 'full', b, { ...o, pitch: GRASS })

function corner(name: string, side: 'cornerLeft' | 'cornerRight', b: Builder, o: Omit<DrillOptions, 'pitch'>): Drill {
  const drill = pitchDrill(name, 'full', b, { ...o, pitch: GRASS })
  return { ...drill, fieldType: side, pitch: { ...drill.pitch, orientation: 'landscape' } }
}

/** Training form on an own area, with the white field outline underneath everything else. */
function areaDrill(
  name: string,
  area: { length: number; width: number },
  b: Builder,
  o: Parameters<typeof plainAreaDrill>[3] & { outline?: boolean },
): Drill {
  if (o.outline !== false) {
    addOutline(b, area)
    b.zones.unshift(b.zones.pop()!)
  }
  return plainAreaDrill(name, area, b, o)
}

// ---------------------------------------------------------------------------------------
// Set pieces

function kickOff(name: string): Drill {
  const b = builder(FULL)
  team(b, BLUE, [
    ['2', 33, 60],
    ['4', 30, 42],
    ['5', 30, 26],
    ['3', 33, 8],
    ['6', 42, 34],
    ['8', 47, 24],
    ['10', 47, 44],
    ['11', 51, 5],
    ['7', 51, 63],
    ['9', 52, 34.8],
  ])
  keeper(b, [4, 34])
  team(b, RED, [
    ['9', 61, 30],
    ['10', 61, 40],
    ['7', 66, 8],
    ['8', 66, 26],
    ['6', 66, 42],
    ['11', 66, 60],
    ['2', 79, 9],
    ['5', 78, 27],
    ['4', 78, 41],
    ['3', 79, 59],
  ], 180)
  keeper(b, [101, 34], GREEN)
  addBall(b, HALF, MID_Y)
  pass(b, [52.5, 34], [43, 34], 'solid', 1)
  flight(b, [[42, 34], [62, 16], [76, 7]])
  run(b, [[51, 5], [74, 6]], 'dashed')
  run(b, [[52, 35], [72, 29]], 'dashed')
  run(b, [[51, 63], [70, 52]], 'dashed')
  run(b, [[47, 24], [60, 20]], 'dashed')
  note(b, 'Anstoß zurück, dann langer Ball hinter die Kette', [90, 34])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 22,
    description:
      'Anstoß-Variante: Der Stürmer legt zurück auf den Sechser, der spielt sofort den langen Ball diagonal hinter die Abwehrkette.\n' +
      'Linker Flügel, Stürmer und rechter Flügel starten mit dem Anstoß in die Tiefe, der Achter rückt für den zweiten Ball nach.',
  })
}

function cornerDefZone(name: string): Drill {
  const b = builder(FULL)
  rect(b, 2, 22, 9, 46, { color: GREEN, fillColor: GREEN, fillOpacity: 0.25, label: 'Raumdeckung' })
  team(b, BLUE, [
    ['', 5.5, 25],
    ['', 5.5, 30],
    ['', 5.5, 35],
    ['', 5.5, 40],
    ['', 5.5, 44.5],
    ['', 1.5, 41.5],
    ['', 9.5, 31],
    ['', 10.5, 38],
    ['', 18, 34],
  ])
  keeper(b, [1.2, 34])
  player(b, BLUE, '', [38, 44])
  team(b, RED, [
    ['', 11, 29],
    ['', 12, 36.5],
    ['', 8, 47],
    ['', 14, 42],
    ['', 20, 30],
  ], 180)
  player(b, RED, '', [0, 67.5])
  addBall(b, 0.6, 66.8)
  flight(b, [[0.6, 66.5], [9, 52], [6, 36]])
  text(b, 'Manndeckung', [12, 24], 0.55)
  note(b, 'Entlastungs- bzw. Umschaltspieler', [22, 40])
  text(b, 'Konter', [42, 44], 0.5)
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 17,
    description:
      'Defensiver Eckball gemischt: Fünf Spieler decken den Raum auf der Höhe des Fünfmeterraums (grüne Zone), einer steht am kurzen Pfosten.\n' +
      'Zwei Manndecker übernehmen die kopfballstärksten Gegner. Ein Spieler sichert den Rückraum am Strafraum, einer bleibt für den Konter vorne.',
  })
}

function cornerAttack(name: string): Drill {
  const b = builder(FULL)
  team(b, BLUE, [
    ['1', 99, 38],
    ['2', 98, 29],
    ['3', 93, 35],
    ['4', 88, 41],
    ['5', 101, 62],
    ['6', 84, 30],
  ])
  player(b, BLUE, '', [105, 68])
  team(b, WHITE, [
    ['', 100, 31],
    ['', 99.5, 36],
    ['', 99.5, 41],
    ['', 95, 31],
    ['', 94, 39],
    ['', 103.8, 40],
  ], 0)
  keeper(b, [104, 34], GREEN)
  addBall(b, 104.6, 67.5)
  flight(b, [[104.6, 67], [97, 52], [98, 31]])
  pass(b, [104.6, 67.5], [101.5, 62.5], 'solid')
  run(b, [[93, 39], [100, 38]], 'dashed')
  run(b, [[92, 26], [98, 29]], 'dashed')
  run(b, [[89, 34], [93, 35]], 'dashed')
  note(b, 'Variante 1: lang', [96, 22])
  note(b, 'Variante 2: kurz', [96, 58])
  return corner(name, 'cornerRight', b, {
    area: 'tactic',
    category: 'tactics',
    players: 14,
    description:
      'Offensive Ecke von rechts mit zwei Varianten auf Handzeichen:\n' +
      'Variante 1 (beide Hände): lang auf den zweiten Pfosten, Spieler 1 und 3 attackieren den kurzen Pfosten und den Elfmeterpunkt.\n' +
      'Variante 2 (eine Hand): kurz auf Spieler 5, der flankt aus dem Halbfeld nach. Spieler 6 sichert den Rückraum.',
  })
}

function cornerCommand(name: string): Drill {
  const b = builder(FULL)
  team(b, BLUE, [
    ['1', 94, 33],
    ['2', 94.5, 35],
    ['3', 89, 26],
    ['4', 86, 38],
  ])
  player(b, BLUE, '', [105, 0])
  team(b, WHITE, [
    ['', 99.5, 27],
    ['', 99.5, 32],
    ['', 99.5, 37],
    ['', 96, 34],
    ['', 103.8, 28],
  ], 0)
  keeper(b, [104, 34], GREEN)
  addBall(b, 104.6, 0.5)
  run(b, [[94, 33], [100, 26]], 'dashed')
  run(b, [[94.5, 35], [100, 41]], 'dashed')
  run(b, [[89, 26], [93, 33]], 'dashed')
  flight(b, [[104.6, 1], [98, 14], [100, 26]])
  note(b, 'Kommando: beide Hände nach oben', [84, 8])
  note(b, 'je nach Zuspiel: Flanke 2. Pfosten, Dribbling oder Abschluss', [80, 50])
  return corner(name, 'cornerLeft', b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Ecke von links mit Kommando: Spieler 1 und 2 starten zusammen am Elfmeterpunkt und laufen auseinander (kurzer und langer Pfosten).\n' +
      'Spieler 3 stößt in die Lücke nach, Spieler 4 sichert den Rückraum. Der Ball kommt scharf an den kurzen Pfosten.',
  })
}

function freeKickBallLine(name: string): Drill {
  const b = builder(FULL)
  const group: Pt[] = [
    [20, 40],
    [20.5, 43],
    [21, 46],
    [21.5, 49],
    [22, 52],
  ]
  team(b, BLUE, group.map(([x, y], i) => [String(i + 1), x, y]))
  for (const [i, [x, y]] of group.entries()) run(b, [[x, y], [6 + i, 28 + i * 2.5]], 'dashed')
  team(b, BLUE, [
    ['', 25, 30],
    ['', 30, 22],
  ])
  player(b, BLUE, '', [30, 60])
  addBall(b, 29, 59)
  team(b, RED, [
    ['', 18.5, 30],
    ['', 18.5, 35],
    ['', 18.5, 40],
    ['', 18.5, 45],
    ['', 18.5, 50],
    ['', 22, 56],
    ['', 24, 57.5],
  ], 180)
  keeper(b, [1.5, 34], GREEN)
  flight(b, [[29, 59], [16, 50], [8, 33]])
  note(b, 'Gruppe: Lauf in die Ballinie – durchlaufen!', [28, 40])
  note(b, 'Abpraller 2. Reihe', [27, 22])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 16,
    description:
      'Freistoß aus dem rechten Halbfeld: Die Gruppe (1–5) steht auf der Abseitslinie und läuft mit dem Anlauf des Schützen in die Ballinie zum Tor – durchlaufen!\n' +
      'Zwei Spieler warten in der zweiten Reihe auf Abpraller und sichern gegen den Konter.',
  })
}

function freeKickCross(name: string): Drill {
  const b = builder(FULL)
  const group: [Pt, Pt][] = [
    [[20, 22], [6, 42]],
    [[20, 26], [8, 30]],
    [[20, 30], [6, 37]],
    [[20, 34], [9, 26]],
    [[20, 38], [10, 34]],
  ]
  for (const [i, [from, to]] of group.entries()) {
    player(b, BLUE, String(i + 1), from)
    run(b, [from, to], 'dashed')
  }
  player(b, BLUE, '', [26, 44])
  player(b, BLUE, '', [29, 8])
  addBall(b, 28, 9)
  team(b, RED, [
    ['', 18, 22],
    ['', 18, 27],
    ['', 18, 32],
    ['', 18, 37],
    ['', 18, 42],
    ['', 21, 11],
    ['', 23, 12.5],
  ], 180)
  keeper(b, [1.5, 34], GREEN)
  flight(b, [[28, 9], [16, 20], [8, 34]])
  note(b, 'Gruppe: Laufwege kreuzen', [27, 30])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 16,
    description:
      'Freistoß aus dem linken Halbfeld: Die Gruppe startet auf einer Linie und kreuzt die Laufwege – wer außen steht, geht zum ersten Pfosten, wer innen steht, zum zweiten.\n' +
      'So verlieren die Gegenspieler den Kontakt. Ein Spieler bleibt im Rückraum für den zweiten Ball.',
  })
}

function freeKickTwo(name: string): Drill {
  const b = builder(FULL)
  const ball: Pt = [24, 40]
  const dx = -ball[0]
  const dy = MID_Y - ball[1]
  const len = Math.hypot(dx, dy)
  const wall: Pt = [ball[0] + (dx / len) * 9.15, ball[1] + (dy / len) * 9.15]
  const perp: Pt = [-dy / len, dx / len]
  for (const o of [-1.2, -0.4, 0.4, 1.2]) player(b, RED, '', [wall[0] + perp[0] * o, wall[1] + perp[1] * o], { rotation: 180 })
  player(b, BLUE, '', [wall[0] + perp[0] * 2, wall[1] + perp[1] * 2])
  player(b, BLUE, '1', [25.5, 41])
  player(b, BLUE, '2', [25, 44.5])
  team(b, BLUE, [
    ['', 18, 24],
    ['', 19, 29],
    ['', 30, 30],
  ])
  team(b, RED, [
    ['', 16, 25],
    ['', 17, 30],
    ['', 8, 44],
  ], 180)
  keeper(b, [1.5, 33], GREEN)
  addBall(b, ...ball)
  pass(b, ball, [24.5, 44], 'solid', 1)
  shot(b, [24.5, 44.5], [0.5, 37.5])
  note(b, 'Kommando „Zwei“', [32, 44])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 14,
    description:
      'Freistoß zentral, etwa 24 m vor dem Tor, Kommando „Zwei“: Spieler 1 tippt den Ball kurz zur Seite, Spieler 2 schießt direkt an der Mauer vorbei.\n' +
      'Ein eigener Spieler stellt sich ans Ende der Mauer und nimmt dem Torwart die Sicht. Die anderen gehen auf Abpraller.',
  })
}

function freeKickOffside(name: string): Drill {
  const b = builder(FULL)
  const line = 17.5
  for (const y of [18, 24, 29, 34, 39, 44, 49]) player(b, BLUE, '', [line, y])
  team(b, BLUE, [
    ['', 30.5, 47],
    ['', 31, 48.5],
  ])
  keeper(b, [3, 34])
  mark(b, [[line, 12], [line, 56]], 'dashed', YELLOW)
  team(b, RED, [
    ['', 19, 21],
    ['', 19.5, 27],
    ['', 19, 32],
    ['', 19.5, 37],
    ['', 19, 42],
    ['', 20, 47],
  ], 180)
  player(b, RED, '', [37, 55])
  addBall(b, 36, 54)
  run(b, [[line - 0.5, 18], [line + 6, 18]], 'dashed', YELLOW)
  run(b, [[line - 0.5, 49], [line + 6, 49]], 'dashed', YELLOW)
  note(b, 'auf Abseits stellen', [line - 2, 59])
  note(b, 'Mit dem Anlauf des Schützen: alle gleichzeitig raus', [44, 30])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 18,
    description:
      'Verteidigen eines Freistoßes aus dem Halbfeld: Die Kette steht auf einer Linie (gelb) und stellt die Gegner ins Abseits.\n' +
      'Wichtig: Alle Spieler müssen extrem aufmerksam sein. Mit dem Anlauf des Schützen sprinten alle auf ein Kommando gleichzeitig ein paar Meter heraus.',
  })
}

function throwIn(name: string): Drill {
  const b = builder(FULL)
  player(b, BLUE, '', [32, -1])
  addBall(b, 32, -0.2)
  player(b, BLUE, 'A', [31, 6])
  player(b, BLUE, 'B', [27, 12])
  player(b, BLUE, 'C', [36, 15])
  player(b, BLUE, '', [22, 30])
  team(b, RED, [
    ['', 29, 7],
    ['', 24, 11],
    ['', 33, 17],
    ['', 18, 22],
  ], 180)
  pass(b, [32, 0.5], [31, 5], 'solid', 1)
  pass(b, [31, 6], [32.5, 1.5], 'solid', 2)
  flight(b, [[32.5, 1], [24, 2], [17, 5]])
  run(b, [[27, 12], [18, 5]], 'dashed')
  run(b, [[36, 15], [26, 12]], 'dashed')
  note(b, 'A kommt kurz, B startet in den Rücken', [42, 10])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 9,
    description:
      'Einwurf-Variante in der gegnerischen Hälfte: A kommt kurz und lässt direkt zum Einwerfer zurückprallen.\n' +
      'Der Einwerfer spielt den Ball sofort hinter die Abwehr, wo B in den Rücken des Gegenspielers startet. C kreuzt nach innen und zieht einen Verteidiger mit.',
  })
}

function setPieceCounter(name: string): Drill {
  const b = builder(FULL)
  team(b, BLUE, [
    ['', 5.5, 27],
    ['', 5.5, 32],
    ['', 5.5, 37],
    ['', 5.5, 42],
    ['', 1.5, 28],
    ['', 10, 30],
    ['', 11, 38],
    ['', 19, 34],
  ])
  keeper(b, [1.2, 34])
  team(b, BLUE, [
    ['', 42, 18],
    ['', 44, 50],
  ])
  run(b, [[42, 18], [52, 10]], 'dashed', YELLOW)
  run(b, [[44, 50], [52, 58]], 'dashed', YELLOW)
  team(b, RED, [
    ['', 9, 33],
    ['', 11, 41],
    ['', 8, 25],
    ['', 15, 30],
  ], 180)
  player(b, RED, '', [0, 0.5])
  addBall(b, 0.6, 1.2)
  note(b, 'Alle auf den Ball!', [24, 50])
  note(b, 'sofort umschalten auf Konter', [38, 34])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 16,
    description:
      'Verhalten bei gegnerischen Ecken und Freistößen: Alle im Strafraum gehen auf den Ball, einer sichert den Rückraum.\n' +
      'Zwei schnelle Spieler bleiben an der Mittellinie auf den Flügeln. Nach Ballgewinn sofort umschalten: Ball in den Lauf der Konterspieler.',
  })
}

// ---------------------------------------------------------------------------------------
// Team shapes and match plans

const BACK_FOUR: Pos[] = [
  ['LV', 17, 9],
  ['IV', 15, 26],
  ['IV', 15, 42],
  ['RV', 17, 59],
]
const BACK_THREE: Pos[] = [
  ['IV', 15, 18],
  ['IV', 14, 34],
  ['IV', 15, 50],
]

const SHAPES: Record<string, { label: string; positions: Pos[] }> = {
  '4231': {
    label: '4-2-3-1',
    positions: [...BACK_FOUR, ['6', 26, 27], ['6', 26, 41], ['LM', 34, 10], ['10', 36, 34], ['RM', 34, 58], ['ST', 46, 34]],
  },
  '442': {
    label: '4-4-2',
    positions: [...BACK_FOUR, ['LM', 29, 10], ['ZM', 28, 27], ['ZM', 28, 41], ['RM', 29, 58], ['ST', 42, 28], ['ST', 42, 40]],
  },
  '4141': {
    label: '4-1-4-1',
    positions: [...BACK_FOUR, ['6', 24, 34], ['LM', 33, 10], ['8', 32, 26], ['8', 32, 42], ['RM', 33, 58], ['ST', 45, 34]],
  },
  '433': {
    label: '4-3-3',
    positions: [...BACK_FOUR, ['6', 24, 34], ['8', 32, 24], ['8', 32, 44], ['LA', 42, 9], ['ST', 46, 34], ['RA', 42, 59]],
  },
  '343': {
    label: '3-4-3',
    positions: [...BACK_THREE, ['LM', 27, 6], ['ZM', 26, 27], ['ZM', 26, 41], ['RM', 27, 62], ['LA', 40, 14], ['ST', 45, 34], ['RA', 40, 54]],
  },
  '3412': {
    label: '3-4-1-2',
    positions: [...BACK_THREE, ['LM', 27, 6], ['ZM', 26, 27], ['ZM', 26, 41], ['RM', 27, 62], ['10', 36, 34], ['ST', 45, 28], ['ST', 45, 40]],
  },
  '442d': {
    label: '4-4-2 Raute',
    positions: [...BACK_FOUR, ['6', 24, 34], ['8', 30, 18], ['8', 30, 50], ['10', 37, 34], ['ST', 45, 28], ['ST', 45, 40]],
  },
}

/** Team shape in the own half with the defensive funnel and the step-up / waiting lines. */
function teamShape(key: keyof typeof SHAPES) {
  return (name: string): Drill => {
    const b = builder(FULL)
    const { label, positions } = SHAPES[key]
    mark(b, [[5.5, 24.84], [HALF, 1]], 'dashed', GREY)
    mark(b, [[5.5, 43.16], [HALF, 67]], 'dashed', GREY)
    mark(b, [[44, 0], [44, W]], 'dashed', RED)
    mark(b, [[22, 0], [22, W]], 'dashed', BLUE)
    run(b, [[24, -2], [43, -2]], 'solid', RED)
    run(b, [[43, 70], [24, 70]], 'solid', BLUE)
    note(b, 'vorrücken bis hier', [46.5, 8])
    note(b, 'Warteposition: zurückweichen bis hier', [24.5, 52])
    note(b, 'defensiver Trichter: je näher am eigenen Tor, desto enger', [8, 58])
    team(b, BLUE, positions)
    keeper(b, [3, MID_Y])
    text(b, label, [50, 34], 1)
    return half(name, b, {
      area: 'tactic',
      category: 'tactics',
      players: 11,
      description:
        `Grundordnung ${label} gegen den Ball: Die Mannschaft rückt im Verbund bis zur roten Linie vor und weicht bei Ballverlust höchstens bis zur blauen Linie (Warteposition) zurück.\n` +
        'Defensiver Trichter (graue Linien): Je näher am eigenen Tor, desto enger steht die Mannschaft zusammen. Namen und Nummern direkt bei den Spielern eintragen.',
    })
  }
}

function midfieldBlock(name: string): Drill {
  const b = builder(FULL)
  rect(b, 30, 3, 62, W - 3, { color: WHITE, fillColor: WHITE, fillOpacity: 0.18, dashed: true, label: 'MF-Pressing-Block' })
  mark(b, [[HALF, 0], [HALF, W]], 'dashed', RED)
  team(b, BLUE, [
    ['LV', 33, 10],
    ['IV', 32, 27],
    ['IV', 32, 41],
    ['RV', 33, 58],
    ['LM', 44, 9],
    ['ZM', 43, 26],
    ['ZM', 43, 42],
    ['RM', 44, 59],
    ['ST', 56, 28],
    ['ST', 56, 40],
  ])
  keeper(b, [12, MID_Y])
  team(b, RED, [
    ['', 18, 22],
    ['', 18, 46],
    ['', 28, 6],
    ['', 28, 62],
    ['', 36, 34],
  ], 0)
  addBall(b, 19, 23)
  note(b, 'Abstand der Ketten 8–10 m', [66, 52])
  text(b, 'Pressinglinie', [55, 63], 0.5)
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 16,
    description:
      'Mittelfeld-Pressing im 4-4-2: Die Mannschaft steht kompakt in einem Block (markierte Fläche), die Stürmer warten an der Mittellinie.\n' +
      'Gepresst wird erst, wenn der Gegner über die Pressinglinie spielt oder ein Auslöser kommt (schlechter Pass, Ball zum Außenverteidiger, Rückpass).',
  })
}

function shapeZones(name: string): Drill {
  const b = builder(FULL)
  rect(b, 0, SIDE_L, PA_NEAR, SIDE_R, { color: GREEN, fillColor: GREEN, fillOpacity: 0.3, label: 'Box defensiv' })
  rect(b, PITCH.length - PA_NEAR, SIDE_L, PITCH.length, SIDE_R, { color: YELLOW, fillColor: YELLOW, fillOpacity: 0.3, label: 'Box offensiv' })
  b.zones.push({
    id: `zone-tpl-z${b.zones.length + 1}`,
    shape: 'ellipse',
    x: HALF,
    y: MID_Y,
    width: 46,
    height: 34,
    rotation: 0,
    color: RED,
    fillColor: RED,
    fillOpacity: 0.08,
    dashed: true,
    label: 'Zentrum',
    goals: 0,
    corners: null,
  })
  for (const y of [11, W - 11]) mark(b, [[PA_NEAR, y], [PITCH.length - PA_NEAR, y]], 'dashed')
  text(b, 'Außenzone', [70, 5], 0.55, -90)
  text(b, 'Außenzone', [70, W - 5], 0.55, 90)
  text(b, 'Halbfeld', [30, 18], 0.55)
  text(b, 'Halbfeld', [30, 50], 0.55)
  text(b, 'Halbfeld', [75, 18], 0.55)
  text(b, 'Halbfeld', [75, 50], 0.55)
  team(b, BLUE, [
    ['LV', 24, 9],
    ['IV', 20, 26],
    ['IV', 20, 42],
    ['RV', 24, 59],
    ['6', 38, 27],
    ['6', 38, 41],
    ['LM', 56, 10],
    ['10', 58, 34],
    ['RM', 56, 58],
    ['ST', 76, 34],
  ])
  keeper(b, [4, MID_Y])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Die Zonen der Grundordnung: Box defensiv und offensiv (Strafräume), Zentrum um den Mittelkreis, vier Halbfelder und die beiden Außenzonen.\n' +
      'Jeder Spieler kennt seine Zone mit und gegen den Ball. Grundlage für Besprechungen: Wer verteidigt welche Zone, wer besetzt sie im Ballbesitz?',
  })
}

function pressingLines(name: string): Drill {
  const b = builder(FULL)
  const lines: [number, string][] = [
    [80, 'Angriffspressing'],
    [60, 'MF-Pressinglinie 1'],
    [40, 'ABW-Pressinglinie 2'],
    [22, 'Rückzugslinie ca. 22 m'],
  ]
  for (const [x, label] of lines) {
    mark(b, [[x, 0], [x, W]], 'dashed', RED)
    note(b, label, [x + 1.8, 9])
  }
  rect(b, 45, 18, 64, 50, { color: YELLOW, fillColor: YELLOW, fillOpacity: 0.25 })
  mark(b, [[2, 30], [40, 3]], 'dashed', BLUE)
  mark(b, [[2, 38], [40, 65]], 'dashed', BLUE)
  team(b, BLUE, [
    ['LV', 38, 10],
    ['IV', 36, 26],
    ['IV', 36, 42],
    ['RV', 38, 58],
    ['6', 47, 28],
    ['6', 47, 40],
    ['LM', 55, 12],
    ['10', 57, 34],
    ['RM', 55, 56],
    ['ST', 66, 34],
  ])
  keeper(b, [10, MID_Y])
  note(b, 'Grundordnung 4-3-3 → MF-Pressing 4-2-3-1 → ultra-defensiv 4-5-1', [94, 34])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Orientierung gegen den Ball mit vier Linien: Angriffspressing, Mittelfeld-Pressinglinie, Abwehr-Pressinglinie und Rückzugslinie bei etwa 22 m.\n' +
      'Aus der Grundordnung 4-3-3 wird im Mittelfeldpressing ein 4-2-3-1, tief verteidigt ein 4-5-1. Der defensive Trichter (blau) wird zum eigenen Tor hin enger.',
  })
}

function thirdsFreedom(name: string): Drill {
  const b = builder(FULL)
  for (const x of [35, 70]) mark(b, [[x, 0], [x, W]], 'dashed', RED)
  for (const y of [SIDE_L, 27.9, 40.1, SIDE_R]) mark(b, [[0, y], [70, y]], 'dashed', BLUE)
  rect(b, 70, 0.5, PITCH.length - 0.5, W - 0.5, { color: YELLOW, fillColor: YELLOW, fillOpacity: 0.2 })
  for (const [x, label] of [
    [17, '1/3'],
    [52, '2/3'],
    [87, '3/3'],
  ] as const)
    marker(b, label, [x, -2], YELLOW)
  team(b, BLUE, [
    ['IV', 14, 24],
    ['IV', 14, 44],
    ['LV', 30, 1.5],
    ['RV', 30, 66.5],
    ['6', 28, 34],
    ['8', 46, 22],
    ['8', 46, 46],
    ['LA', 62, 1.5],
    ['RA', 62, 66.5],
    ['ST', 66, 34],
  ])
  keeper(b, [3, MID_Y])
  note(b, '„Freedom“ im letzten Drittel: alle Freiheiten', [88, 34])
  note(b, '1. und 2. Drittel: positionstreu im Ballbesitz', [30, 34])
  note(b, 'auf der Kalkposition (breit an der Linie)', [72, 10])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Ballbesitz in Dritteln: Im ersten und zweiten Drittel bleibt jeder auf seiner Position, die Außen stehen auf der Kalkposition (ganz breit an der Linie).\n' +
      'Im letzten Drittel gilt „Freedom“: alle Freiheiten (Kreuzen, Hinterlaufen, Dribbling). Die fünf Korridore helfen beim Besetzen der Räume.',
  })
}

function lanesAndZones(name: string): Drill {
  const b = builder(FULL)
  for (const y of [SIDE_L, 27.9, 40.1, SIDE_R]) mark(b, [[0, y], [PITCH.length, y]], 'dashed', GREEN)
  for (const x of [PA_NEAR, 35, HALF, 70, PITCH.length - PA_NEAR]) mark(b, [[x, 0], [x, W]], 'dashed', RED)
  rect(b, 55, 3, 75, W - 3, { color: PURPLE, fillColor: PURPLE, fillOpacity: 0.25, label: 'Pressingbereich' })
  for (const [y, label] of [
    [7, 'AZ'],
    [20.9, 'HRZ'],
    [34, 'ZZ'],
    [47.1, 'HRZ'],
    [61, 'AZ'],
  ] as const)
    text(b, label, [PITCH.length + 2, y], 0.5)
  for (const [x, label] of [
    [8, 'Abschlusszone'],
    [26, 'Übergangszone'],
    [44, 'Mittelzone'],
    [61, 'Mittelzone'],
    [79, 'Übergangszone'],
    [97, 'Abschlusszone'],
  ] as const)
    text(b, label, [x, -2.5], 0.45)
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: null,
    description:
      'Spielfeldeinteilung für die Besprechung: 5 Längszonen (2 Außenzonen AZ, 2 Halbraumzonen HRZ, Zentrumszone ZZ) und 6 Querzonen (2 Abschluss-, 2 Übergangs-, 2 Mittelzonen).\n' +
      'Die violette Fläche zeigt den Pressingbereich, in dem die Mannschaft den Gegner stellt.',
  })
}

function squadPlan(name: string): Drill {
  const b = builder(FULL)
  const positions: Pos[] = [
    ['1', 4, 34],
    ['3', 20, 10],
    ['4', 17, 26],
    ['5', 17, 42],
    ['2', 20, 58],
    ['6', 31, 34],
    ['8', 42, 24],
    ['10', 42, 44],
    ['11', 56, 10],
    ['9', 62, 34],
    ['7', 56, 58],
  ]
  for (const [label, x, y] of positions) {
    player(b, label === '1' ? YELLOW : BLUE, label, [x, y], { name: '…' })
  }
  note(b, 'Kaderplanung 4-3-3', [80, 34])
  text(b, 'Zugänge:', [74, 12], 0.55)
  text(b, 'Abgänge:', [74, 56], 0.55)
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Kaderplanung: Die Positionen 1–11 im 4-3-3 mit Namensschildern zum Ausfüllen (Spieler antippen → Name).\n' +
      'Neben die Positionen passen die Alternativen als Text; unten Zugänge und Abgänge. Mit „Mannschaft → Aufstellen“ lassen sich auch Spieler aus dem Kader setzen.',
  })
}

function sevenOutThreeIn(name: string): Drill {
  const b = builder(FULL)
  b.zones.push({
    id: `zone-tpl-z${b.zones.length + 1}`,
    shape: 'ellipse',
    x: 38,
    y: MID_Y,
    width: 22,
    height: 22,
    rotation: 0,
    color: GREEN,
    fillColor: GREEN,
    fillOpacity: 0.15,
    dashed: true,
    label: '',
    goals: 0,
    corners: null,
  })
  team(b, BLUE, [
    ['LIV', 16, 20],
    ['ZIV', 14, 34],
    ['RIV', 16, 48],
    ['LV', 42, 2.5],
    ['RV', 42, 65.5],
    ['6', 32, 34],
    ['8', 40, 28],
    ['10', 40, 40],
    ['ST', 64, 26],
    ['ST', 64, 42],
  ])
  keeper(b, [3, MID_Y])
  run(b, [[32.5, 33], [39, 28.5]], 'dashed', GREEN)
  run(b, [[40, 29], [40, 39]], 'dashed', GREEN)
  run(b, [[39.5, 40.5], [33, 35]], 'dashed', GREEN)
  run(b, [[42, 65.5], [62, 65.5]], 'dashed', RED)
  note(b, 'Rotation der 3 im Zentrum (6-8-10)', [52, 34])
  note(b, '7 außen, 3 innen: Dreiecke mit und gegen den Ball', [80, 34])
  note(b, 'asymmetrisch auf den Rahmen', [52, 62])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Grundordnung 3-4-1-2 mit „7 außen, 3 innen“: Sieben Spieler halten die Breite und die Linien, drei Spieler im Zentrum (6-8-10) rotieren im grünen Kreis.\n' +
      'Über Dreiecksbildung mit und gegen den Ball bleibt das Zentrum besetzt. Ein Außenverteidiger schiebt asymmetrisch hoch, die Stürmer besetzen beide Halbräume.',
  })
}

// ---------------------------------------------------------------------------------------
// Build-up and team drills

const DUMMIES: Pt[] = [
  [20, 18],
  [20, 26],
  [20, 42],
  [20, 50],
  [31, 34],
]

function systemBase(b: Builder): void {
  addGoal(b, 'goal', 0, MID_Y, 0)
  keeper(b, [1.5, MID_Y], GREEN)
  for (const [x, y] of DUMMIES) addItem(b, 'dummy', x, y, { size: 1.5, rotation: 180 })
}

function systemDrill(name: string, b: Builder, description: string): Drill {
  return half(name, b, { area: 'drill', category: 'tactics', players: 8, description })
}

function systemAction1(name: string): Drill {
  const b = builder(FULL)
  systemBase(b)
  team(b, BLUE, [
    ['6', 48, 34],
    ['LA', 38, 7],
    ['ST', 28, 34],
    ['RA', 36, 61],
    ['10', 38, 30],
  ])
  addBall(b, 47, 34)
  pass(b, [48, 34], [38.5, 8], 'solid', 1)
  dribble(b, [[38, 7], [16, 6]])
  flight(b, [[15, 6], [9, 20], [6, 30]])
  run(b, [[28, 34], [7, 29]], 'dashed')
  run(b, [[36, 61], [8, 41]], 'dashed')
  run(b, [[38, 30], [14, 34]], 'dashed')
  return systemDrill(
    name,
    b,
    'Systemübung Offensive, Aktion 1: Der Sechser spielt auf den linken Flügel, der dribbelt bis zur Grundlinie und flankt.\n' +
      'Stürmer an den kurzen Pfosten, rechter Flügel an den langen Pfosten, der Zehner in den Rückraum. Die Stangen sind die Abwehr. Danach Sprint zur Startposition.',
  )
}

function systemAction2(name: string): Drill {
  const b = builder(FULL)
  systemBase(b)
  team(b, BLUE, [
    ['6', 48, 34],
    ['LA', 36, 7],
    ['ST', 26, 34],
    ['RA', 34, 60],
    ['10', 36, 28],
  ])
  addBall(b, 47, 34)
  pass(b, [48, 34], [27, 34], 'solid', 1)
  pass(b, [26, 34], [34, 29], 'solid', 2)
  pass(b, [35, 29], [12, 47], 'solid', 3)
  run(b, [[34, 60], [12, 48]], 'dashed')
  shot(b, [11, 47], [0.5, 37])
  run(b, [[36, 7], [10, 24]], 'dashed')
  return systemDrill(
    name,
    b,
    'Systemübung Offensive, Aktion 2: Vertikaler Pass auf den Stürmer, der klatschen lässt (Wandspiel) auf den Zehner.\n' +
      'Der Zehner spielt den Steilpass in den Lauf des rechten Flügels hinter die Abwehr, Abschluss. Der linke Flügel geht auf den Abpraller.',
  )
}

function systemAction3(name: string): Drill {
  const b = builder(FULL)
  systemBase(b)
  team(b, BLUE, [
    ['6', 48, 34],
    ['RA', 32, 58],
    ['RV', 42, 65],
    ['ST', 26, 34],
    ['LA', 34, 9],
  ])
  addBall(b, 47, 34)
  pass(b, [48, 34], [33, 57], 'solid', 1)
  dribble(b, [[32, 58], [26, 50]])
  run(b, [[42, 65], [14, 63]], 'dashed')
  pass(b, [26, 50], [14, 62], 'solid', 2)
  flight(b, [[13, 62], [9, 50], [7, 38]])
  run(b, [[26, 34], [7, 37]], 'dashed')
  run(b, [[34, 9], [9, 28]], 'dashed')
  return systemDrill(
    name,
    b,
    'Systemübung Offensive, Aktion 3: Pass auf den rechten Flügel, der nach innen dribbelt und den Gegenspieler mitzieht.\n' +
      'Der Außenverteidiger hinterläuft und bekommt den Ball auf die Außenbahn, Flanke auf Stürmer und linken Flügel.',
  )
}

function systemAction4(name: string): Drill {
  const b = builder(FULL)
  systemBase(b)
  team(b, BLUE, [
    ['6', 48, 34],
    ['LA', 34, 8],
    ['10', 34, 30],
    ['RA', 32, 60],
    ['ST', 26, 38],
  ])
  addBall(b, 47, 34)
  pass(b, [48, 34], [35, 9], 'solid', 1)
  pass(b, [34, 8], [34, 29], 'solid', 2)
  flight(b, [[34, 30], [36, 46], [28, 60]])
  run(b, [[32, 60], [27, 61]], 'dashed')
  flight(b, [[27, 61], [14, 52], [7, 36]])
  run(b, [[26, 38], [7, 35]], 'dashed')
  run(b, [[34, 8], [10, 26]], 'dashed')
  note(b, 'Sprint zur Startposition', [44, 56])
  return systemDrill(
    name,
    b,
    'Systemübung Offensive, Aktion 4: Über links und den Zehner verlagern – Seitenwechsel auf den rechten Flügel, der direkt flankt.\n' +
      'Stürmer und linker Flügel attackieren den Strafraum. Danach alle im Sprint zurück zur Startposition.',
  )
}

function buildUp433(name: string): Drill {
  const b = builder(FULL)
  team(b, BLUE, [
    ['IV', 12, 22],
    ['IV', 12, 46],
    ['LV', 28, 4],
    ['RV', 28, 64],
    ['6', 22, 34],
    ['8', 38, 24],
    ['8', 38, 44],
    ['LA', 55, 6],
    ['ST', 58, 34],
    ['RA', 55, 62],
  ])
  keeper(b, [3, MID_Y])
  addBall(b, 4, 35)
  mark(b, [[35, 0], [35, W]], 'dashed', RED)
  pass(b, [3, 34], [11.5, 22], 'solid', 1)
  pass(b, [12, 22], [27.5, 4.5], 'solid', 2)
  pass(b, [28, 4], [37.5, 23.5], 'solid', 3)
  run(b, [[28, 4], [46, 3]], 'dashed')
  run(b, [[55, 6], [62, 16]], 'dashed')
  run(b, [[38, 44], [50, 42]], 'dashed')
  run(b, [[22, 34], [28, 30]], 'dashed')
  note(b, 'Gegenpressing-Linie', [36.8, 56])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 11,
    description:
      'Spieleröffnung im 4-3-3: Torspieler → Innenverteidiger → Außenverteidiger → Achter im Halbraum.\n' +
      'Die Außenverteidiger stehen hoch und breit, die Flügel ziehen nach innen, der Sechser bietet sich zwischen den Innenverteidigern an. Bei Ballverlust Gegenpressing bis zur roten Linie.',
  })
}

function buildUp4231(name: string): Drill {
  const b = builder(FULL)
  team(b, BLUE, [
    ['LV', 26, 4],
    ['IV', 12, 22],
    ['IV', 12, 46],
    ['RV', 26, 64],
    ['6', 22, 30],
    ['6', 30, 40],
    ['LM', 46, 8],
    ['10', 46, 34],
    ['RM', 46, 60],
    ['ST', 62, 34],
  ])
  keeper(b, [3, MID_Y])
  team(b, RED, [
    ['', 22, 26],
    ['', 22, 42],
    ['', 34, 12],
    ['', 34, 28],
    ['', 34, 44],
    ['', 34, 56],
  ], 180)
  addBall(b, 13, 23)
  run(b, [[22, 30], [16, 34]], 'dashed', BLACK)
  pass(b, [12, 22], [25.5, 4.5], 'solid', 2)
  run(b, [[46, 8], [40, 18]], 'dashed', BLUE)
  run(b, [[46, 34], [54, 24]], 'dashed', BLUE)
  marker(b, '1', [18, 38], BLACK)
  marker(b, '2', [18, 10], BLUE)
  marker(b, '3', [44, 22], BLUE)
  note(b, '1 Laufweg vor der Spieleröffnung · 2 Passweg · 3 Laufweg neue Situation', [80, 34])
  return full(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 17,
    description:
      'Spieleröffnung aus dem 4-2-3-1 gegen ein 4-4-2-Pressing: (1) Ein Sechser kippt zwischen die Innenverteidiger ab, (2) der Pass geht auf den Außenverteidiger, (3) Flügel und Zehner reagieren mit neuen Laufwegen.\n' +
      'Die Nummern auf dem Feld zeigen die Reihenfolge.',
  })
}

function buildUpVsMidPress(name: string): Drill {
  const b = builder(FULL)
  addGoal(b, 'goal', 0, MID_Y, 0)
  keeper(b, [1.5, MID_Y])
  team(b, BLUE, [
    ['', 12, 18],
    ['', 12, 50],
    ['', 22, 34],
    ['', 30, 8],
    ['', 30, 60],
    ['', 42, 34],
  ])
  team(b, RED, [
    ['', 20, 24],
    ['', 20, 44],
    ['', 33, 16],
    ['', 33, 52],
    ['', 36, 34],
    ['', 48, 30],
  ], 180)
  mark(b, [[HALF, 0], [HALF, W]], 'dashed', RED)
  mark(b, [[15, 0], [15, W]], 'dashed', BLUE)
  coach(b, [60, 14])
  coach(b, [60, 54])
  addBall(b, 3, 36)
  pass(b, [12, 50], [29.5, 59.5], 'solid', 1)
  pass(b, [30, 60], [59, 54], 'solid', 2)
  note(b, 'Flachpass zum Trainer: 3 Punkte · Dribbling über die Mittellinie: 1 Punkt', [70, 34])
  note(b, 'Pressingbegrenzung', [16.6, 60])
  return full(name, b, {
    area: 'drill',
    category: 'game',
    players: 13,
    fieldSize: 'Halbfeld mit Großtor',
    description:
      'Spielaufbau 6 + TW gegen 6 gegen Mittelfeldpressing: Blau baut von hinten auf und spielt einen Flachpass zu einem der Trainer an der Mittellinie (3 Punkte) oder dribbelt über die Mittellinie (1 Punkt).\n' +
      'Rot presst erst ab der blauen Linie. Nach Ballgewinn hat Rot 10–15 Sekunden für den Torabschluss.',
  })
}

function sidelineDiagonal(name: string): Drill {
  const b = builder(FULL)
  addGoal(b, 'goal', 0, MID_Y, 0)
  keeper(b, [1.5, MID_Y], GREEN)
  team(b, BLUE, [
    ['AV', 36, 4],
    ['LA', 28, 8],
    ['10', 27, 32],
    ['ST', 18, 30],
    ['RA', 24, 56],
  ])
  team(b, RED, [
    ['', 24, 10],
    ['', 14, 26],
    ['', 14, 40],
    ['', 20, 48],
    ['', 30, 26],
  ], 180)
  addBall(b, 35, 5)
  flight(b, [[35, 5], [24, 2], [14, 7]])
  run(b, [[28, 8], [14, 6]], 'dashed')
  run(b, [[36, 4], [24, 1]], 'dashed', YELLOW)
  run(b, [[18, 30], [8, 28]], 'dashed')
  note(b, 'Option 1: Chipball hinter die Kette', [10, 16])
  note(b, 'Option 2: Hinterlaufen', [40, 12])
  return half(name, b, {
    area: 'tactic',
    category: 'tactics',
    players: 12,
    description:
      'Ausnutzen der 2:1-Situation an der Seitenlinie: Außenverteidiger und Flügel gegen einen Gegenspieler.\n' +
      'Option 1: Der Flügel startet in die Tiefe, der Außenverteidiger chippt den Ball diagonal hinter die Kette. Option 2: Der Außenverteidiger hinterläuft und bekommt den Ball. Stürmer greift den kurzen Pfosten an.',
  })
}

// ---------------------------------------------------------------------------------------
// Training forms

function tenVsFour(name: string): Drill {
  const area = { length: 40, width: 30 }
  const b = builder(area)
  rect(b, 15, 0, 25, 30, { color: SKY_LINE, fillColor: SKY_LINE, fillOpacity: 0.3, dashed: true })
  team(b, WHITE, [
    ['', 2, 5],
    ['', 3, 15],
    ['', 2, 25],
    ['', 9, 9],
    ['', 9, 21],
  ])
  team(b, RED, [
    ['', 38, 5],
    ['', 37, 15],
    ['', 38, 25],
    ['', 31, 9],
    ['', 31, 21],
  ])
  team(b, BLUE, [
    ['', 18, 9],
    ['', 18, 21],
    ['', 22, 13],
    ['', 22, 17],
  ])
  addBall(b, 3, 15)
  pass(b, [3, 15], [8.5, 9.5], 'solid', 1)
  pass(b, [9, 9], [30.5, 20.5], 'solid', 2)
  run(b, [[9, 21], [19, 24]], 'dashed')
  note(b, 'Durchbruch durchs Zentrum', [20, -2])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 14,
    pitch: GRASS,
    description:
      'Aus dem Ballbesitz angreifen – 10 gegen 4: Weiß und Rot (je 5) spielen sich den Ball durch das blaue Zentrum zu, die 4 Verteidiger in der Mitte versuchen ihn abzufangen.\n' +
      'Schneller Übergang! Ein Spieler darf nach dem Pass durchs Zentrum mitlaufen. Nach Ballgewinn spielen die Verteidiger schnell auf eine Seite, die verliert, geht in die Mitte.',
  })
}


function parcours4x4(name: string): Drill {
  const area = { length: 50, width: 34 }
  const b = builder(area)
  addOutlineCones(b, area)
  for (let i = 0; i < 6; i++) cone(b, [8 + i * 3, i % 2 ? 4 : 7])
  for (let i = 0; i < 5; i++) addItem(b, 'pole', 44, 6 + i * 4, { size: b.k })
  for (let i = 0; i < 4; i++) addItem(b, 'hurdle', 18 + i * 4, 30, { size: b.k, rotation: 90 })
  addItem(b, 'ladder', 6, 20, { size: b.k, rotation: 90 })
  for (const [label, p] of [
    ['1', [8, 1.5]],
    ['2', [44, 1.5]],
    ['3', [32, 30]],
    ['4', [6, 12]],
  ] as const)
    marker(b, label, [p[0], p[1]], RED)
  run(b, [[25, 5], [41, 5]], 'dashed')
  run(b, [[46, 25], [40, 30]], 'dashed')
  run(b, [[14, 30], [6, 27]], 'dashed')
  run(b, [[6, 13], [6, 8]], 'dashed')
  team(b, YELLOW, [
    ['', 5, 5],
    ['', 44, 28],
    ['', 30, 31.5],
    ['', 6, 24],
  ])
  note(b, '4 × 4 Minuten Parcours, 3 Minuten Pause', [25, 17])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'warmup',
    players: 4,
    pitch: GRASS,
    description:
      '4×4-Parcours mit vier Stationen: (1) Slalom um die Hütchen, (2) Slalom durch die Stangen, (3) Hürdensprünge, (4) Koordinationsleiter. Dazwischen im Tempo laufen.\n' +
      '4 Minuten im Parcours (ca. 90–95 % der maximalen Herzfrequenz), 3 Minuten aktive Pause, 4 Durchgänge.',
  })
}

function addOutlineCones(b: Builder, area: { length: number; width: number }): void {
  for (const [x, y] of [
    [0, 0],
    [area.length, 0],
    [0, area.width],
    [area.length, area.width],
  ])
    cone(b, [x, y])
}

function tabata(name: string): Drill {
  const area = { length: 40, width: 28 }
  const b = builder(area)
  marker(b, '1', [4, 3])
  team(b, YELLOW, [
    ['', 6, 7],
    ['', 9, 7],
    ['', 12, 7],
  ])
  marker(b, '2', [24, 3])
  cone(b, [26, 6])
  cone(b, [36, 6])
  run(b, [[27, 7.5], [35, 7.5]], 'solid', RED)
  run(b, [[35, 9], [27, 9]], 'solid', RED)
  team(b, BLUE, [
    ['', 26, 10.5],
    ['', 26, 13],
  ])
  marker(b, '3', [4, 16])
  addItem(b, 'ladder', 10, 22, { size: b.k })
  team(b, YELLOW, [['', 3, 22]])
  marker(b, '4', [24, 16])
  addItem(b, 'hurdle', 28, 22, { size: b.k, rotation: 90 })
  addItem(b, 'hurdle', 32, 22, { size: b.k, rotation: 90 })
  team(b, YELLOW, [['', 24, 22]])
  note(b, 'Burpees / Hochstrecksprung', [9, 11])
  note(b, 'Sprint 10 m hin und zurück', [31, 13.5])
  note(b, 'Koordinationsleiter', [10, 26])
  note(b, 'Hürden: beidbeinig', [30, 26])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'warmup',
    players: 7,
    pitch: GRASS,
    description:
      'Tabata-Stationen: An jeder Station 8 × 20 Sekunden Belastung, 10 Sekunden Pause (4 Minuten), dann Wechsel.\n' +
      '(1) Burpees mit Hochstrecksprung, (2) Sprint 10 m hin und zurück, (3) Koordinationsleiter, (4) beidbeinige Sprünge über die Hürden.',
  })
}

function murderball(name: string): Drill {
  const b = builder(FULL)
  addGoal(b, 'goal', 0, MID_Y, 0)
  addGoal(b, 'goal', PITCH.length, MID_Y, 180)
  team(b, GREEN, [
    ['LV', 18, 10],
    ['IV', 15, 26],
    ['IV', 15, 42],
    ['RV', 18, 58],
    ['6', 28, 34],
    ['8', 38, 24],
    ['8', 38, 44],
    ['LA', 50, 8],
    ['ST', 54, 34],
    ['RA', 50, 60],
  ])
  keeper(b, [2, MID_Y])
  team(b, BLUE, [
    ['', 87, 10],
    ['', 90, 26],
    ['', 90, 42],
    ['', 87, 58],
    ['', 77, 28],
    ['', 77, 40],
    ['', 64, 10],
    ['', 66, 34],
    ['', 64, 58],
    ['', 58, 30],
  ], 180)
  keeper(b, [103, MID_Y])
  coach(b, [HALF, -2.5])
  coach(b, [HALF, W + 2.5])
  addBall(b, HALF + 1.5, -2.5)
  addBall(b, HALF + 1.5, W + 2.5)
  note(b, 'Vollgas! Ball aus → Trainer bringt sofort einen neuen Ball', [HALF, 18])
  return full(name, b, {
    area: 'drill',
    category: 'game',
    players: 22,
    description:
      '„Mörderball“: 4-3-3 gegen 4-2-3-1 auf dem Großfeld, 4–6 × 5 Minuten oder 1 × 20 Minuten. Von 5 gegen 5 bis 11 gegen 11 möglich.\n' +
      'Vollgas, keine Unterbrechung, kein Foul, kein Elfer: Geht der Ball aus, bringt der Trainer sofort einen neuen. Jeder bleibt in seiner Position, Vollsprint in den Angriff, sofort Gegenpressing.',
  })
}

function hexagon(name: string): Drill {
  const area = { length: 30, width: 30 }
  const b = builder(area)
  const corners: Pt[] = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i
    return [15 + 11 * Math.cos(a), 15 + 11 * Math.sin(a)]
  })
  for (const p of corners) cone(b, p)
  for (const [i, [x, y]] of corners.entries()) player(b, i % 2 ? RED : YELLOW, '', [x + (x - 15) * 0.15, y + (y - 15) * 0.15])
  player(b, BLUE, '', [15, 15])
  addBall(b, 28, 15)
  for (let i = 0; i < 3; i++) {
    const from = corners[i * 2]
    pass(b, from, [15, 15], 'solid', i * 2 + 1)
    pass(b, [15, 15], corners[i * 2 + 1], 'solid', i * 2 + 2)
  }
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 13,
    pitch: GRASS,
    description:
      'Hexagon-Passform: Sechs Hütchen im Sechseck (11 m vom Mittelpunkt), an jedem Hütchen ein Spieler, in der Mitte ein Wandspieler.\n' +
      'Ablauf: Pass in die Mitte, Wandspieler prallen lassen auf das nächste Hütchen, dem Pass nachlaufen. Varianten: direkt, mit Aufdrehen, gegen einen Gegenspieler (5 gegen 3 / 3 gegen 2).',
  })
}

function transitionRondo4v1(name: string): Drill {
  const area = { length: 24, width: 24 }
  const b = builder(area)
  mark(b, [[12, 0], [12, 24]], 'dashed')
  mark(b, [[0, 12], [24, 12]], 'dashed')
  const fields: [string, number, number][] = [
    [GREEN, 0, 0],
    [RED, 12, 0],
    [WHITE, 0, 12],
    [BLUE, 12, 12],
  ]
  for (const [color, x0, y0] of fields) {
    team(b, color, [
      ['', x0 + 1.5, y0 + 1.5],
      ['', x0 + 10.5, y0 + 1.5],
      ['', x0 + 1.5, y0 + 10.5],
      ['', x0 + 10.5, y0 + 10.5],
    ])
  }
  player(b, BLACK, '', [6, 6])
  player(b, BLACK, '', [18, 18])
  addBall(b, 2.5, 1.5)
  pass(b, [1.5, 1.5], [10, 1.5], 'solid', 1)
  pass(b, [10.5, 2], [10.5, 10], 'solid', 2)
  pass(b, [10, 10.5], [2, 10.5], 'solid', 3)
  pass(b, [2, 10], [9.5, 2.5], 'solid', 4)
  run(b, [[6, 6], [17, 6]], 'dashed', BLACK)
  note(b, '4 Pässe, dann Übergang ins nächste Feld', [12, -1.5])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 18,
    pitch: GRASS,
    description:
      'Übergangsrondo 4 gegen 1 (oder 4 gegen 2) auf vier Feldern: In jedem Feld spielen vier Spieler gegen einen Verteidiger.\n' +
      'Nach 4 Pässen wechselt der Verteidiger ins nächste Feld (Übergang). Bei Ballgewinn tauscht er mit dem Spieler, der den Ball verloren hat. 16 Minuten, alle 2 Minuten Wechsel.',
  })
}

function eightPlusTwo(name: string): Drill {
  const area = { length: 40, width: 30 }
  const b = builder(area)
  mark(b, [[20, 0], [20, 30]], 'dashed')
  mark(b, [[0, 15], [40, 15]], 'dashed')
  team(b, BLUE, [
    ['', 3, 3],
    ['', 15, 5],
    ['', 8, 12],
    ['', 25, 3],
    ['', 36, 10],
    ['', 5, 25],
    ['', 30, 20],
    ['', 36, 27],
  ])
  team(b, RED, [
    ['', 7, 6],
    ['', 13, 10],
    ['', 26, 8],
    ['', 32, 5],
    ['', 10, 20],
    ['', 15, 26],
    ['', 27, 24],
    ['', 33, 18],
  ])
  team(b, BLACK, [
    ['', 20, 9],
    ['', 20, 22],
  ])
  addBall(b, 4, 3.5)
  pass(b, [3, 3], [14.5, 5], 'solid', 1)
  pass(b, [15, 5], [19.5, 8.5], 'solid', 2)
  pass(b, [20, 9], [24.5, 3.5], 'solid', 3)
  note(b, 'maximal 4 gegen 4 in einem Feld', [20, -1.5])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 18,
    pitch: GRASS,
    description:
      'Übergangsform 8 + 2 gegen 8 auf vier Feldern: Blau mit den zwei schwarzen Jokern hält den Ball gegen Rot.\n' +
      'Nach 4 Pässen in einem Feld muss der Ball ins nächste Feld (Übergang). In einem Feld höchstens 4 gegen 4. 16 Minuten, alle 2 Minuten Wechsel.',
  })
}

function positionalFormats(name: string): Drill {
  const area = { length: 86, width: 34 }
  const b = builder(area)
  const fields: { x0: number; l: number; w: number; label: string; a: Pt[]; c: Pt[]; n: Pt[] }[] = [
    {
      x0: 1,
      l: 17,
      w: 13,
      label: '4:4 + 3 · 17 × 13 m',
      a: [[3, 3], [16, 3], [3, 10], [16, 10]],
      c: [[7, 5], [12, 5], [7, 8], [12, 8]],
      n: [[1, 6.5], [18, 6.5], [9.5, 6.5]],
    },
    {
      x0: 22,
      l: 25,
      w: 20,
      label: '5:5 + 1 · 25 × 20 m',
      a: [[25, 3], [44, 3], [25, 17], [44, 17], [34.5, 6]],
      c: [[29, 7], [40, 7], [29, 13], [40, 13], [34.5, 14]],
      n: [[34.5, 10]],
    },
    {
      x0: 50,
      l: 35,
      w: 30,
      label: '8:8 + 3 · 35 × 30 m',
      a: [[53, 3], [66, 3], [80, 3], [53, 15], [80, 15], [53, 27], [66, 27], [80, 27]],
      c: [[58, 8], [66, 8], [75, 8], [58, 15], [75, 15], [58, 22], [66, 22], [75, 22]],
      n: [[50, 15], [85, 15], [67.5, 15]],
    },
  ]
  for (const f of fields) {
    rect(b, f.x0, 0, f.x0 + f.l, f.w, { dashed: true })
    note(b, f.label, [f.x0 + f.l / 2, f.w + 2])
    team(b, BLUE, f.a.map(([x, y]) => ['', x, y]))
    team(b, WHITE, f.c.map(([x, y]) => ['', x, y]))
    team(b, YELLOW, f.n.map(([x, y]) => ['', x, y]))
  }
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: null,
    fieldSize: '17 × 13, 25 × 20 und 35 × 30 m',
    outline: false,
    pitch: GRASS,
    description:
      'Positionsspiel-Formate nebeneinander: 4 gegen 4 + 3 Neutrale (17 × 13 m), 5 gegen 5 + 1 (25 × 20 m) und 8 gegen 8 + 3 (35 × 30 m).\n' +
      'Die Neutralen (gelb) spielen immer mit der ballbesitzenden Mannschaft. Ziel: Ball halten, Dreiecke bilden, den freien Mann finden.',
  })
}

function sixVsSixThreeGoals(name: string): Drill {
  const area = { length: 45, width: 35 }
  const b = builder(area)
  for (const y of [7, 17.5, 28]) addGoal(b, 'minigoal', 0, y, 0, 1.3)
  mark(b, [[area.length - 5, 0], [area.length - 5, area.width]], 'dashed', YELLOW)
  team(b, RED, [
    ['', 8, 10],
    ['', 8, 25],
    ['', 18, 6],
    ['', 18, 17.5],
    ['', 18, 29],
    ['', 28, 17.5],
  ])
  team(b, WHITE, [
    ['', 14, 12],
    ['', 14, 23],
    ['', 25, 9],
    ['', 25, 26],
    ['', 34, 14],
    ['', 34, 22],
  ])
  addBall(b, 34, 15)
  text(b, 'Endzone', [42.5, 17.5], 0.45, 90)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 12,
    pitch: GRASS,
    description:
      '6 gegen 6 auf 3 Kleintore: Rot verteidigt die drei Kleintore, Weiß greift sie an und soll die Seite wechseln, wo es frei ist.\n' +
      'Rot punktet nach Ballgewinn, indem ein Spieler mit Ball in die Endzone (gelbe Linie) dribbelt. Nach 4 Minuten Aufgaben tauschen.',
  })
}

function intervalRuns(name: string): Drill {
  const area = { length: 90, width: 24 }
  const b = builder(area)
  for (const x of [0, 30, 60, 90]) for (const y of [2, 12, 22]) cone(b, [x, y])
  team(b, BLUE, [
    ['', -2, 4],
    ['', -2, 7],
  ])
  team(b, YELLOW, [
    ['', -2, 14],
    ['', -2, 17],
  ])
  team(b, RED, [
    ['', -2, 24],
    ['', -2, 21],
  ])
  run(b, [[1, 5.5], [29, 5.5]], 'solid', BLUE)
  run(b, [[1, 15.5], [59, 15.5]], 'solid', YELLOW)
  run(b, [[1, 20], [89, 20]], 'solid', RED)
  run(b, [[89, 23], [1, 23]], 'dashed', GREY)
  text(b, '30 m', [15, 9], 0.5)
  text(b, '60 m', [45, 13], 0.5)
  text(b, '90 m', [75, 18], 0.5)
  note(b, '70–85 % · zurück traben = Pause', [45, -2])
  return areaDrill(name, area, b, {
    area: 'drill',
    category: null,
    players: 6,
    pitch: GRASS,
    description:
      'Intervallläufe auf drei Bahnen mit Hütchen alle 30 m: Läufe über 30, 60 und 90 m mit 70–85 % Tempo, zurück traben als aktive Pause.\n' +
      'Beispiel: 3 Serien zu je 6 Läufen, zwischen den Serien 3 Minuten Pause. Gut als Ausweichprogramm bei schlechtem Wetter.',
  })
}

function passCircuit3(name: string): Drill {
  const area = { length: 30, width: 20 }
  const b = builder(area)
  const group = (dx: number, color: string): void => {
    const a: Pt = [dx + 2, 17]
    const c: Pt = [dx + 7, 3]
    const d: Pt = [dx + 12, 17]
    for (const p of [a, c, d]) cone(b, p)
    player(b, color, 'A', [a[0], a[1] + 1.5])
    player(b, color, 'B', [c[0], c[1] - 1.5])
    player(b, color, 'C', [d[0], d[1] + 1.5])
    pass(b, a, c, 'solid', 1)
    pass(b, c, d, 'solid', 2)
    pass(b, d, a, 'solid', 3)
    run(b, [[a[0] + 1, a[1] - 1], [c[0] - 0.5, c[1] + 1.5]], 'dashed')
  }
  group(0, YELLOW)
  group(15, RED)
  addBall(b, 2, 15.5)
  addBall(b, 17, 15.5)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 6,
    pitch: GRASS,
    description:
      'Passrundlauf in 3er-Gruppen: Pass A → B → C → A, jeder läuft seinem Pass nach auf die nächste Position.\n' +
      'Steigerung: nur direkt, mit dem schwachen Fuß, mit Ballannahme in die Laufrichtung, zwei Bälle gleichzeitig.',
  })
}

function rondo3v3v3(name: string): Drill {
  const area = { length: 15, width: 13 }
  const b = builder(area)
  team(b, YELLOW, [
    ['', 2, 2],
    ['', 13, 2],
    ['', 7.5, 6.5],
  ])
  team(b, RED, [
    ['', 2, 11],
    ['', 13, 11],
    ['', 7.5, 12.5],
  ])
  team(b, BLUE, [
    ['', 5, 5],
    ['', 10, 5],
    ['', 7.5, 9],
  ])
  addBall(b, 3, 2.5)
  pass(b, [2, 2], [12.5, 2], 'solid', 1)
  pass(b, [13, 2.5], [13, 10.5], 'solid', 2)
  run(b, [[10, 5], [12, 4]], 'dashed', BLUE)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'passing',
    players: 9,
    pitch: GRASS,
    description:
      'Rondo 3 + 3 gegen 3: Zwei Teams halten zusammen den Ball gegen drei Verteidiger (15 × 13 m).\n' +
      'Das Team, das den Ball verliert, wird sofort zu Verteidigern und muss in Gegenpressing gehen: Ballgewinn innerhalb von 5 Sekunden ist das Ziel.',
  })
}

function multiFinish(name: string): Drill {
  const b = builder(FULL)
  addGoal(b, 'goal', 0, MID_Y, 0)
  keeper(b, [1.5, MID_Y], GREEN)
  addGoal(b, 'minigoal', HALF - 2, 20, 180, 1.5)
  addGoal(b, 'minigoal', HALF - 2, 48, 180, 1.5)
  for (const [label, p] of [
    ['A', [30, 12]],
    ['B', [34, 26]],
    ['C', [34, 42]],
    ['D', [30, 56]],
  ] as const) {
    marker(b, label, [p[0], p[1]], BLACK)
    player(b, RED, '', [p[0] + 2.5, p[1]])
  }
  team(b, BLUE, [
    ['', 12, 22],
    ['', 12, 46],
    ['', 18, 34],
    ['', 22, 10],
  ])
  addBall(b, 31, 15)
  shot(b, [30, 14], [0.5, 31])
  shot(b, [33, 27], [0.5, 36])
  coach(b, [44, 34])
  note(b, 'Nach 4 Abschlüssen: 4 gegen 4, Blau kontert auf die Kleintore', [47, 34])
  return half(name, b, {
    area: 'drill',
    category: 'shooting',
    players: 9,
    fieldSize: 'Halbfeld',
    description:
      'Mehrfachabschluss und Umschalten 4 gegen 4: Die roten Angreifer schließen nacheinander von den Positionen A–D ab.\n' +
      'Nach dem vierten Abschluss bringt der Trainer einen Ball: 4 gegen 4. Rot greift das Großtor an, Blau kontert nach Ballgewinn auf die zwei Kleintore.',
  })
}

function sevenVsSevenStepUp(name: string): Drill {
  const area = { length: 60, width: 44 }
  const b = builder(area)
  addGoal(b, 'goal', 0, 22, 0, 0.8)
  addGoal(b, 'goal', area.length, 22, 180, 0.8)
  rect(b, 25, 0, 35, 44, { color: BLUE, fillColor: BLUE, fillOpacity: 0.25, label: 'Mittelzone' })
  keeper(b, [1.5, 22])
  keeper(b, [58.5, 22], GREEN)
  team(b, RED, [
    ['', 10, 12],
    ['', 10, 32],
    ['', 20, 6],
    ['', 20, 22],
    ['', 20, 38],
    ['', 38, 16],
    ['', 40, 28],
  ])
  team(b, YELLOW, [
    ['', 50, 12],
    ['', 50, 32],
    ['', 42, 6],
    ['', 30, 22],
    ['', 42, 38],
    ['', 26, 12],
    ['', 24, 34],
  ], 180)
  addBall(b, 20, 23.5)
  run(b, [[10, 12], [26, 12]], 'dashed', RED)
  run(b, [[10, 32], [26, 32]], 'dashed', RED)
  return areaDrill(name, area, b, {
    area: 'drill',
    category: 'game',
    players: 16,
    pitch: GRASS,
    description:
      'Spielform 7 gegen 7 mit Aufrücken: Ein Tor zählt nur, wenn alle Feldspieler der angreifenden Mannschaft mindestens in der Mittelzone stehen.\n' +
      'Das Tor zählt doppelt, wenn die verteidigende Mannschaft nicht alle Spieler hinter der Mittelzone hat. So lernen alle, gemeinsam aufzurücken und zurückzuarbeiten.',
  })
}

// ---------------------------------------------------------------------------------------
// Catalog

export type FangoGroup = 'standards' | 'shape' | 'buildUp' | 'training'

export const FANGO_GROUPS: { group: FangoGroup; title: string }[] = [
  { group: 'standards', title: 'Standards' },
  { group: 'shape', title: 'Grundordnung und Matchplan' },
  { group: 'buildUp', title: 'Spieleröffnung und Systemübungen' },
  { group: 'training', title: 'Trainingsformen' },
]

export interface FangoTemplate {
  key: string
  group: FangoGroup
  name: string
  hint: string
  build: (name: string) => Drill
}

export const FANGO_TEMPLATES: FangoTemplate[] = [
  { key: 'kickOff', group: 'standards', name: 'Anstoß-Variante', hint: 'Zurück, dann lang hinter die Kette', build: kickOff },
  { key: 'cornerDefZone', group: 'standards', name: 'Ecke defensiv: Raum mit Manndeckern', hint: 'Fünf in der Zone, zwei Manndecker', build: cornerDefZone },
  { key: 'cornerAttack', group: 'standards', name: 'Ecke offensiv: kurz oder lang', hint: 'Zwei Varianten auf Handzeichen', build: cornerAttack },
  { key: 'cornerCommand', group: 'standards', name: 'Ecke mit Kommando', hint: 'Auseinanderlaufen vom Elfmeterpunkt', build: cornerCommand },
  { key: 'fkBallLine', group: 'standards', name: 'Freistoß Halbfeld: in die Ballinie', hint: 'Gruppe läuft durch', build: freeKickBallLine },
  { key: 'fkCross', group: 'standards', name: 'Freistoß Halbfeld: Laufwege kreuzen', hint: 'Außen zum ersten, innen zum zweiten Pfosten', build: freeKickCross },
  { key: 'fkTwo', group: 'standards', name: 'Freistoß zentral „Zwei“', hint: 'Antippen, Schuss an der Mauer vorbei', build: freeKickTwo },
  { key: 'fkOffside', group: 'standards', name: 'Freistoß defensiv: auf Abseits stellen', hint: 'Kette auf einer Linie, gemeinsam raus', build: freeKickOffside },
  { key: 'throwIn', group: 'standards', name: 'Einwurf-Variante', hint: 'Kurz, Prallen, in den Rücken', build: throwIn },
  { key: 'setPieceCounter', group: 'standards', name: 'Standards: Konterposition', hint: 'Zwei bleiben vorne', build: setPieceCounter },
  { key: 'shape4231', group: 'shape', name: 'Grundordnung 4-2-3-1', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('4231') },
  { key: 'shape442', group: 'shape', name: 'Grundordnung 4-4-2', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('442') },
  { key: 'shape4141', group: 'shape', name: 'Grundordnung 4-1-4-1', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('4141') },
  { key: 'shape433', group: 'shape', name: 'Grundordnung 4-3-3', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('433') },
  { key: 'shape343', group: 'shape', name: 'Grundordnung 3-4-3', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('343') },
  { key: 'shape3412', group: 'shape', name: 'Grundordnung 3-4-1-2', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('3412') },
  { key: 'shape442d', group: 'shape', name: 'Grundordnung 4-4-2 Raute', hint: 'Trichter, vorrücken, Warteposition', build: teamShape('442d') },
  { key: 'midfieldBlock', group: 'shape', name: 'Mittelfeld-Pressing-Block', hint: '4-4-2 kompakt, Pressinglinie', build: midfieldBlock },
  { key: 'shapeZones', group: 'shape', name: 'Zonen der Grundordnung', hint: 'Box, Zentrum, Halbfelder, Außenzonen', build: shapeZones },
  { key: 'pressingLines', group: 'shape', name: 'Pressinglinien', hint: '4-3-3 → 4-2-3-1 → 4-5-1', build: pressingLines },
  { key: 'thirdsFreedom', group: 'shape', name: 'Drittel: positionstreu und „Freedom“', hint: 'Kalkposition, 5 Korridore', build: thirdsFreedom },
  { key: 'lanesZones', group: 'shape', name: '5 Längs- und 6 Querzonen', hint: 'Spielfeldeinteilung mit Pressingbereich', build: lanesAndZones },
  { key: 'squadPlan', group: 'shape', name: 'Kaderplanung 4-3-3', hint: 'Positionen 1–11 mit Namensschildern', build: squadPlan },
  { key: 'sevenOut', group: 'shape', name: '„7 außen, 3 innen“ (3-4-1-2)', hint: 'Rotation 6-8-10 im Zentrum', build: sevenOutThreeIn },
  { key: 'system1', group: 'buildUp', name: 'Systemübung Offensive: Aktion 1', hint: 'Über links zur Grundlinie', build: systemAction1 },
  { key: 'system2', group: 'buildUp', name: 'Systemübung Offensive: Aktion 2', hint: 'Wandspiel, Steilpass rechts', build: systemAction2 },
  { key: 'system3', group: 'buildUp', name: 'Systemübung Offensive: Aktion 3', hint: 'Hinterlaufen rechts', build: systemAction3 },
  { key: 'system4', group: 'buildUp', name: 'Systemübung Offensive: Aktion 4', hint: 'Seitenwechsel und Flanke', build: systemAction4 },
  { key: 'buildUp433', group: 'buildUp', name: 'Spieleröffnung 4-3-3', hint: 'TW → IV → AV → Achter', build: buildUp433 },
  { key: 'fangoBuildUp4231', group: 'buildUp', name: 'Spieleröffnung 4-2-3-1 gegen 4-4-2', hint: 'Laufweg, Passweg, neue Situation', build: buildUp4231 },
  { key: 'fangoBuildUpPress', group: 'buildUp', name: 'Spielaufbau 6:6 gegen Mittelfeldpressing', hint: 'Punkte über die Trainer', build: buildUpVsMidPress },
  { key: 'sideline', group: 'buildUp', name: '2:1 an der Seitenlinie', hint: 'Chipball oder Hinterlaufen', build: sidelineDiagonal },
  { key: 'tenFour', group: 'training', name: '10 gegen 4 durchs Zentrum', hint: 'Aus dem Ballbesitz angreifen, 40 × 30 m', build: tenVsFour },
  { key: 'parcours', group: 'training', name: '4×4-Parcours mit Stationen', hint: 'Slalom, Stangen, Hürden, Leiter', build: parcours4x4 },
  { key: 'tabata', group: 'training', name: 'Tabata-Stationen', hint: '8 × 20 s an vier Stationen', build: tabata },
  { key: 'murderball', group: 'training', name: '„Mörderball“ 4-3-3 gegen 4-2-3-1', hint: 'Großfeld, Vollgas ohne Pause', build: murderball },
  { key: 'hexagon', group: 'training', name: 'Hexagon-Passform', hint: 'Sechs Hütchen, Wandspieler in der Mitte', build: hexagon },
  { key: 'rondo4v1', group: 'training', name: 'Übergangsrondo 4 gegen 1 auf 4 Feldern', hint: '4 Pässe, dann Wechsel', build: transitionRondo4v1 },
  { key: 'eightTwo', group: 'training', name: 'Übergangsform 8 + 2 gegen 8', hint: 'Vier Felder, höchstens 4 gegen 4', build: eightPlusTwo },
  { key: 'formats', group: 'training', name: 'Positionsspiel-Formate', hint: '4:4+3, 5:5+1, 8:8+3', build: positionalFormats },
  { key: 'sixThreeGoals', group: 'training', name: '6 gegen 6 auf 3 Kleintore', hint: 'Seitenwechsel, Endzone', build: sixVsSixThreeGoals },
  { key: 'intervals', group: 'training', name: 'Intervallläufe', hint: '30 / 60 / 90 m auf drei Bahnen', build: intervalRuns },
  { key: 'passCircuit', group: 'training', name: 'Passrundlauf in 3er-Gruppen', hint: 'Dem Pass nachlaufen', build: passCircuit3 },
  { key: 'rondo333', group: 'training', name: 'Rondo 3 + 3 gegen 3', hint: 'Gegenpressing nach Ballverlust', build: rondo3v3v3 },
  { key: 'multiFinish', group: 'training', name: 'Mehrfachabschluss und Umschalten', hint: 'A–D, dann 4 gegen 4', build: multiFinish },
  { key: 'sevenSeven', group: 'training', name: 'Spielform 7 gegen 7 mit Aufrücken', hint: 'Tor zählt nur nach Aufrücken', build: sevenVsSevenStepUp },
]

export function fangoTemplateDrill(key: string): Drill {
  const template = FANGO_TEMPLATES.find((t) => t.key === key)
  if (!template) throw new Error(`Unknown template ${key}`)
  return template.build(template.name)
}

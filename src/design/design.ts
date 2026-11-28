// Design templates: a saved look (pitch, team colors, players, cones, lines, zones) that can be
// put onto a whole drill with one click. Only the look changes, never positions or texts.

import { isHexColor, PITCH_COLORS, PITCH_LINE_WIDTHS, TURQUOISE_LINE, type PitchStyle } from '../field/pitchStyle'
import { clampItemSize } from '../items/palette'
import { LINE_PATTERNS, LINE_WEIGHTS, type LinePattern, type LineWeight } from '../lines/styles'
import { parsePitchStyle } from '../model/serialize'
import type { Drill, Item, Line, LineType, PlayerShape, SymbolStyle, Zone } from '../model/types'
import { nameInitials } from '../teams/team'

/** Parts of the pitch style that belong to a design (not grid, orientation, notes or size). */
export type DesignPitch = Pick<PitchStyle, 'color' | 'lineColor' | 'lineWidth' | 'roundedCorners' | 'mowing' | 'lighting' | 'lightSource' | 'lightKind' | 'gradient'>

const PITCH_KEYS = ['color', 'lineColor', 'lineWidth', 'roundedCorners', 'mowing', 'lighting', 'lightSource', 'lightKind', 'gradient'] as const

/** Line types with their own style in a design; plain and freehand lines follow the pass style's color. */
export type DesignLineType = 'pass' | 'run' | 'dribble' | 'shot'
export const DESIGN_LINE_TYPES: DesignLineType[] = ['pass', 'run', 'dribble', 'shot']

export interface DesignLineStyle {
  color: string
  pattern: LinePattern
  weight: LineWeight
}

export interface Design {
  id: string
  name: string
  /** Comes with the app; can be used and copied, but not changed or deleted */
  builtIn?: boolean
  createdAt: number
  updatedAt: number
  pitch: DesignPitch
  /** Team A, team B, neutrals */
  teams: [string, string, string]
  player: {
    shape: PlayerShape
    /** null = with border (as usual) */
    symbol: SymbolStyle | null
    /** null = keep the size of every player */
    size: number | null
    facing: boolean
    /** Name tags: keep them, shorten to initials ("MM") or remove them */
    names: NameTagMode
    /** Number or text inside the player: keep it or show players without it */
    numbers: NumberMode
  }
  /** Cones and discs */
  coneColor: string
  /** Goals and mini goals (also in perspective); null = keep their color */
  goalColor: string | null
  lines: Record<DesignLineType, DesignLineStyle>
  /** Filled zones (zones without fill count as markings and take the pitch line color) */
  zone: { color: string; fillColor: string; fillOpacity: number }
}

export type NumberMode = 'keep' | 'none'
export const NUMBER_MODES: { value: NumberMode; label: string }[] = [
  { value: 'keep', label: 'Beibehalten' },
  { value: 'none', label: 'Ohne Nummer' },
]

export type NameTagMode = 'keep' | 'initials' | 'none'
export const NAME_TAG_MODES: { value: NameTagMode; label: string }[] = [
  { value: 'keep', label: 'Beibehalten' },
  { value: 'initials', label: 'Anfangsbuchstaben' },
  { value: 'none', label: 'Ohne Namen' },
]

const PLAYER_SHAPES: PlayerShape[] = ['circle', 'triangle', 'cross', 'shirt']
const CONE_TYPES = new Set<Item['type']>(['cone', 'disc'])
const GOAL_TYPES = new Set<Item['type']>(['goal', 'minigoal', 'goalFront', 'minigoalFront'])
/** Items with a name tag */
const NAMED_TYPES = new Set<Item['type']>(['player', 'figure'])

/** Name tag in the chosen mode; names that already are initials stay as they are. */
export function styledName(name: string, mode: NameTagMode): string {
  if (mode === 'none') return ''
  if (mode === 'keep' || /^[A-ZÄÖÜ]{1,4}$/.test(name.trim())) return name
  return nameInitials(name)
}

/** Color of the pitch markings in a design (own line color or the usual one of the pitch). */
export function markingColor(pitch: Pick<PitchStyle, 'color' | 'lineColor'>): string {
  return pitch.lineColor ?? PITCH_COLORS[pitch.color].line
}

// ---------------------------------------------------------------------------------------
// Ready-made designs

const BUILT_IN_TIME = 0

function builtIn(id: string, name: string, design: Omit<Design, 'id' | 'name' | 'builtIn' | 'createdAt' | 'updatedAt'>): Design {
  return { id: `design-builtin-${id}`, name, builtIn: true, createdAt: BUILT_IN_TIME, updatedAt: BUILT_IN_TIME, ...design }
}

function lineSet(pass: string, run: string, weight: LineWeight = 'extraThin'): Record<DesignLineType, DesignLineStyle> {
  return {
    pass: { color: pass, pattern: 'solid', weight },
    run: { color: run, pattern: 'dashed', weight },
    dribble: { color: pass, pattern: 'solid', weight },
    shot: { color: pass, pattern: 'solid', weight },
  }
}

export const BUILT_IN_DESIGNS: Design[] = [
  builtIn('grass', 'Rasen klassisch', {
    pitch: { color: 'darkGreenPlain', lineWidth: 'thin', roundedCorners: true },
    teams: ['#2563eb', '#dc2626', '#facc15'],
    player: { shape: 'circle', symbol: null, size: null, facing: false, names: 'keep', numbers: 'keep' },
    coneColor: '#f97316',
    goalColor: '#ffffff',
    lines: lineSet('#ffffff', '#ffffff'),
    zone: { color: '#ffffff', fillColor: '#facc15', fillOpacity: 0.25 },
  }),
  builtIn('navy', 'Dunkelblau / Türkis', {
    pitch: { color: 'navy', lineColor: TURQUOISE_LINE, lineWidth: 'thin', roundedCorners: true },
    teams: ['#facc15', '#ef4444', '#38bdf8'],
    player: { shape: 'circle', symbol: 'flat', size: null, facing: false, names: 'keep', numbers: 'keep' },
    coneColor: '#f97316',
    goalColor: '#ffffff',
    lines: lineSet('#ffffff', TURQUOISE_LINE),
    zone: { color: TURQUOISE_LINE, fillColor: TURQUOISE_LINE, fillOpacity: 0.2 },
  }),
  builtIn('blackRed', 'Schwarz / Rot', {
    pitch: { color: 'black', lineColor: '#dc2626', lineWidth: 'thin' },
    teams: ['#ffffff', '#dc2626', '#9ca3af'],
    player: { shape: 'circle', symbol: null, size: null, facing: false, names: 'keep', numbers: 'keep' },
    coneColor: '#dc2626',
    goalColor: '#ffffff',
    lines: lineSet('#ffffff', '#dc2626'),
    zone: { color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.15 },
  }),
  builtIn('blackOrange', 'Schwarz / Orange', {
    pitch: { color: 'black', lineColor: '#f97316', lineWidth: 'thin' },
    teams: ['#f97316', '#ffffff', '#facc15'],
    player: { shape: 'circle', symbol: null, size: null, facing: false, names: 'keep', numbers: 'keep' },
    coneColor: '#f97316',
    goalColor: '#ffffff',
    lines: lineSet('#ffffff', '#f97316'),
    zone: { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.25 },
  }),
  builtIn('whiteboard', 'Whiteboard (weiß)', {
    pitch: { color: 'white', lineWidth: 'thin' },
    teams: ['#1d4ed8', '#dc2626', '#f97316'],
    player: { shape: 'circle', symbol: 'flat', size: null, facing: false, names: 'keep', numbers: 'keep' },
    coneColor: '#f97316',
    goalColor: '#111827',
    lines: lineSet('#111827', '#111827'),
    zone: { color: '#111827', fillColor: '#fde047', fillOpacity: 0.35 },
  }),
]

// ---------------------------------------------------------------------------------------
// Applying a design

/**
 * Player colors of a drill, most used first (ties: first seen first). Used to map them onto
 * team A, team B and the neutrals.
 */
export function playerColorOrder(drill: Pick<Drill, 'scenes'>): string[] {
  const counts = new Map<string, number>()
  // Count each player once (by id), in the scene where it first appears.
  const seen = new Set<string>()
  for (const scene of drill.scenes) {
    for (const item of scene.items) {
      if (item.type !== 'player' || seen.has(item.id)) continue
      seen.add(item.id)
      const color = item.color.toLowerCase()
      counts.set(color, (counts.get(color) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color)
}

/** A player of the drill with its name tag (first appearance over all scenes). */
export interface PlayerNameEntry {
  id: string
  color: string
  label: string
  name: string
}

/** All players of the drill, grouped by team color (most used first), then by number. */
export function playerNameList(drill: Pick<Drill, 'scenes'>): PlayerNameEntry[] {
  const found = new Map<string, PlayerNameEntry>()
  for (const scene of drill.scenes)
    for (const it of scene.items)
      if (it.type === 'player' && !found.has(it.id)) found.set(it.id, { id: it.id, color: it.color, label: it.label, name: it.name })
  const order = playerColorOrder(drill)
  const rank = (c: string) => order.indexOf(c.toLowerCase())
  return [...found.values()].sort(
    (a, b) => rank(a.color) - rank(b.color) || a.label.localeCompare(b.label, 'de', { numeric: true }),
  )
}

/** Sets the name tags of players (by id) in all scenes; an empty name removes the tag. */
export function setPlayerNames<T extends Pick<Drill, 'scenes'>>(drill: T, names: Record<string, string>): T {
  if (Object.keys(names).length === 0) return drill
  return {
    ...drill,
    scenes: drill.scenes.map((scene) => ({
      ...scene,
      items: scene.items.map((it) => (it.id in names && it.type === 'player' ? { ...it, name: names[it.id].trim().slice(0, 40) } : it)),
    })),
  }
}

/** Puts the design's look onto the whole drill (all scenes); positions and texts stay. */
export function applyDesign(drill: Drill, design: Design): Drill {
  const order = playerColorOrder(drill)
  const teamColor = (color: string): string => {
    const rank = order.indexOf(color.toLowerCase())
    return design.teams[Math.min(rank < 0 ? 2 : rank, 2)]
  }
  const marking = markingColor(design.pitch)

  const item = (it: Item): Item => {
    if (it.type === 'player') {
      const next: Item = { ...it, color: teamColor(it.color), shape: design.player.shape }
      if (design.player.size !== null) next.size = clampItemSize(design.player.size)
      if (design.player.symbol) next.symbol = design.player.symbol
      else delete next.symbol
      if (design.player.facing) delete next.facing
      else next.facing = false
      next.name = styledName(it.name, design.player.names)
      if (design.player.numbers === 'none') next.label = ''
      return next
    }
    if (CONE_TYPES.has(it.type)) return { ...it, color: design.coneColor }
    if (GOAL_TYPES.has(it.type) && design.goalColor) return { ...it, color: design.goalColor }
    if (NAMED_TYPES.has(it.type) && it.name) return { ...it, name: styledName(it.name, design.player.names) }
    return it
  }

  const line = (ln: Line): Line => {
    // Locked lines belong to the field (e.g. size labels): they take the marking color.
    if (ln.locked || ln.type === 'line') return { ...ln, color: marking }
    const style = design.lines[isDesignLineType(ln.type) ? ln.type : 'pass']
    if (!isDesignLineType(ln.type)) return { ...ln, color: style.color }
    return { ...ln, color: style.color, pattern: style.pattern, weight: style.weight }
  }

  const zone = (z: Zone): Zone => {
    if (z.fillOpacity === 0) return { ...z, color: marking, fillColor: marking }
    return { ...z, color: design.zone.color, fillColor: design.zone.fillColor, fillOpacity: design.zone.fillOpacity }
  }

  const pitch: PitchStyle = { ...drill.pitch }
  for (const key of PITCH_KEYS) delete pitch[key]
  Object.assign(pitch, cleanPitch(design.pitch))

  return {
    ...drill,
    pitch,
    scenes: drill.scenes.map((scene) => ({
      ...scene,
      items: scene.items.map(item),
      lines: scene.lines.map(line),
      zones: scene.zones.map(zone),
    })),
  }
}

function isDesignLineType(type: LineType): type is DesignLineType {
  return (DESIGN_LINE_TYPES as LineType[]).includes(type)
}

/** Leaves out values that are missing anyway, so files stay small. */
function cleanPitch(pitch: DesignPitch): DesignPitch {
  const out: DesignPitch = { color: pitch.color }
  for (const key of PITCH_KEYS) {
    const value = pitch[key]
    if (value !== undefined && value !== false) (out as Record<string, unknown>)[key] = value
  }
  if (out.lineWidth === 'normal') delete out.lineWidth
  return out
}

// ---------------------------------------------------------------------------------------
// A design from a drill

/** Takes the look of a drill as a new design (missing parts come from `base`). */
export function designFromDrill(drill: Drill, base: Design, name: string, id: string, now: number): Design {
  const all = drill.scenes.flatMap((s) => s.items)
  const lines = drill.scenes.flatMap((s) => s.lines).filter((l) => !l.locked)
  const order = playerColorOrder(drill)
  const firstPlayer = all.find((i) => i.type === 'player')
  const cone = all.find((i) => CONE_TYPES.has(i.type))
  const goal = all.find((i) => GOAL_TYPES.has(i.type))
  const filled = drill.scenes.flatMap((s) => s.zones).find((z) => z.fillOpacity > 0)
  const pitch = {} as DesignPitch
  for (const key of PITCH_KEYS) (pitch as Record<string, unknown>)[key] = drill.pitch[key]
  const lineStyles = { ...base.lines }
  for (const type of DESIGN_LINE_TYPES) {
    const found = lines.find((l) => l.type === type)
    if (found) lineStyles[type] = { color: found.color, pattern: found.pattern, weight: found.weight }
  }
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    pitch: cleanPitch(pitch),
    teams: [order[0] ?? base.teams[0], order[1] ?? base.teams[1], order[2] ?? base.teams[2]],
    player: firstPlayer
      ? { shape: firstPlayer.shape, symbol: firstPlayer.symbol ?? null, size: null, facing: firstPlayer.facing !== false, names: 'keep', numbers: 'keep' }
      : { ...base.player },
    coneColor: cone?.color ?? base.coneColor,
    goalColor: goal?.color ?? base.goalColor,
    lines: lineStyles,
    zone: filled ? { color: filled.color, fillColor: filled.fillColor, fillOpacity: filled.fillOpacity } : { ...base.zone },
  }
}

export function createDesignId(): string {
  return `design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Copy of a design that can be changed (built-in designs are copied before editing). */
export function copyDesign(design: Design, id: string, now: number, name = `${design.name} (Kopie)`): Design {
  const copy: Design = structuredClone(design)
  delete copy.builtIn
  return { ...copy, id, name, createdAt: now, updatedAt: now }
}

// ---------------------------------------------------------------------------------------
// Checking stored designs

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function lineStyleFromData(value: unknown): DesignLineStyle | null {
  if (
    !isRecord(value) ||
    !isHexColor(value.color) ||
    !LINE_PATTERNS.includes(value.pattern as LinePattern) ||
    !LINE_WEIGHTS.includes(value.weight as LineWeight)
  ) {
    return null
  }
  return { color: value.color, pattern: value.pattern as LinePattern, weight: value.weight as LineWeight }
}

/** Checks a stored design; null if it is broken. */
export function designFromData(value: unknown): Design | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    !Array.isArray(value.teams) ||
    value.teams.length !== 3 ||
    !value.teams.every(isHexColor) ||
    !isHexColor(value.coneColor) ||
    !isRecord(value.player) ||
    !isRecord(value.lines) ||
    !isRecord(value.zone) ||
    !isRecord(value.pitch)
  ) {
    return null
  }
  const p = value.player
  if (
    !PLAYER_SHAPES.includes(p.shape as PlayerShape) ||
    !(p.symbol === null || p.symbol === 'flat' || p.symbol === 'outline') ||
    !(p.size === null || typeof p.size === 'number') ||
    typeof p.facing !== 'boolean' ||
    // Name tags and goal color came later; older designs keep both as they are.
    !(p.names === undefined || NAME_TAG_MODES.some((m) => m.value === p.names)) ||
    !(p.numbers === undefined || NUMBER_MODES.some((m) => m.value === p.numbers)) ||
    !(value.goalColor === undefined || value.goalColor === null || isHexColor(value.goalColor))
  ) {
    return null
  }
  const z = value.zone
  if (!isHexColor(z.color) || !isHexColor(z.fillColor) || typeof z.fillOpacity !== 'number' || z.fillOpacity < 0 || z.fillOpacity > 1) {
    return null
  }
  const lines = {} as Record<DesignLineType, DesignLineStyle>
  for (const type of DESIGN_LINE_TYPES) {
    const style = lineStyleFromData((value.lines as Record<string, unknown>)[type])
    if (!style) return null
    lines[type] = style
  }
  let pitch: PitchStyle
  try {
    pitch = parsePitchStyle({ ...value.pitch, grid: 'none', orientation: 'landscape' })
  } catch {
    return null
  }
  if (pitch.lineWidth && !PITCH_LINE_WIDTHS.some((w) => w.value === pitch.lineWidth)) return null
  const designPitch = {} as DesignPitch
  for (const key of PITCH_KEYS) (designPitch as Record<string, unknown>)[key] = pitch[key]
  return {
    id: value.id,
    name: value.name.slice(0, 80),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    pitch: cleanPitch(designPitch),
    teams: value.teams as [string, string, string],
    player: {
      shape: p.shape as PlayerShape,
      symbol: p.symbol as SymbolStyle | null,
      size: p.size === null ? null : clampItemSize(p.size as number),
      facing: p.facing,
      names: (p.names as NameTagMode | undefined) ?? 'keep',
      numbers: (p.numbers as NumberMode | undefined) ?? 'keep',
    },
    coneColor: value.coneColor,
    goalColor: (value.goalColor as string | null | undefined) ?? null,
    lines,
    zone: { color: z.color, fillColor: z.fillColor, fillOpacity: z.fillOpacity },
  }
}

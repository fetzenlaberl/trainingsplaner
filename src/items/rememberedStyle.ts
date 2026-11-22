// Color and size chosen for an object are remembered per sidebar entry: the next object of
// the same kind starts with them, until they are changed again. Saved on this device.

import type { Item, SymbolStyle } from '../model/types'
import { clampItemSize, ITEM_TEMPLATES, type ItemTemplate, type NewItem } from './palette'

const STORAGE_KEY = 'trainingsplaner.objectStyles'
/** The symbol look (border, flat, outline) applies to all player entries together. */
const PLAYER_SYMBOL_KEY = 'players'

export interface RememberedStyle {
  color?: string
  size?: number
  /** Player symbol look (stored for all players together); null = with border */
  symbol?: SymbolStyle | null
}

/** Sidebar entry each placed object came from (only for this session). */
const origins = new Map<string, string>()

let styles: Record<string, RememberedStyle> | null = null

function load(): Record<string, RememberedStyle> {
  if (styles) return styles
  styles = {}
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if ((key !== PLAYER_SYMBOL_KEY && !ITEM_TEMPLATES.some((t) => t.key === key)) || typeof value !== 'object' || value === null) continue
        const v = value as Record<string, unknown>
        styles[key] = {
          ...(typeof v.color === 'string' && /^#[0-9a-f]{6}$|^[a-z]+$/i.test(v.color) ? { color: v.color } : {}),
          ...(typeof v.size === 'number' && Number.isFinite(v.size) ? { size: clampItemSize(v.size) } : {}),
          ...(v.symbol === 'flat' || v.symbol === 'outline' || v.symbol === null ? { symbol: v.symbol } : {}),
        }
      }
    }
  } catch {
    // Nothing remembered (private window or no storage); the objects keep their usual look.
  }
  return styles
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(styles ?? {}))
  } catch {
    // Not remembered on this device; the choice still applies in this session.
  }
}

/** Players are colored by their team entry (red, blue, keeper …), so only their size carries over. */
function keepsColor(template: ItemTemplate): boolean {
  return template.item.type !== 'player'
}

/** The template item with the remembered color and size. */
export function withRememberedStyle(template: ItemTemplate): NewItem {
  const style = load()[template.key]
  const symbol = template.item.type === 'player' ? load()[PLAYER_SYMBOL_KEY]?.symbol : undefined
  if (!style && !symbol) return template.item
  return {
    ...template.item,
    ...(style?.color && keepsColor(template) ? { color: style.color } : {}),
    ...(style?.size !== undefined ? { size: style.size } : {}),
    ...(symbol ? { symbol } : {}),
  }
}

/** Notes which sidebar entry a new object came from. */
export function noteOrigin(itemId: string, templateKey: string): void {
  origins.set(itemId, templateKey)
}

/** Sidebar entry of an object: where it was dropped from, or the only entry of its type. */
function templateOf(item: Item): ItemTemplate | undefined {
  const key = origins.get(item.id)
  if (key) return ITEM_TEMPLATES.find((t) => t.key === key)
  const sameType = ITEM_TEMPLATES.filter((t) => t.item.type === item.type)
  return sameType.length === 1 ? sameType[0] : undefined
}

/** Remembers the color and/or size just chosen for an object. */
export function rememberStyle(item: Item, change: RememberedStyle): void {
  if (change.symbol !== undefined && item.type === 'player') {
    load()[PLAYER_SYMBOL_KEY] = { symbol: change.symbol }
    save()
  }
  const template = templateOf(item)
  if (!template) return
  const all = load()
  const next = { ...all[template.key] }
  if (change.color !== undefined && keepsColor(template)) next.color = change.color
  if (change.size !== undefined) next.size = clampItemSize(change.size)
  all[template.key] = next
  save()
}

/** For tests: forget everything. */
export function resetRememberedStyles(): void {
  styles = {}
  origins.clear()
  save()
}

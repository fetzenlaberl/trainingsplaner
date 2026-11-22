/** Returns black or white, whichever reads better on the given hex color. */
/**
 * Text on an outline-only symbol stands on the pitch: it takes the symbol's color, but very
 * dark colors would vanish on the green, so they get white text.
 */
export function outlineTextColor(hex: string): string {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.3 ? '#ffffff' : hex
}

export function contrastTextColor(hex: string): string {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111827' : '#ffffff'
}

/** Lighter (amount > 0) or darker (amount < 0) version of a hex color, amount between -1 and 1. */
export function shadeColor(hex: string, amount: number): string {
  const value = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return hex
  const channel = (i: number) => {
    const c = Number.parseInt(value.slice(i, i + 2), 16)
    const shaded = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)
    return Math.round(Math.min(255, Math.max(0, shaded)))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(2)}${channel(4)}`
}

/** Splits text into lines no wider than maxWidth (keeps the user's own line breaks). */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && measure(candidate) > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}

/** The field image with a white band of notes below it (for the PNG export). */
export function appendNotes(image: HTMLCanvasElement, notes: string): HTMLCanvasElement {
  const width = image.width
  const fontSize = Math.max(16, Math.round(width / 55))
  const padding = Math.round(fontSize * 1.2)
  const lineHeight = Math.round(fontSize * 1.35)
  const font = `${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`
  const measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return image
  measureCtx.font = font
  const lines = wrapText(notes, width - 2 * padding, (s) => measureCtx.measureText(s).width)

  const result = document.createElement('canvas')
  result.width = width
  result.height = image.height + 2 * padding + lines.length * lineHeight
  const ctx = result.getContext('2d')
  if (!ctx) return image
  ctx.drawImage(image, 0, 0)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, image.height, width, result.height - image.height)
  ctx.fillStyle = '#111827'
  ctx.font = font
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => ctx.fillText(line, padding, image.height + padding + i * lineHeight))
  return result
}

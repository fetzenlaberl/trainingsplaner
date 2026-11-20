// Fine grass texture: a small tile of light and dark specks, drawn once and repeated
// over the pitch. Seeded, so the pitch looks the same on screen and in every export.

const TILE_PX = 128

let tile: HTMLCanvasElement | null = null

/** Small deterministic random generator (mulberry32). */
function random(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The texture tile, or null outside the browser (e.g. in tests). */
export function grassTextureTile(): HTMLCanvasElement | null {
  if (tile) return tile
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = TILE_PX
  canvas.height = TILE_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const rand = random(20261120)
  // Short blades in random directions, light and dark.
  for (let i = 0; i < 1400; i++) {
    const x = rand() * TILE_PX
    const y = rand() * TILE_PX
    const length = 1.5 + rand() * 3
    const angle = -Math.PI / 2 + (rand() - 0.5) * 1.2
    const light = rand() > 0.5
    ctx.strokeStyle = light ? `rgba(255,255,255,${0.05 + rand() * 0.07})` : `rgba(0,0,0,${0.05 + rand() * 0.08})`
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    ctx.stroke()
  }
  tile = canvas
  return tile
}

/** Meters covered by one texture tile on the pitch. */
export const TEXTURE_TILE_METERS = 6
export const TEXTURE_TILE_PX = TILE_PX

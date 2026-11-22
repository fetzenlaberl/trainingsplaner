// Surface textures drawn by the app itself: small tiles repeated over the pitch (grass
// blades, wooden planks, asphalt grain, concrete slabs, red clay). Seeded, so the surface
// looks the same on screen and in every export.

import { grassTextureTile, TEXTURE_TILE_METERS, TEXTURE_TILE_PX } from './grassTexture'

export type SurfaceTexture = 'grass' | 'wood' | 'asphalt' | 'concrete' | 'clay'

const TILE_PX = 128

/** Meters covered by one tile of each texture. */
const TILE_METERS: Record<Exclude<SurfaceTexture, 'grass'>, number> = {
  // 8 planks of 1 m across the tile, each 4 m long
  wood: 8,
  asphalt: 4,
  // one concrete slab of 5 × 5 m
  concrete: 5,
  clay: 4,
}

const tiles = new Map<SurfaceTexture, HTMLCanvasElement>()

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

/** Specks of grain: light and dark dots of random size. */
function specks(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  size: [number, number],
  light: (r: number) => string,
  dark: (r: number) => string,
): void {
  for (let i = 0; i < count; i++) {
    const x = rand() * TILE_PX
    const y = rand() * TILE_PX
    const s = size[0] + rand() * (size[1] - size[0])
    ctx.fillStyle = rand() > 0.5 ? light(rand()) : dark(rand())
    ctx.fillRect(x, y, s, s)
  }
}

function drawWood(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const plankHeight = TILE_PX / 8
  // Long planks (8 m) with staggered joints; the plank length equals the tile, so it repeats seamlessly.
  const plankLength = TILE_PX
  for (let row = 0; row < 8; row++) {
    const y = row * plankHeight
    const offset = ((row * 5) % 8) * plankHeight
    for (let x = offset - plankLength; x < TILE_PX; x += plankLength) {
      const shade = rand() - 0.5
      ctx.fillStyle = shade > 0 ? `rgba(255,236,200,${(shade * 0.22).toFixed(3)})` : `rgba(70,35,10,${(-shade * 0.22).toFixed(3)})`
      ctx.fillRect(x, y, plankLength, plankHeight)
      // Grain: thin wavy lines along the plank.
      for (let g = 0; g < 3; g++) {
        const gy = y + 2 + rand() * (plankHeight - 4)
        ctx.strokeStyle = `rgba(90,45,15,${(0.08 + rand() * 0.08).toFixed(3)})`
        ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(x + 2, gy)
        ctx.bezierCurveTo(x + plankLength * 0.3, gy + (rand() - 0.5) * 3, x + plankLength * 0.7, gy + (rand() - 0.5) * 3, x + plankLength - 2, gy)
        ctx.stroke()
      }
      // Joint at the end of the plank
      ctx.fillStyle = 'rgba(60,30,10,0.28)'
      ctx.fillRect(x, y, 1, plankHeight)
    }
    // Joint between the rows
    ctx.fillStyle = 'rgba(60,30,10,0.22)'
    ctx.fillRect(0, y, TILE_PX, 1)
  }
}

function drawAsphalt(ctx: CanvasRenderingContext2D, rand: () => number): void {
  specks(
    ctx,
    rand,
    5200,
    [0.6, 1.6],
    (r) => `rgba(255,255,255,${(0.04 + r * 0.1).toFixed(3)})`,
    (r) => `rgba(0,0,0,${(0.08 + r * 0.14).toFixed(3)})`,
  )
}

function drawConcrete(ctx: CanvasRenderingContext2D, rand: () => number): void {
  // Soft cloudy patches
  for (let i = 0; i < 18; i++) {
    const x = rand() * TILE_PX
    const y = rand() * TILE_PX
    const r = 10 + rand() * 26
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const dark = rand() > 0.5
    g.addColorStop(0, dark ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  specks(
    ctx,
    rand,
    1600,
    [0.5, 1.1],
    (r) => `rgba(255,255,255,${(0.04 + r * 0.06).toFixed(3)})`,
    (r) => `rgba(0,0,0,${(0.04 + r * 0.07).toFixed(3)})`,
  )
  // Joints around the slab
  ctx.fillStyle = 'rgba(40,40,40,0.35)'
  ctx.fillRect(0, 0, TILE_PX, 1.5)
  ctx.fillRect(0, 0, 1.5, TILE_PX)
}

function drawClay(ctx: CanvasRenderingContext2D, rand: () => number): void {
  specks(
    ctx,
    rand,
    4200,
    [0.6, 1.8],
    (r) => `rgba(255,190,150,${(0.06 + r * 0.12).toFixed(3)})`,
    (r) => `rgba(60,15,5,${(0.08 + r * 0.14).toFixed(3)})`,
  )
  // A few small light stones
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(240,225,210,${(0.15 + rand() * 0.2).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(rand() * TILE_PX, rand() * TILE_PX, 0.6 + rand() * 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The texture tile and how many meters it covers, or null outside the browser (e.g. in tests). */
export function surfaceTexture(kind: SurfaceTexture): { image: HTMLCanvasElement; meters: number; px: number } | null {
  if (kind === 'grass') {
    const image = grassTextureTile()
    return image ? { image, meters: TEXTURE_TILE_METERS, px: TEXTURE_TILE_PX } : null
  }
  const meters = TILE_METERS[kind]
  const cached = tiles.get(kind)
  if (cached) return { image: cached, meters, px: TILE_PX }
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = TILE_PX
  canvas.height = TILE_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const seeds = { wood: 7101, asphalt: 7202, concrete: 7303, clay: 7404 }
  const rand = random(seeds[kind])
  if (kind === 'wood') drawWood(ctx, rand)
  else if (kind === 'asphalt') drawAsphalt(ctx, rand)
  else if (kind === 'concrete') drawConcrete(ctx, rand)
  else drawClay(ctx, rand)
  tiles.set(kind, canvas)
  return { image: canvas, meters, px: TILE_PX }
}

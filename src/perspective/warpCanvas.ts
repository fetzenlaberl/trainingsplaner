import { affineFromTriangles, fitProjected, projectPoint, warpedSize, type Point2 } from './perspective'

/** Grid cells per side; more cells = more exact perspective, fewer = faster. */
const GRID = 20
/** Triangles are drawn this much larger to hide hairline seams between them. */
const SEAM_OVERLAP = 0.6

function expand(points: [Point2, Point2, Point2], amount: number): Point2[] {
  const cx = (points[0].x + points[1].x + points[2].x) / 3
  const cy = (points[0].y + points[1].y + points[2].y) / 3
  return points.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / len) * amount, y: p.y + (dy / len) * amount }
  })
}

/**
 * Draws \`source\` tilted in perspective, fitted into the output area (outWidth × outHeight).
 * A canvas can only draw affine (parallel-preserving) images, so the image is split into
 * small triangles that are each drawn with their own affine transform.
 */
export function drawWarped(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
  tiltDeg: number,
  outWidth: number,
  outHeight: number,
): void {
  const w = source.width
  const h = source.height
  const fit = fitProjected(w, h, tiltDeg, outWidth, outHeight)
  const toOutput = (x: number, y: number): Point2 => {
    const p = projectPoint(x, y, w, h, tiltDeg)
    return { x: outWidth / 2 + fit.offsetX + p.x * fit.scale, y: outHeight / 2 + fit.offsetY + p.y * fit.scale }
  }

  const src: Point2[][] = []
  const dst: Point2[][] = []
  for (let row = 0; row <= GRID; row++) {
    src.push([])
    dst.push([])
    for (let col = 0; col <= GRID; col++) {
      const x = (col / GRID) * w
      const y = (row / GRID) * h
      src[row].push({ x, y })
      dst[row].push(toOutput(x, y))
    }
  }

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const triangles: [number, number][][] = [
        [
          [row, col],
          [row, col + 1],
          [row + 1, col],
        ],
        [
          [row, col + 1],
          [row + 1, col + 1],
          [row + 1, col],
        ],
      ]
      for (const tri of triangles) {
        const s = tri.map(([r, c]) => src[r][c]) as [Point2, Point2, Point2]
        const d = tri.map(([r, c]) => dst[r][c]) as [Point2, Point2, Point2]
        const clip = expand(d, SEAM_OVERLAP)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(clip[0].x, clip[0].y)
        ctx.lineTo(clip[1].x, clip[1].y)
        ctx.lineTo(clip[2].x, clip[2].y)
        ctx.closePath()
        ctx.clip()
        const [a, b, c, dd, e, f] = affineFromTriangles(s, d)
        ctx.setTransform(a, b, c, dd, e, f)
        ctx.drawImage(source, 0, 0)
        ctx.restore()
      }
    }
  }
}

/** Returns a new canvas with the image in perspective; background null = transparent. */
export function warpCanvas(source: HTMLCanvasElement, tiltDeg: number, background: string | null): HTMLCanvasElement {
  const { width, height } = warpedSize(source.width, source.height, tiltDeg)
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) return source
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }
  drawWarped(ctx, source, tiltDeg, width, height)
  return out
}

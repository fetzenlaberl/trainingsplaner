// Turns imported files into what the drill stores: pictures as (scaled-down) data URLs,
// the first page of a PDF as a picture, and plain text.

/** Longest side of an imported picture in pixels; bigger photos are scaled down. */
export const MAX_IMAGE_SIDE = 1600
/** Longest text taken from a text file */
export const MAX_TEXT_LENGTH = 2000

export interface ImportedImage {
  src: string
  width: number
  height: number
}

export class ImportError extends Error {}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export function isText(file: File): boolean {
  return file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)
}

/** Size that fits into MAX_IMAGE_SIDE, keeping the proportions. */
export function fitImageSize(width: number, height: number, max = MAX_IMAGE_SIDE): { width: number; height: number } {
  const factor = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) }
}

function canvasToImage(source: CanvasImageSource, width: number, height: number, keepTransparency: boolean): ImportedImage {
  const size = fitImageSize(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImportError('Das Bild konnte nicht verarbeitet werden.')
  if (!keepTransparency) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size.width, size.height)
  }
  ctx.drawImage(source, 0, 0, size.width, size.height)
  // Photos become JPEG (small); pictures that may be transparent stay PNG.
  const src = keepTransparency ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85)
  return { src, ...size }
}

/** Reads a picture file (photo, PNG, JPG …), scaled down if it is large. */
export async function importImageFile(file: File): Promise<ImportedImage> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new ImportError('Dieses Bildformat kann der Browser nicht öffnen.'))
      image.src = url
    })
    const transparent = /png|gif|webp|svg/i.test(file.type)
    return canvasToImage(img, img.naturalWidth || 800, img.naturalHeight || 600, transparent)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Renders the first page of a PDF as a picture (the PDF tool is loaded only when needed). */
export async function importPdfFile(file: File): Promise<ImportedImage> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await task.promise
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = MAX_IMAGE_SIDE / Math.max(base.width, base.height)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImportError('Das PDF konnte nicht verarbeitet werden.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    return canvasToImage(canvas, canvas.width, canvas.height, false)
  } finally {
    void task.destroy()
  }
}

/** Picture or PDF → picture. */
export function importPictureFile(file: File): Promise<ImportedImage> {
  return isPdf(file) ? importPdfFile(file) : importImageFile(file)
}

/** Text of a text file, shortened if very long. */
export async function importTextFile(file: File): Promise<string> {
  const text = (await file.text()).replace(/\r\n/g, '\n').trim()
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)} …` : text
}

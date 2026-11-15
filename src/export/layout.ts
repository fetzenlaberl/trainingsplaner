import type { Rect } from '../field/dimensions'

/** Export resolution in pixels per meter. */
export const EXPORT_SCALE = 25

/** Pixel size of the exported image for a viewport (meters). */
export function exportSize(viewport: Rect, pxPerMeter = EXPORT_SCALE) {
  return {
    width: Math.round(viewport.width * pxPerMeter),
    height: Math.round(viewport.height * pxPerMeter),
  }
}

// A4 page in millimeters
const A4_LONG = 297
const A4_SHORT = 210
const PAGE_MARGIN = 15
/** Space reserved above the image for the title */
const TITLE_AREA = 14

export interface PdfLayout {
  orientation: 'landscape' | 'portrait'
  pageWidth: number
  pageHeight: number
  /** Baseline position of the title */
  title: { x: number; y: number; maxWidth: number }
  image: { x: number; y: number; width: number; height: number }
}

function layoutFor(
  orientation: PdfLayout['orientation'],
  imageWidth: number,
  imageHeight: number,
): PdfLayout {
  const pageWidth = orientation === 'landscape' ? A4_LONG : A4_SHORT
  const pageHeight = orientation === 'landscape' ? A4_SHORT : A4_LONG
  const boxWidth = pageWidth - 2 * PAGE_MARGIN
  const boxHeight = pageHeight - 2 * PAGE_MARGIN - TITLE_AREA
  const factor = Math.min(boxWidth / imageWidth, boxHeight / imageHeight)
  const width = imageWidth * factor
  const height = imageHeight * factor
  return {
    orientation,
    pageWidth,
    pageHeight,
    title: { x: PAGE_MARGIN, y: PAGE_MARGIN + 7, maxWidth: boxWidth },
    image: {
      x: (pageWidth - width) / 2,
      y: PAGE_MARGIN + TITLE_AREA,
      width,
      height,
    },
  }
}

/** Places the image on an A4 page, choosing the orientation where it appears larger. */
export function pdfLayout(imageWidth: number, imageHeight: number): PdfLayout {
  const landscape = layoutFor('landscape', imageWidth, imageHeight)
  const portrait = layoutFor('portrait', imageWidth, imageHeight)
  return portrait.image.width > landscape.image.width ? portrait : landscape
}

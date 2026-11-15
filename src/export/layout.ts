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
/** Space reserved below the image for the description, if there is one */
const DESCRIPTION_AREA = 40
const DESCRIPTION_GAP = 6

export interface PdfLayout {
  orientation: 'landscape' | 'portrait'
  pageWidth: number
  pageHeight: number
  /** Baseline position of the title */
  title: { x: number; y: number; maxWidth: number }
  image: { x: number; y: number; width: number; height: number }
  /** Box for the description below the image, or null if there is none */
  description: { x: number; y: number; maxWidth: number; maxHeight: number } | null
}

function layoutFor(
  orientation: PdfLayout['orientation'],
  imageWidth: number,
  imageHeight: number,
  withDescription: boolean,
): PdfLayout {
  const pageWidth = orientation === 'landscape' ? A4_LONG : A4_SHORT
  const pageHeight = orientation === 'landscape' ? A4_SHORT : A4_LONG
  const boxWidth = pageWidth - 2 * PAGE_MARGIN
  const descriptionSpace = withDescription ? DESCRIPTION_AREA + DESCRIPTION_GAP : 0
  const boxHeight = pageHeight - 2 * PAGE_MARGIN - TITLE_AREA - descriptionSpace
  const factor = Math.min(boxWidth / imageWidth, boxHeight / imageHeight)
  const width = imageWidth * factor
  const height = imageHeight * factor
  const imageY = PAGE_MARGIN + TITLE_AREA
  return {
    orientation,
    pageWidth,
    pageHeight,
    title: { x: PAGE_MARGIN, y: PAGE_MARGIN + 7, maxWidth: boxWidth },
    image: {
      x: (pageWidth - width) / 2,
      y: imageY,
      width,
      height,
    },
    description: withDescription
      ? {
          x: PAGE_MARGIN,
          y: imageY + height + DESCRIPTION_GAP,
          maxWidth: boxWidth,
          maxHeight: DESCRIPTION_AREA,
        }
      : null,
  }
}

/**
 * Places the image (and optionally a description below it) on an A4 page,
 * choosing the orientation where the image appears larger.
 */
export function pdfLayout(imageWidth: number, imageHeight: number, withDescription = false): PdfLayout {
  const landscape = layoutFor('landscape', imageWidth, imageHeight, withDescription)
  const portrait = layoutFor('portrait', imageWidth, imageHeight, withDescription)
  return portrait.image.width > landscape.image.width ? portrait : landscape
}

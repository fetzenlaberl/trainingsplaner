import type { jsPDF as JsPDF } from 'jspdf'
import { drillInfoLine } from '../model/drillInfo'
import { fileNameFromTitle } from '../model/serialize'
import { useDrillStore } from '../store/drillStore'
import { downloadBlob } from './download'
import type { PdfLayout } from './layout'
import { pdfLayout } from './layout'
import { warpCanvas } from '../perspective/warpCanvas'
import { exportTilt } from '../store/perspectiveStore'
import { renderDrillToCanvas } from './renderDrill'

/** The drill as shown in the editor: flat, or in perspective when the 3D view is on. */
async function renderForExport(background: string | null): Promise<HTMLCanvasElement> {
  const canvas = await renderDrillToCanvas()
  const tilt = exportTilt()
  return tilt === null ? canvas : warpCanvas(canvas, tilt, background)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht erzeugt werden.'))),
      type,
      quality,
    )
  })
}

export async function exportPng(): Promise<void> {
  // PNG keeps the area around the tilted pitch transparent.
  const canvas = await renderForExport(null)
  const blob = await canvasToBlob(canvas, 'image/png')
  downloadBlob(blob, `${fileNameFromTitle(useDrillStore.getState().title)}.png`)
}

/** Draws title, field image and (optional) description onto the current PDF page. */
export function drawDrillPage(
  doc: JsPDF,
  layout: PdfLayout,
  title: string,
  canvas: HTMLCanvasElement,
  description: string,
): void {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(0)
  const titleLine = doc.splitTextToSize(title, layout.title.maxWidth)[0] ?? ''
  doc.text(titleLine, layout.title.x, layout.title.y)
  // JPEG keeps the file small; the grass and lines survive compression well.
  doc.addImage(
    canvas.toDataURL('image/jpeg', 0.92),
    'JPEG',
    layout.image.x,
    layout.image.y,
    layout.image.width,
    layout.image.height,
  )
  if (layout.description && description.trim()) {
    const box = layout.description
    const fontSize = 11
    const lineHeight = fontSize * 0.3528 * 1.35 // pt to mm, with line spacing
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    const allLines: string[] = doc.splitTextToSize(description.trim(), box.maxWidth)
    const maxLines = Math.max(1, Math.floor(box.maxHeight / lineHeight))
    const lines =
      allLines.length > maxLines
        ? [...allLines.slice(0, maxLines - 1), `${allLines[maxLines - 1]} …`]
        : allLines
    doc.text(lines, box.x, box.y + lineHeight, { lineHeightFactor: 1.35 })
  }
}

export async function exportPdf(): Promise<void> {
  // Loaded on demand so jsPDF does not slow down the app start.
  // White around the tilted pitch, so the printed page has no black corners.
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), renderForExport('#ffffff')])
  const { title, description: text, info } = useDrillStore.getState()
  const description = [drillInfoLine(info), text.trim()].filter(Boolean).join('\n\n')
  const layout = pdfLayout(canvas.width, canvas.height, description !== '')

  const doc = new jsPDF({ orientation: layout.orientation, unit: 'mm', format: 'a4' })
  doc.setProperties({ title })
  drawDrillPage(doc, layout, title, canvas, description)
  doc.save(`${fileNameFromTitle(title)}.pdf`)
}

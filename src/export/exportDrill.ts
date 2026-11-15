import { fileNameFromTitle } from '../model/serialize'
import { useDrillStore } from '../store/drillStore'
import { downloadBlob } from './download'
import { pdfLayout } from './layout'
import { renderDrillToCanvas } from './renderDrill'

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
  const canvas = await renderDrillToCanvas()
  const blob = await canvasToBlob(canvas, 'image/png')
  downloadBlob(blob, `${fileNameFromTitle(useDrillStore.getState().title)}.png`)
}

export async function exportPdf(): Promise<void> {
  // Loaded on demand so jsPDF does not slow down the app start.
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), renderDrillToCanvas()])
  const { title } = useDrillStore.getState()
  const layout = pdfLayout(canvas.width, canvas.height)

  const doc = new jsPDF({ orientation: layout.orientation, unit: 'mm', format: 'a4' })
  doc.setProperties({ title })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
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
  doc.save(`${fileNameFromTitle(title)}.pdf`)
}

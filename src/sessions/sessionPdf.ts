import { drawDrillPage } from '../export/exportDrill'
import { pdfLayout } from '../export/layout'
import { renderSceneToCanvas } from '../export/renderDrill'
import type { LibraryEntry } from '../library/library'
import { listEntries } from '../library/libraryDb'
import { drillInfoLine } from '../model/drillInfo'
import { fileNameFromTitle } from '../model/serialize'
import { scheduleRows, sessionMetaLine, totalMinutes, type TrainingSession } from './session'

const MARGIN = 15
const PAGE_WIDTH = 210
const PAGE_BOTTOM = 297 - MARGIN
const TIME_COL = MARGIN
const TITLE_COL = MARGIN + 30
const DURATION_COL = PAGE_WIDTH - MARGIN
const TITLE_WIDTH = DURATION_COL - 20 - TITLE_COL
const MM_PER_PT = 0.3528

/**
 * PDF of a training session: an overview page with the schedule, followed by one page
 * per drill (image, description and the block's notes).
 */
export async function exportSessionPdf(session: TrainingSession): Promise<void> {
  const [{ jsPDF }, entries] = await Promise.all([import('jspdf'), listEntries()])
  const byId = new Map<string, LibraryEntry>(entries.map((e) => [e.id, e]))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setProperties({ title: session.title })

  let y = MARGIN + 7
  const ensureSpace = (height: number) => {
    if (y + height > PAGE_BOTTOM) {
      doc.addPage('a4', 'portrait')
      y = MARGIN + 5
    }
  }
  const paragraph = (text: string, fontSize: number, style: 'normal' | 'bold', gray = 0) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(fontSize)
    doc.setTextColor(gray)
    const lineHeight = fontSize * MM_PER_PT * 1.3
    for (const line of doc.splitTextToSize(text, PAGE_WIDTH - 2 * MARGIN) as string[]) {
      ensureSpace(lineHeight)
      doc.text(line, MARGIN, y)
      y += lineHeight
    }
  }

  paragraph(session.title, 20, 'bold')
  const meta = sessionMetaLine(session)
  if (meta) paragraph(meta, 11, 'normal', 90)
  y += 3
  if (session.goal.trim()) paragraph(`Ziel: ${session.goal.trim()}`, 11, 'normal')
  if (session.notes.trim()) paragraph(session.notes.trim(), 11, 'normal')
  y += 4

  // Schedule table
  doc.setDrawColor(180)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0)
  ensureSpace(8)
  doc.text('Zeit', TIME_COL, y)
  doc.text('Inhalt', TITLE_COL, y)
  doc.text('Dauer', DURATION_COL, y, { align: 'right' })
  y += 2
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 5

  const rows = scheduleRows(session)
  for (const row of rows) {
    const entry = row.block.drillId ? byId.get(row.block.drillId) : undefined
    const missing = row.block.drillId !== null && !entry
    const title = `${row.number}. ${entry?.drill.title ?? row.block.title}${missing ? ' (nicht mehr in der Bibliothek)' : ''}`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const titleLines = doc.splitTextToSize(title, TITLE_WIDTH) as string[]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const noteLines = row.block.notes.trim()
      ? (doc.splitTextToSize(row.block.notes.trim(), TITLE_WIDTH) as string[])
      : []
    const height = titleLines.length * 5 + noteLines.length * 4 + 3
    ensureSpace(height)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text(row.time, TIME_COL, y)
    doc.text(`${row.block.durationMin} min`, DURATION_COL, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(titleLines, TITLE_COL, y)
    let rowY = y + titleLines.length * 5
    if (noteLines.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(90)
      doc.text(noteLines, TITLE_COL, rowY - 1)
      rowY += noteLines.length * 4
    }
    y = rowY + 1
    doc.line(MARGIN, y - 3, PAGE_WIDTH - MARGIN, y - 3)
    y += 2
  }
  ensureSpace(8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text(`Gesamtdauer: ${totalMinutes(session)} min`, DURATION_COL, y + 2, { align: 'right' })

  // One page per drill
  for (const row of rows) {
    const entry = row.block.drillId ? byId.get(row.block.drillId) : undefined
    if (!entry) continue
    const canvas = await renderSceneToCanvas(entry.drill.fieldType, entry.drill.pitch, entry.drill.scenes[0])
    const description = [
      drillInfoLine(entry.drill.info),
      entry.drill.description.trim(),
      row.block.notes.trim() ? `Hinweis für diese Einheit: ${row.block.notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    const layout = pdfLayout(canvas.width, canvas.height, description !== '')
    doc.addPage('a4', layout.orientation)
    drawDrillPage(doc, layout, `${row.number}. ${entry.drill.title} (${row.time})`, canvas, description)
  }

  doc.save(`${fileNameFromTitle(session.title)}.pdf`)
}

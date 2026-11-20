import { fileNameFromTitle } from '../model/serialize'
import { formatDate } from '../sessions/session'
import type { ClubSettings } from '../settings/clubSettings'
import { currentScene, useDrillStore } from '../store/drillStore'
import { renderSceneToCanvas } from './renderDrill'
import { dotGrid, fitImage, SHEET_WIDTH, sheetLayout, type SheetVariant } from './tacticSheet'

export interface TacticSheetOptions {
  variant: SheetVariant
  topic: string
  /** YYYY-MM-DD or empty */
  date: string
  /** The scene shown in the editor, or an empty field to draw on by hand */
  content: 'scene' | 'empty'
  /** White pitch with dark lines (saves ink, good for writing on) */
  printFriendly: boolean
  club: ClubSettings
}

const MARGIN = 12
const FRAME_COLOR = 170
const DOT_COLOR = 190

/** Printable A4 tactic sheet with fields, dotted note areas, date, topic and club crest. */
export async function exportTacticSheet(options: TacticSheetOptions): Promise<void> {
  const state = useDrillStore.getState()
  const pitch = options.printFriendly ? { ...state.pitch, color: 'white' as const } : state.pitch
  const scene =
    options.content === 'scene'
      ? currentScene(state)
      : { durationMs: 0, items: [], lines: [], zones: [] }
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), renderSceneToCanvas(state.fieldType, pitch, scene, undefined, state.images)])
  const image = canvas.toDataURL('image/jpeg', 0.92)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setProperties({ title: `Taktikblatt ${options.topic}`.trim() })

  // Header: club name, title, date and topic, crest on the right
  doc.setTextColor(110)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  if (options.club.name) doc.text(options.club.name.toUpperCase(), MARGIN, MARGIN + 3, { charSpace: 0.6 })
  doc.setTextColor(20)
  doc.setFontSize(15)
  doc.text('Taktikblatt', MARGIN, MARGIN + 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setDrawColor(120)
  doc.setLineWidth(0.2)
  const dateX = MARGIN + 52
  doc.text('Datum:', dateX, MARGIN + 10)
  doc.line(dateX + 13, MARGIN + 11, dateX + 50, MARGIN + 11)
  if (options.date) doc.text(formatDate(options.date), dateX + 14, MARGIN + 10)
  const topicX = dateX + 60
  const topicEnd = SHEET_WIDTH - MARGIN - (options.club.logo ? 24 : 0)
  doc.text('Thema:', topicX, MARGIN + 10)
  doc.line(topicX + 13, MARGIN + 11, topicEnd, MARGIN + 11)
  if (options.topic) {
    const topic = doc.splitTextToSize(options.topic, topicEnd - topicX - 15)[0] ?? ''
    doc.text(topic, topicX + 14, MARGIN + 10)
  }
  if (options.club.logo) {
    const { dataUrl, width, height } = options.club.logo
    const size = 16
    const scale = size / Math.max(width, height)
    doc.addImage(dataUrl, 'PNG', SHEET_WIDTH - MARGIN - width * scale, MARGIN - 2, width * scale, height * scale)
  }

  // Fields and note areas
  const layout = sheetLayout(options.variant)
  doc.setDrawColor(FRAME_COLOR)
  doc.setLineWidth(0.3)
  for (const box of layout.fields) {
    doc.roundedRect(box.x, box.y, box.width, box.height, 3, 3, 'S')
    const fit = fitImage(box, canvas.width, canvas.height)
    doc.addImage(image, 'JPEG', fit.x, fit.y, fit.width, fit.height)
  }
  for (const box of layout.notes) {
    doc.setDrawColor(FRAME_COLOR)
    doc.roundedRect(box.x, box.y, box.width, box.height, 3, 3, 'S')
    doc.setFillColor(DOT_COLOR, DOT_COLOR, DOT_COLOR)
    for (const dot of dotGrid(box)) doc.circle(dot.x, dot.y, 0.22, 'F')
  }

  doc.save(`${fileNameFromTitle(`Taktikblatt ${options.topic}`.trim())}.pdf`)
}

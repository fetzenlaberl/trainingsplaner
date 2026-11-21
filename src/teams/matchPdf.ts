import { downloadBlob } from '../export/download'
import { fileNameFromTitle } from '../model/serialize'
import {
  dateText,
  eventText,
  halfTimeText,
  matchPlayerLabel,
  matchTitle,
  scoreText,
  sortedEvents,
  type Match,
} from './match'

const MARGIN = 18
const PAGE_HEIGHT = 297
const LINE = 5.6

/** Match report as an A4 PDF (text only, readable when printed in black and white). */
export async function exportMatchPdf(match: Match, teamName: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const title = matchTitle(match, teamName)
  doc.setProperties({ title: `Spielbericht ${title}` })
  const width = 210 - 2 * MARGIN
  let y = MARGIN

  const ensure = (height: number) => {
    if (y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }
  const text = (value: string, size = 11, style: 'normal' | 'bold' = 'normal', x = MARGIN) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const lines: string[] = doc.splitTextToSize(value, width - (x - MARGIN))
    for (const line of lines) {
      ensure(LINE)
      doc.text(line, x, y)
      y += size * 0.3528 * 1.4
    }
  }
  const heading = (value: string) => {
    y += 3
    ensure(LINE * 2)
    text(value, 13, 'bold')
    doc.setDrawColor(180)
    doc.line(MARGIN, y - 3.2, MARGIN + width, y - 3.2)
    y += 1
  }

  doc.setTextColor(0)
  text('Spielbericht', 10)
  text([dateText(match.date), match.time, match.competition].filter(Boolean).join(' · '), 10)
  y += 2
  text(title, 18, 'bold')
  const half = halfTimeText(match)
  text(`${scoreText(match)}${half ? `  (Halbzeit ${half})` : ''}`, 22, 'bold')
  text(match.venue === 'home' ? 'Heimspiel' : 'Auswärtsspiel', 10)

  const starters = match.players.filter((p) => p.role === 'starter')
  const bench = match.players.filter((p) => p.role === 'bench')
  heading(`Startelf (${starters.length})`)
  text(starters.map(matchPlayerLabel).join(', ') || '–')
  heading(`Ersatzbank (${bench.length})`)
  text(bench.map(matchPlayerLabel).join(', ') || '–')

  heading('Spielverlauf')
  const events = sortedEvents(match.events)
  if (events.length === 0) text('Keine Ereignisse eingetragen.')
  for (const event of events) {
    ensure(LINE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(event.minute ? `${event.minute}.` : '–', MARGIN, y)
    text(eventText(event, match.players), 11, 'normal', MARGIN + 16)
  }

  if (match.notes.trim()) {
    heading('Notizen')
    text(match.notes.trim())
  }

  const name = fileNameFromTitle(`Spielbericht ${match.date} ${match.opponent}`)
  downloadBlob(doc.output('blob'), `${name}.pdf`)
}

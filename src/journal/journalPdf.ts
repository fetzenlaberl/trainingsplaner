import { downloadBlob } from '../export/download'
import { fileNameFromTitle } from '../model/serialize'
import { dateTimeText, entryTitle, type JournalEntry } from './journal'

const MARGIN = 18
const PAGE_HEIGHT = 297

/** Journal entries as an A4 PDF (text only); each entry starts on a new page. */
export async function exportJournalPdf(entries: JournalEntry[], fileTitle: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setProperties({ title: fileTitle })
  const width = 210 - 2 * MARGIN
  let y = MARGIN

  const text = (value: string, size: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const lineHeight = size * 0.3528 * 1.4
    for (const paragraph of value.split('\n')) {
      const lines: string[] = paragraph === '' ? [''] : doc.splitTextToSize(paragraph, width)
      for (const line of lines) {
        if (y + lineHeight > PAGE_HEIGHT - MARGIN) {
          doc.addPage()
          y = MARGIN
        }
        doc.text(line, MARGIN, y)
        y += lineHeight
      }
    }
  }

  entries.forEach((entry, i) => {
    if (i > 0) {
      doc.addPage()
      y = MARGIN
    }
    text(entryTitle(entry), 16, 'bold')
    y += 1
    doc.setTextColor(100)
    text(`Erstellt ${dateTimeText(entry.createdAt)} · geändert ${dateTimeText(entry.updatedAt)}`, 9)
    if (entry.tags.length > 0) text(`Schlagwörter: ${entry.tags.join(', ')}`, 9)
    doc.setTextColor(0)
    y += 3
    text(entry.text.trim() || '–', 11)
  })

  downloadBlob(doc.output('blob'), `${fileNameFromTitle(fileTitle)}.pdf`)
}

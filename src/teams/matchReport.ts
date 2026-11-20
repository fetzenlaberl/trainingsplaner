// Reads shirt numbers and names from the text of a match report PDF (e.g. printed from
// the association's website). Only number, name, keeper and starting eleven are taken;
// everything else on the sheet (dates, officials, phone numbers, goals) is ignored.

import type { CsvPlayer } from './teamCsv'

/** One piece of text on a PDF page (PDF units, y grows upwards). */
export interface PdfTextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
}

/** A team found in the report: its column on the sheet and its players. */
export interface ReportTeam {
  label: string
  players: CsvPlayer[]
}

interface Cell {
  text: string
  x: number
  y: number
  page: number
  /** Running number of the text line the cell belongs to */
  line: number
}

/** Codes in the number column that mark a goalkeeper without a shirt number */
const KEEPER_CODES = new Set(['T', 'TW', 'ET', 'TH', 'GK'])
/** Heading of the substitutes' part of a column */
const SUBSTITUTES = /^(ersatz|ersatzspieler|auswechselspieler|reserve|ersatzbank)\b/i
/** A name: letters, spaces, hyphens, apostrophes and dots, starting with a letter */
const NAME = /^\p{L}[\p{L}\p{M}'’.\- ]*\p{L}\.?$/u
/** Words that look like names but are table headings */
const NOT_NAMES = new Set(['spieler', 'name', 'ersatz', 'tore', 'nr', 'rnr', 'trainer'])

/** Groups text pieces into lines and splits each line into cells at wide gaps. */
export function textCells(pages: PdfTextItem[][]): Cell[] {
  const cells: Cell[] = []
  let lineNumber = 0
  pages.forEach((items, page) => {
    const visible = items.filter((i) => i.str.trim() !== '' && i.height > 0)
    // Lines: pieces at (nearly) the same height.
    const lines: PdfTextItem[][] = []
    for (const item of [...visible].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const line = lines.find((l) => Math.abs(l[0].y - item.y) <= Math.max(1, l[0].height * 0.4))
      if (line) line.push(item)
      else lines.push([item])
    }
    for (const line of lines) {
      lineNumber++
      line.sort((a, b) => a.x - b.x)
      let current: Cell | null = null
      let end = 0
      for (const item of line) {
        const gap = item.x - end
        const wordGap = item.height * 0.15
        const cellGap = item.height * 0.6
        if (current && gap <= cellGap) {
          // Pieces of one word are often split by the PDF; a small gap is a space.
          current.text += (gap > wordGap && !current.text.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str
        } else {
          current = { text: item.str, x: item.x, y: item.y, page, line: lineNumber }
          cells.push(current)
        }
        end = item.x + item.width
      }
    }
  })
  for (const cell of cells) cell.text = cell.text.replace(/\s+/g, ' ').trim()
  return cells.filter((c) => c.text !== '')
}

function cleanName(text: string): string | null {
  // Captain marks and similar notes in brackets are not part of the name.
  const name = text.replace(/\((k|c|tw|kapitän)\)/gi, '').replace(/\s+/g, ' ').trim()
  if (name.length < 3 || name.length > 60 || !NAME.test(name)) return null
  if (NOT_NAMES.has(name.toLowerCase())) return null
  return name
}

interface Entry {
  number: string
  name: string
  keeper: boolean
  x: number
  y: number
  page: number
}

/** Rows "number | name" (or "7 Max Muster" in one cell) found anywhere on the pages. */
function playerEntries(cells: Cell[]): Entry[] {
  const entries: Entry[] = []
  const byLine = new Map<number, Cell[]>()
  for (const cell of cells) byLine.set(cell.line, [...(byLine.get(cell.line) ?? []), cell])
  for (const line of byLine.values()) {
    line.sort((a, b) => a.x - b.x)
    line.forEach((cell, i) => {
      const code = cell.text.toUpperCase()
      const isNumber = /^\d{1,2}$/.test(cell.text)
      if ((isNumber || KEEPER_CODES.has(code)) && line[i + 1]) {
        const name = cleanName(line[i + 1].text)
        if (name) {
          entries.push({
            number: isNumber ? String(Number(cell.text)) : '',
            name,
            keeper: !isNumber,
            x: cell.x,
            y: cell.y,
            page: cell.page,
          })
        }
        return
      }
      // "7 Max Muster" in one cell ("10. Runde" with a dot is not a player).
      const joined = /^(\d{1,2})\s+(.+)$/.exec(cell.text)
      if (joined) {
        const name = cleanName(joined[2])
        if (name) entries.push({ number: String(Number(joined[1])), name, keeper: false, x: cell.x, y: cell.y, page: cell.page })
      }
    })
  }
  return entries
}

/** A column needs this many rows to count as a team (single matches are other text). */
const MIN_TEAM_ROWS = 3

/** Splits x positions into columns wherever they are far apart. */
function columnStarts(xs: number[], minGap: number): number[] {
  const sorted = [...new Set(xs.map((x) => Math.round(x)))].sort((a, b) => a - b)
  const starts: number[] = []
  for (const x of sorted) if (starts.length === 0 || x - (starts[starts.length - 1] ?? 0) > minGap) starts.push(x)
  return starts
}

/**
 * Teams in a match report: one per column of player rows (home on the left, away on the
 * right). Rows below an "Ersatz" heading of the same column are substitutes.
 */
export function parseMatchReport(pages: PdfTextItem[][]): ReportTeam[] {
  const cells = textCells(pages)
  const found = playerEntries(cells)
  // Columns: row starts more than 80 PDF units apart (about a seventh of the page width);
  // a column with only a few rows is other text (e.g. "2 Landesliga") and is left out.
  const columnsOf = (list: Entry[]) => {
    const starts = columnStarts(
      list.map((e) => e.x),
      80,
    )
    const columnOf = (x: number) => {
      let index = 0
      starts.forEach((start, i) => {
        if (x >= start - 40) index = i
      })
      return index
    }
    return { starts, columnOf }
  }
  const all = columnsOf(found)
  const entries = found.filter((e) => found.filter((o) => all.columnOf(o.x) === all.columnOf(e.x)).length >= MIN_TEAM_ROWS)
  if (entries.length === 0) return []
  const { starts, columnOf } = columnsOf(entries)
  const headings = cells.filter((c) => SUBSTITUTES.test(c.text))
  const below = (a: { page: number; y: number }, b: { page: number; y: number }) => a.page > b.page || (a.page === b.page && a.y < b.y)

  const teams = starts.map((_, column) => {
    const own = entries
      .filter((e) => columnOf(e.x) === column)
      .sort((a, b) => a.page - b.page || b.y - a.y)
    // The substitutes' heading of this column: above some of its rows, nearest to them.
    const first = own[0]
    const last = own[own.length - 1]
    const heading = headings.find((h) => {
      const sameColumn = starts.length === 1 || columnOf(h.x) === column
      return sameColumn && first && last && below(h, first) && below(last, h)
    })
    const players: CsvPlayer[] = own.map((e) => ({
      number: e.number,
      name: e.name,
      position: e.keeper ? 'TW' : null,
      starter: heading ? !below(e, heading) : null,
    }))
    return players
  })
  const labels =
    teams.length === 2 ? ['Heim (linke Spalte)', 'Gast (rechte Spalte)'] : teams.map((_, i) => `Spalte ${i + 1}`)
  return teams
    .map((players, i) => ({ label: labels[i] ?? `Spalte ${i + 1}`, players }))
    .filter((t) => t.players.length > 0)
}

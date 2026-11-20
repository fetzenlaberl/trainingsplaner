// Import of squad lists from CSV files (e.g. saved from Excel). Only number, name,
// position and starting eleven are read; all other columns are ignored on purpose.

import { POSITIONS, type Position } from './team'

export interface CsvPlayer {
  number: string
  name: string
  position: Position | null
  /** null = the file has no starting-eleven column */
  starter: boolean | null
}

export interface CsvResult {
  players: CsvPlayer[]
  /** Rows that had neither a number nor a name */
  skipped: number
}

/** Decodes the file: UTF-8, or Windows-1252 (what Excel on Windows often writes). */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Splits CSV text into rows and cells; handles quotes, "" inside quotes and line breaks in quotes. */
export function parseCsvRows(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === separator) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** German Excel uses ";", others ","; tabs also occur. Picks the most frequent one in the first line. */
export function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const counts = [';', ',', '\t'].map((sep) => ({ sep, count: firstLine.split(sep).length - 1 }))
  counts.sort((a, b) => b.count - a.count)
  return counts[0].count > 0 ? counts[0].sep : ';'
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/[.:#]/g, '').replace(/\s+/g, ' ')

type Column = 'number' | 'name' | 'firstName' | 'lastName' | 'position' | 'starter'

const HEADER_NAMES: Record<Column, string[]> = {
  number: ['nummer', 'nr', 'rückennummer', 'rueckennummer', 'trikot', 'trikotnummer', 'number', 'no', ''],
  name: ['name', 'spieler', 'spielername', 'player'],
  firstName: ['vorname', 'first name', 'firstname'],
  lastName: ['nachname', 'familienname', 'last name', 'lastname', 'surname'],
  position: ['position', 'pos', 'positionen'],
  starter: ['startelf', 'start', 'starter', 'stammspieler', 'stamm', 'startformation'],
}

function columnOf(header: string): Column | null {
  const h = normalize(header)
  for (const [column, names] of Object.entries(HEADER_NAMES) as [Column, string[]][]) {
    if (names.includes(h)) return column
  }
  return null
}

const POSITION_ALIASES: Record<string, Position> = {
  tm: 'TW',
  tormann: 'TW',
  torhüter: 'TW',
  goalkeeper: 'TW',
  gk: 'TW',
  innenverteidigung: 'IV',
  verteidiger: 'IV',
  stürmer: 'ST',
  sturm: 'ST',
  mittelstürmer: 'ST',
}

/** Position from a code ("ST"), a name ("Stürmer") or a common alias ("TM"); null if unknown. */
export function parsePosition(value: string): Position | null {
  const v = normalize(value)
  if (v === '') return null
  // Code ("ST"), name ("Stürmer", "6er") or both as shown in the app ("ZDM · 6er", "ZDM - 6er")
  const found = POSITIONS.find(
    (p) =>
      p.code.toLowerCase() === v ||
      p.name.toLowerCase() === v ||
      [' · ', ' - ', ' ', '-'].some((sep) => `${p.label}${sep}${p.name}`.toLowerCase() === v),
  )
  return found?.code ?? POSITION_ALIASES[v] ?? null
}

const YES = ['ja', 'j', 'x', '1', 'true', 'yes', 'y', '✓', '✔', 'wahr']

export function parseStarter(value: string): boolean {
  return YES.includes(normalize(value))
}

/** Reads players from CSV text. Without a recognizable header row, the columns are Nummer, Name, Position, Startelf. */
export function parsePlayersCsv(text: string): CsvResult {
  const clean = text.replace(/^﻿/, '')
  const rows = parseCsvRows(clean, detectSeparator(clean))
  if (rows.length === 0) return { players: [], skipped: 0 }

  const headerColumns = rows[0].map(columnOf)
  const hasHeader = headerColumns.some((c) => c !== null && c !== 'number') || headerColumns.includes('name')
  const columns: (Column | null)[] = hasHeader ? headerColumns : ['number', 'name', 'position', 'starter']
  const dataRows = hasHeader ? rows.slice(1) : rows
  const index = (column: Column) => columns.indexOf(column)
  const cell = (row: string[], column: Column) => {
    const i = index(column)
    return i >= 0 ? (row[i] ?? '').trim() : ''
  }
  const hasStarterColumn = index('starter') >= 0

  const players: CsvPlayer[] = []
  let skipped = 0
  for (const row of dataRows) {
    const fullName = [cell(row, 'firstName'), cell(row, 'lastName')].filter(Boolean).join(' ')
    const name = cell(row, 'name') || fullName
    const number = cell(row, 'number').replace(/^#/, '')
    if (name === '' && number === '') {
      skipped++
      continue
    }
    players.push({
      number,
      name,
      position: parsePosition(cell(row, 'position')),
      starter: hasStarterColumn ? parseStarter(cell(row, 'starter')) : null,
    })
  }
  return { players, skipped }
}

/** Example file for "Vorlage herunterladen" (with BOM so Excel shows umlauts correctly). */
export const CSV_TEMPLATE =
  '﻿Nummer;Name;Position;Startelf\r\n' +
  '1;Max Muster;TW;ja\r\n' +
  '4;Jonas Beispiel;IV;ja\r\n' +
  '9;Lukas Müller;ST;ja\r\n' +
  '12;Felix Huber;TW;nein\r\n'

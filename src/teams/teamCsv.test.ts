import { describe, expect, it } from 'vitest'
import { createTeam, importPlayers } from './team'
import { CSV_TEMPLATE, decodeCsv, detectSeparator, parseCsvRows, parsePlayersCsv, parsePosition } from './teamCsv'

describe('parseCsvRows', () => {
  it('handles quotes, escaped quotes, separators and line breaks inside quotes', () => {
    const rows = parseCsvRows('a;"b;c";"say ""hi"""\r\n"multi\nline";x\n\n', ';')
    expect(rows).toEqual([
      ['a', 'b;c', 'say "hi"'],
      ['multi\nline', 'x'],
    ])
  })
})

describe('detectSeparator', () => {
  it('detects semicolon, comma and tab', () => {
    expect(detectSeparator('Nr;Name;Position')).toBe(';')
    expect(detectSeparator('Nr,Name,Position')).toBe(',')
    expect(detectSeparator('Nr\tName')).toBe('\t')
  })
})

describe('decodeCsv', () => {
  it('reads UTF-8 and falls back to Windows-1252 (Excel)', () => {
    expect(decodeCsv(new TextEncoder().encode('Müller').buffer)).toBe('Müller')
    // "Müller" in Windows-1252: ü = 0xFC
    expect(decodeCsv(new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]).buffer)).toBe('Müller')
  })
})

describe('parsePosition', () => {
  it('accepts codes, names and common aliases', () => {
    expect(parsePosition('st')).toBe('ST')
    expect(parsePosition('Torwart')).toBe('TW')
    expect(parsePosition('TM')).toBe('TW')
    expect(parsePosition('Linksaußen')).toBe('LA')
    expect(parsePosition('Libero')).toBeNull()
    expect(parsePosition('')).toBeNull()
  })
})

describe('parsePlayersCsv', () => {
  it('reads the template', () => {
    const { players, skipped } = parsePlayersCsv(CSV_TEMPLATE)
    expect(skipped).toBe(0)
    expect(players).toHaveLength(4)
    expect(players[2]).toEqual({ number: '9', name: 'Lukas Müller', position: 'ST', starter: true })
    expect(players[3].starter).toBe(false)
  })

  it('finds columns by header in any order and ignores other columns', () => {
    const csv = 'Geburtsdatum,Nachname,Vorname,Nr.,Telefon,Pos\n2010-01-01,Huber,Felix,7,0664123,RM\n'
    const { players } = parsePlayersCsv(csv)
    expect(players).toEqual([{ number: '7', name: 'Felix Huber', position: 'RM', starter: null }])
    expect(JSON.stringify(players)).not.toContain('0664123')
    expect(JSON.stringify(players)).not.toContain('2010')
  })

  it('uses Nummer, Name, Position, Startelf without a header row', () => {
    const { players } = parsePlayersCsv('10;Anna Berger;ZOM;x\n11;Ben Wolf;;\n')
    expect(players).toEqual([
      { number: '10', name: 'Anna Berger', position: 'ZOM', starter: true },
      { number: '11', name: 'Ben Wolf', position: null, starter: false },
    ])
  })

  it('skips rows without number and name', () => {
    const { players, skipped } = parsePlayersCsv('Nummer;Name;Position\n;;ST\n5;Tom;IV\n')
    expect(players.map((p) => p.name)).toEqual(['Tom'])
    expect(skipped).toBe(1)
  })
})

describe('importPlayers', () => {
  const imported = Array.from({ length: 13 }, (_, i) => ({
    number: String(i + 1),
    name: `S${i + 1}`,
    position: null,
    starter: null,
  }))

  it('replaces the squad and fills the starting eleven up to 11', () => {
    const team = importPlayers(createTeam(0, '#fff'), imported, 'replace')
    expect(team.players).toHaveLength(13)
    expect(team.players.filter((p) => p.starter)).toHaveLength(11)
    expect(new Set(team.players.map((p) => p.id)).size).toBe(13)
  })

  it('appends to existing players and keeps explicit starter flags', () => {
    const base = importPlayers(createTeam(0, '#fff'), imported.slice(0, 2), 'replace')
    const team = importPlayers(base, [{ number: '99', name: 'Neu', position: 'ST', starter: false }], 'append')
    expect(team.players.map((p) => p.name)).toEqual(['S1', 'S2', 'Neu'])
    expect(team.players[2].starter).toBe(false)
  })
})

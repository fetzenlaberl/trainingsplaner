import { describe, expect, it } from 'vitest'
import { parseMatchReport, textCells, type PdfTextItem } from './matchReport'

const H = 5.3
/** A text piece; width roughly from the number of characters. */
const t = (str: string, x: number, y: number): PdfTextItem => ({ str, x, y, width: str.length * 2.4, height: H })
/** A word split into pieces without gaps, as PDFs printed from web pages often do. */
const split = (parts: string[], x: number, y: number): PdfTextItem[] => {
  let at = x
  return parts.map((part) => {
    const item = t(part, at, y)
    at += item.width
    return item
  })
}
/** A table row: number (or keeper code) and a name of one or more words. */
const row = (number: string, name: string[], x: number, y: number): PdfTextItem[] => {
  const items = [t(number, x, y)]
  let at = x + 11
  for (const word of name) {
    items.push(t(word, at, y))
    at += word.length * 2.4 + 1.5
  }
  return items
}

// Made-up report in the layout of the association's website: home left, away right.
const page: PdfTextItem[] = [
  ...split(['2', '. Landesliga'], 114, 737),
  ...split(['1', '0. Runde'], 181, 737),
  t('Heimverein', 164, 698),
  t('Gastverein', 409, 698),
  t('RNr', 60, 687),
  t('Spieler', 131, 687),
  t('RNr', 305, 687),
  t('Spieler', 375, 687),
  ...row('T', ['Anton', 'Adler'], 63, 678),
  ...row('05', ['Bernd', 'Berger'], 63, 669),
  t('X', 223, 669),
  ...split(['1', '0'], 63, 660),
  ...split(['Cle', 'm', 'ens'], 74, 660),
  t('Clausen', 92, 660),
  t('HZ', 231, 660),
  ...row('T', ['Erik', 'Engel'], 308, 678),
  ...row('03', ['Felix', 'Falk'], 308, 669),
  ...row('11', ['Georg', 'Graf'], 308, 660),
  t('Ersatz', 172, 640),
  t('Ersatz', 416, 640),
  ...row('ET', ['Hans', 'Huber'], 63, 630),
  ...row('14', ['Ivo', 'Igel'], 63, 621),
  ...row('16', ['Jan', 'Jäger-Lang'], 308, 630),
  ...row('TR', ['Karl', 'Koch', '(+43', '600', '0000)'], 63, 600),
  ...row('SL', ['Lukas', 'Lenz'], 308, 600),
]

describe('textCells', () => {
  it('joins split words and keeps cells apart', () => {
    const texts = textCells([page]).map((c) => c.text)
    expect(texts).toContain('Clemens Clausen')
    expect(texts).toContain('10')
    expect(texts).toContain('10. Runde')
  })
})

describe('parseMatchReport', () => {
  const teams = parseMatchReport([page])

  it('finds home and away team in their columns', () => {
    expect(teams.map((team) => team.label)).toEqual(['Heim (linke Spalte)', 'Gast (rechte Spalte)'])
    expect(teams[0].players.map((p) => `${p.number} ${p.name}`)).toEqual([
      ' Anton Adler',
      '5 Bernd Berger',
      '10 Clemens Clausen',
      ' Hans Huber',
      '14 Ivo Igel',
    ])
    expect(teams[1].players.map((p) => p.name)).toEqual(['Erik Engel', 'Felix Falk', 'Georg Graf', 'Jan Jäger-Lang'])
  })

  it('marks keepers and substitutes', () => {
    const [home] = teams
    expect(home.players[0]).toMatchObject({ position: 'TW', starter: true })
    expect(home.players[1]).toMatchObject({ position: null, starter: true })
    expect(home.players[3]).toMatchObject({ position: 'ET', starter: false })
    expect(home.players[4]).toMatchObject({ starter: false })
  })

  it('ignores officials, league and round', () => {
    const names = teams.flatMap((team) => team.players.map((p) => p.name))
    expect(names).not.toContain('Karl Koch')
    expect(names).not.toContain('Lukas Lenz')
    expect(names.some((n) => n.includes('Runde') || n.includes('Landesliga'))).toBe(false)
  })

  it('reads simple lists with number and name in one piece', () => {
    const list = [t('Kader', 50, 800), t('1 Anna Alt', 50, 780), t('7 Berta Bach', 50, 770), t('9 Clara Christ', 50, 760)]
    const [team] = parseMatchReport([list])
    expect(team.players.map((p) => [p.number, p.name])).toEqual([
      ['1', 'Anna Alt'],
      ['7', 'Berta Bach'],
      ['9', 'Clara Christ'],
    ])
    expect(team.players[0].starter).toBeNull()
  })

  it('returns nothing for text without player rows', () => {
    expect(parseMatchReport([[t('Spielbericht', 50, 800), t('Ergebnis 2:0', 50, 780)]])).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import {
  DrillFileError,
  emptyDrill,
  FILE_FORMAT,
  FILE_VERSION,
  fileNameFromTitle,
  parseDrill,
  serializeDrill,
} from './serialize'
import type { Drill } from './types'

const drill: Drill = {
  title: 'Torabschluss',
  description: 'Flanke und Abschluss',
  category: 'shooting',
  fieldType: 'half',
  pitch: { color: 'white', grid: 'positional' },
  scenes: [
    {
      durationMs: 2000,
      items: [
        { id: 'p1', type: 'player', x: 30, y: 20, rotation: 90, size: 1.5, shape: 'triangle', color: '#dc2626', label: '9', name: 'Müller', highlight: true },
        { id: 'b1', type: 'ball', x: 31, y: 20, rotation: 0, size: 1, shape: 'circle', color: '#ffffff', label: '', name: '', highlight: false },
      ],
      lines: [
        {
          id: 'l1',
          type: 'pass',
          points: [
            { x: 30, y: 20 },
            { x: 18, y: 22 },
            { x: 10, y: 34 },
          ],
          smooth: true,
          color: '#ffffff',
        },
        {
          id: 'l2',
          type: 'run',
          points: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
          smooth: false,
          color: '#facc15',
        },
      ],
      zones: [
        {
          id: 'z1',
          shape: 'rect',
          x: 20,
          y: 30,
          width: 25,
          height: 18,
          rotation: 15,
          color: '#facc15',
          fillColor: '#2563eb',
          fillOpacity: 0.4,
          dashed: true,
          label: 'Zone A',
        },
      ],
    },
  ],
}

/** Serializes, applies a change to the raw JSON object and serializes again. */
function tamper(change: (data: Record<string, any>) => void): string {
  const data = JSON.parse(serializeDrill(drill))
  change(data)
  return JSON.stringify(data)
}

function expectError(text: string, message: RegExp) {
  expect(() => parseDrill(text)).toThrow(DrillFileError)
  expect(() => parseDrill(text)).toThrow(message)
}

describe('serializeDrill / parseDrill', () => {
  it('round-trips a drill', () => {
    expect(parseDrill(serializeDrill(drill))).toEqual(drill)
  })

  it('round-trips an empty drill', () => {
    expect(parseDrill(serializeDrill(emptyDrill()))).toEqual(emptyDrill())
  })

  it('writes format and version into the file', () => {
    const data = JSON.parse(serializeDrill(drill))
    expect(data.format).toBe(FILE_FORMAT)
    expect(data.version).toBe(FILE_VERSION)
  })

  it('reads older files without a category', () => {
    const text = tamper((d) => {
      delete d.category
    })
    expect(parseDrill(text).category).toBeNull()
  })

  it('converts lines from version 1 files (start, end, control point)', () => {
    const text = tamper((d) => {
      d.version = 1
      d.scenes[0].lines[0].points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]
      d.scenes[0].lines[0].control = { x: 5, y: 8 }
      delete d.scenes[0].lines[0].smooth
      d.scenes[0].lines[1].control = null
      delete d.scenes[0].lines[1].smooth
    })
    const [curved, straight] = parseDrill(text).scenes[0].lines
    expect(curved.points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 4 },
      { x: 10, y: 0 },
    ])
    expect(curved.smooth).toBe(true)
    expect(curved).not.toHaveProperty('control')
    expect(straight.points).toHaveLength(2)
  })

  it('reads version 3 files without name tag, highlight and zone fill', () => {
    const text = tamper((d) => {
      d.version = 3
      delete d.scenes[0].items[0].name
      delete d.scenes[0].items[0].highlight
      delete d.scenes[0].zones[0].fillColor
      delete d.scenes[0].zones[0].fillOpacity
    })
    const scene = parseDrill(text).scenes[0]
    expect([scene.items[0].name, scene.items[0].highlight]).toEqual(['', false])
    expect(scene.zones[0].fillColor).toBe(scene.zones[0].color)
    expect(scene.zones[0].fillOpacity).toBe(0.22)
  })

  it('round-trips text boxes with multi-line text', () => {
    const textbox = {
      id: 't1',
      type: 'textbox' as const,
      x: 50,
      y: 10,
      rotation: 0,
      size: 1,
      shape: 'circle' as const,
      color: '#fde047',
      label: 'Erst passen,\ndann laufen!',
      name: '',
      highlight: false,
    }
    const withBox = { ...drill, scenes: [{ ...drill.scenes[0], items: [...drill.scenes[0].items, textbox] }] }
    expect(parseDrill(serializeDrill(withBox)).scenes[0].items[2]).toEqual(textbox)
  })

  it('reads older files without zones', () => {
    const text = tamper((d) => {
      d.version = 2
      delete d.scenes[0].zones
    })
    expect(parseDrill(text).scenes[0].zones).toEqual([])
  })

  it('clamps zone sizes to the allowed range', () => {
    const text = tamper((d) => {
      d.scenes[0].zones[0].width = 0
      d.scenes[0].zones[0].height = 9999
    })
    const [zone] = parseDrill(text).scenes[0].zones
    expect(zone.width).toBe(1)
    expect(zone.height).toBe(140)
  })

  it('reads older files without pitch style as green pitch without grid', () => {
    const text = tamper((d) => {
      delete d.pitch
    })
    expect(parseDrill(text).pitch).toEqual({ color: 'grass', grid: 'none' })
  })

  it('reads older files without player shape as circles', () => {
    const text = tamper((d) => {
      delete d.scenes[0].items[0].shape
    })
    expect(parseDrill(text).scenes[0].items[0].shape).toBe('circle')
  })

  it('reads older files without item size', () => {
    const text = tamper((d) => {
      delete d.scenes[0].items[0].size
    })
    expect(parseDrill(text).scenes[0].items[0].size).toBe(1)
  })

  it('clamps item sizes outside the allowed range', () => {
    const text = tamper((d) => {
      d.scenes[0].items[0].size = 99
    })
    expect(parseDrill(text).scenes[0].items[0].size).toBe(2.5)
  })

  it('drops unknown extra fields', () => {
    const text = tamper((d) => {
      d.scenes[0].items[0].extra = 'x'
    })
    expect(parseDrill(text).scenes[0].items[0]).not.toHaveProperty('extra')
  })
})

describe('parseDrill rejects invalid files', () => {
  it('rejects text that is not JSON', () => {
    expectError('hallo', /keine gültige JSON-Datei/)
  })

  it('rejects JSON from another program', () => {
    expectError('{"foo": 1}', /keine Übung aus dem Trainingsplaner/)
    expectError('[1, 2]', /keine Übung aus dem Trainingsplaner/)
  })

  it('rejects files from a newer version', () => {
    expectError(tamper((d) => (d.version = FILE_VERSION + 1)), /neueren Version/)
  })

  it.each<[string, (d: Record<string, any>) => void]>([
    ['missing title', (d) => delete d.title],
    ['unknown field type', (d) => (d.fieldType = 'beach')],
    ['no scenes', (d) => (d.scenes = [])],
    ['zero duration', (d) => (d.scenes[0].durationMs = 0)],
    ['unknown item type', (d) => (d.scenes[0].items[0].type = 'referee')],
    ['position not a number', (d) => (d.scenes[0].items[0].x = '30')],
    ['missing rotation', (d) => delete d.scenes[0].items[0].rotation],
    ['size not a number', (d) => (d.scenes[0].items[0].size = 'groß')],
    ['unknown player shape', (d) => (d.scenes[0].items[0].shape = 'star')],
    ['unknown pitch color', (d) => (d.pitch.color = 'pink')],
    ['unknown zone shape', (d) => (d.scenes[0].zones[0].shape = 'hexagon')],
    ['name not text', (d) => (d.scenes[0].items[0].name = 7)],
    ['highlight not yes/no', (d) => (d.scenes[0].items[0].highlight = 'ja')],
    ['fill opacity not a number', (d) => (d.scenes[0].zones[0].fillOpacity = 'halb')],
    ['zone without size', (d) => delete d.scenes[0].zones[0].width],
    ['zone id used twice', (d) => (d.scenes[0].zones[0].id = 'p1')],
    ['unknown grid', (d) => (d.pitch.grid = 'hexagons')],
    ['unknown line type', (d) => (d.scenes[0].lines[0].type = 'header')],
    ['line with one point', (d) => (d.scenes[0].lines[0].points = [{ x: 0, y: 0 }])],
    ['broken waypoint', (d) => (d.scenes[0].lines[0].points[1] = { x: 1 })],
    ['missing smooth flag', (d) => delete d.scenes[0].lines[0].smooth],
    [
      'old format with three points',
      (d) => {
        d.scenes[0].lines[0].control = null
        delete d.scenes[0].lines[0].smooth
      },
    ],
    [
      'old format with broken control point',
      (d) => {
        d.scenes[0].lines[1].control = { x: 1 }
        delete d.scenes[0].lines[1].smooth
      },
    ],
    ['duplicate ids', (d) => (d.scenes[0].items[1].id = 'p1')],
    ['unknown category', (d) => (d.category = 'fitness')],
  ])('rejects %s', (_name, change) => {
    expectError(tamper(change), /beschädigt oder unvollständig/)
  })
})

describe('fileNameFromTitle', () => {
  it('keeps normal titles including umlauts', () => {
    expect(fileNameFromTitle('Rondo 4 gegen 2 – Übung')).toBe('Rondo 4 gegen 2 – Übung')
  })

  it('removes characters that are not allowed in file names', () => {
    expect(fileNameFromTitle('A/B: "Test"?')).toBe('AB Test')
  })

  it('falls back to a default name', () => {
    expect(fileNameFromTitle('  ')).toBe('uebung')
    expect(fileNameFromTitle('???')).toBe('uebung')
  })
})

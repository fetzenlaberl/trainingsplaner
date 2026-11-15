import { describe, expect, it } from 'vitest'
import { FIELD_TYPES, getViewport } from '../field/dimensions'
import {
  animationTimeAt,
  extensionFor,
  HOLD_END_MS,
  HOLD_START_MS,
  MIME_CANDIDATES,
  mp4ConversionArgs,
  pickMimeType,
  recordingLength,
  VIDEO_WIDTH,
  videoSize,
} from './plan'

describe('videoSize', () => {
  it.each(FIELD_TYPES)('uses even dimensions and keeps the aspect ratio (%s)', (type) => {
    const viewport = getViewport(type)
    const { width, height, pxPerMeter } = videoSize(viewport)
    expect(width).toBe(VIDEO_WIDTH)
    expect(width % 2).toBe(0)
    expect(height % 2).toBe(0)
    expect(width / height).toBeCloseTo(viewport.width / viewport.height, 1)
    expect(pxPerMeter * viewport.width).toBe(width)
  })

  it('rounds odd widths to even', () => {
    expect(videoSize({ x: 0, y: 0, width: 10, height: 10 }, 1001).width % 2).toBe(0)
  })
})

describe('recording timeline', () => {
  it('adds still frames at start and end', () => {
    expect(recordingLength(4000, 1)).toBe(HOLD_START_MS + 4000 + HOLD_END_MS)
  })

  it('takes the speed into account', () => {
    expect(recordingLength(4000, 2)).toBe(HOLD_START_MS + 2000 + HOLD_END_MS)
    expect(recordingLength(4000, 0.5)).toBe(HOLD_START_MS + 8000 + HOLD_END_MS)
  })

  it('holds the first frame, then plays, then holds the last frame', () => {
    expect(animationTimeAt(0, 4000, 1)).toBe(0)
    expect(animationTimeAt(HOLD_START_MS, 4000, 1)).toBe(0)
    expect(animationTimeAt(HOLD_START_MS + 1000, 4000, 1)).toBe(1000)
    expect(animationTimeAt(HOLD_START_MS + 1000, 4000, 2)).toBe(2000)
    expect(animationTimeAt(recordingLength(4000, 1), 4000, 1)).toBe(4000)
  })
})

describe('pickMimeType / extensionFor', () => {
  it('prefers WebM with VP9', () => {
    expect(pickMimeType(() => true)).toBe(MIME_CANDIDATES[0])
  })

  it('falls back to MP4 (Safari)', () => {
    const type = pickMimeType((t) => t.startsWith('video/mp4'))
    expect(type).toBe('video/mp4;codecs=avc1')
    expect(extensionFor(type!)).toBe('mp4')
  })

  it('returns null if nothing is supported', () => {
    expect(pickMimeType(() => false)).toBeNull()
  })

  it('maps WebM types to .webm', () => {
    expect(extensionFor('video/webm;codecs=vp8')).toBe('webm')
  })
})

describe('mp4ConversionArgs', () => {
  it('produces an H.264 MP4 that plays everywhere', () => {
    const args = mp4ConversionArgs('in.webm', 'out.mp4')
    expect(args[0]).toBe('-i')
    expect(args[1]).toBe('in.webm')
    expect(args.at(-1)).toBe('out.mp4')
    expect(args.join(' ')).toContain('-c:v libx264')
    expect(args.join(' ')).toContain('-pix_fmt yuv420p')
  })
})

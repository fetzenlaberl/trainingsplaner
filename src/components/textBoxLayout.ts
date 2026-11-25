import Konva from 'konva'
import { TEXT_SCALE } from './MeterText'
import { textBoxBody, textBoxTail, textBoxTailTo, type TextBoxBody, type TextBoxTail } from '../items/textBoxGeometry'
import { bubbleWidth, textBoxFontFactor, type TextBoxStyle } from '../items/textBoxStyle'

const TEXTBOX_PADDING = 0.6
const TEXTBOX_FONT_SIZE = 1.1

export interface TextBoxLayout {
  /** Text area (meters at size 1, centered at 0, 0) */
  width: number
  height: number
  fontSize: number
  padding: number
  fontStyle: string
  fontFactor: number
  body: TextBoxBody
  tail: TextBoxTail | null
}

const heights = new Map<string, number>()

/** Height of the wrapped text, measured once per text and font (cached). */
function measureHeight(text: string, width: number, padding: number, fontSize: number, fontStyle: string): number {
  const key = `${width}|${padding}|${fontSize}|${fontStyle}|${text}`
  const cached = heights.get(key)
  if (cached !== undefined) return cached
  const measure = new Konva.Text({
    text: text || ' ',
    // Measured at the same enlarged size as it is drawn (see MeterText).
    width: width * TEXT_SCALE,
    padding: padding * TEXT_SCALE,
    fontSize: fontSize * TEXT_SCALE,
    fontStyle,
    lineHeight: 1.25,
    wrap: 'word',
  })
  const h = measure.height() / TEXT_SCALE
  measure.destroy()
  if (heights.size > 500) heights.clear()
  heights.set(key, h)
  return h
}

/** Size of a text box or speech bubble, its outline and its tail. */
export function textBoxLayout(text: string, style: TextBoxStyle | undefined): TextBoxLayout {
  const fontFactor = textBoxFontFactor(style)
  const fontSize = TEXTBOX_FONT_SIZE * fontFactor
  const padding = TEXTBOX_PADDING * fontFactor
  const fontStyle = [style?.italic ? 'italic' : '', style?.bold ? 'bold' : ''].filter(Boolean).join(' ') || 'normal'
  const heightAt = (w: number) => measureHeight(text, w, padding, fontSize, fontStyle)
  const width = bubbleWidth(style, heightAt)
  const height = Math.max(heightAt(width), style?.h ?? 0)
  const body = textBoxBody(style?.shape ?? 'rounded', width, height, fontFactor)
  const tail = !style?.tail
    ? null
    : style.tailTip
      ? textBoxTailTo(body, style.tailTip, fontFactor)
      : textBoxTail(body, style.tail, fontFactor)
  return { width, height, fontSize, padding, fontStyle, fontFactor, body, tail }
}

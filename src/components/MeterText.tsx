import type { TextConfig } from 'konva/lib/shapes/Text'
import { Text } from 'react-konva'

/**
 * Text sizes on the pitch are given in meters (a player number is about 1 m high).
 * Safari (iPad/iPhone) lays out such tiny canvas fonts imprecisely, so numbers end up
 * off-center. The text is therefore drawn TEXT_SCALE times larger and scaled back down.
 */
export const TEXT_SCALE = 20

const LENGTH_PROPS = [
  'fontSize',
  'width',
  'height',
  'offsetX',
  'offsetY',
  'padding',
  'strokeWidth',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
  'letterSpacing',
] as const

/** Same as Konva's Text, with all sizes in meters; renders sharp and centered in every browser. */
export function MeterText(props: TextConfig) {
  const scaled: TextConfig = { ...props }
  for (const key of LENGTH_PROPS) {
    const value = props[key]
    if (typeof value === 'number') scaled[key] = value * TEXT_SCALE
  }
  scaled.scaleX = (props.scaleX ?? 1) / TEXT_SCALE
  scaled.scaleY = (props.scaleY ?? 1) / TEXT_SCALE
  return <Text {...scaled} />
}

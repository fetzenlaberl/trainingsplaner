import { useContext } from 'react'
import { Group, Image as KonvaImage, Path, Rect } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { useLoadedImage } from '../import/imageCache'
import { CREST_SIZE, IMAGE_BASE_WIDTH } from '../items/palette'
import { MeterText } from './MeterText'
import { ImagesContext } from './imagesContext'

/** Imported picture on the pitch, centered at (0, 0), IMAGE_BASE_WIDTH meters wide at size 1. */
export function PictureItem({ id }: { id: string }) {
  const images = useContext(ImagesContext)
  const img = useLoadedImage(images[id])
  const width = IMAGE_BASE_WIDTH
  if (!img) {
    // Still loading (or missing): a light frame keeps the item visible and selectable.
    const height = width * 0.6
    return (
      <Group>
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          fill="rgba(255,255,255,0.15)"
          stroke="#ffffff"
          strokeWidth={0.15}
          dash={[0.6, 0.4]}
        />
        <MeterText text="Bild" width={width} offsetX={width / 2} offsetY={1} align="center" fontSize={2} fill="#ffffff" />
      </Group>
    )
  }
  const height = (width * (img.naturalHeight || 1)) / (img.naturalWidth || 1)
  return <KonvaImage image={img} x={-width / 2} y={-height / 2} width={width} height={height} />
}

/** Plain shield outline (own drawing), CREST_SIZE high, centered at (0, 0) */
const SHIELD_PATH = 'M -3.2 -4 L 3.2 -4 L 3.2 0 Q 3.2 2.9 0 4 Q -3.2 2.9 -3.2 0 Z'

/**
 * Crest: the chosen picture fitted into a CREST_SIZE square (never distorted);
 * without a picture an empty shield that invites to choose one.
 */
export function CrestItem({ id }: { id: string }) {
  const images = useContext(ImagesContext)
  const img = useLoadedImage(id ? images[id] : undefined)
  if (!img) {
    return (
      <Group>
        <Path data={SHIELD_PATH} fill="rgba(255,255,255,0.18)" stroke="#ffffff" strokeWidth={0.15} dash={[0.5, 0.35]} />
        <MeterText text="Wappen" width={6} offsetX={3} offsetY={0.9} align="center" fontSize={1.3} fontStyle="bold" fill="#ffffff" />
      </Group>
    )
  }
  const w = img.naturalWidth || 1
  const h = img.naturalHeight || 1
  const scale = CREST_SIZE / Math.max(w, h)
  return <KonvaImage image={img} x={(-w * scale) / 2} y={(-h * scale) / 2} width={w * scale} height={h * scale} />
}

/**
 * Background picture instead of the grass: fills the visible area (cropped, never distorted)
 * and stays upright on screen in portrait.
 */
export function PitchBackground({
  id,
  opacity,
  viewport,
  upright,
}: {
  id: string
  opacity: number
  viewport: ViewRect
  /** Rotation that turns the picture back upright on screen (portrait) */
  upright: number
}) {
  const images = useContext(ImagesContext)
  const img = useLoadedImage(images[id])
  if (!img) return null
  const turned = upright % 180 !== 0
  const areaWidth = turned ? viewport.height : viewport.width
  const areaHeight = turned ? viewport.width : viewport.height
  const scale = Math.max(areaWidth / (img.naturalWidth || 1), areaHeight / (img.naturalHeight || 1))
  const width = (img.naturalWidth || 1) * scale
  const height = (img.naturalHeight || 1) * scale
  return (
    <Group x={viewport.x + viewport.width / 2} y={viewport.y + viewport.height / 2} rotation={upright} opacity={opacity}>
      <KonvaImage image={img} x={-width / 2} y={-height / 2} width={width} height={height} />
    </Group>
  )
}

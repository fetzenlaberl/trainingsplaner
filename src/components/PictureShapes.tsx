import { useContext } from 'react'
import { Group, Image as KonvaImage, Rect } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { useLoadedImage } from '../import/imageCache'
import { IMAGE_BASE_WIDTH } from '../items/palette'
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

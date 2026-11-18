import { Group, Layer, Stage } from 'react-konva'
import { DEFAULT_ZONE_COLOR, DEFAULT_ZONE_SIZE } from '../items/zones'
import type { ZoneShape as ZoneShapeType } from '../model/types'
import { ZoneShape } from './ZoneShape'

interface ZonePreviewProps {
  shape: ZoneShapeType
  /** Pixels per meter */
  scale: number
}

/** Stand-alone canvas showing a new zone, used in the sidebar and while dragging. */
export function ZonePreview({ shape, scale }: ZonePreviewProps) {
  const { width, height } = DEFAULT_ZONE_SIZE[shape]
  const pxWidth = Math.ceil(width * scale) + 4
  const pxHeight = Math.ceil(height * scale) + 4
  return (
    <Stage width={pxWidth} height={pxHeight} listening={false}>
      <Layer>
        <Group x={pxWidth / 2} y={pxHeight / 2} scaleX={scale} scaleY={scale}>
          <ZoneShape
            shape={shape}
            width={width}
            height={height}
            color={DEFAULT_ZONE_COLOR}
            dashed={false}
            label=""
            scale={scale}
          />
        </Group>
      </Layer>
    </Stage>
  )
}

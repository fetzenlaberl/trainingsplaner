import { Group, Layer, Stage } from 'react-konva'
import { DEFAULT_ZONE_COLOR, DEFAULT_ZONE_FILL_OPACITY, type ZoneTemplate } from '../items/zones'
import { ZoneShape } from './ZoneShape'

interface ZonePreviewProps {
  template: ZoneTemplate
  /** Pixels per meter */
  scale: number
}

/** Stand-alone canvas showing a new zone, used in the sidebar and while dragging. */
export function ZonePreview({ template, scale }: ZonePreviewProps) {
  const { shape, width, height, goals, corners } = template
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
            fillColor={DEFAULT_ZONE_COLOR}
            fillOpacity={DEFAULT_ZONE_FILL_OPACITY}
            dashed={false}
            label=""
            goals={goals}
            corners={corners ?? null}
            scale={scale}
          />
        </Group>
      </Layer>
    </Stage>
  )
}

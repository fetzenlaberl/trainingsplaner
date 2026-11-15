import { Group, Layer, Stage } from 'react-konva'
import { ITEM_EXTENT, type NewItem } from '../items/palette'
import { ItemShape } from './ItemShape'

interface ItemPreviewProps {
  item: NewItem
  /** Pixels per meter */
  scale: number
}

/** Small stand-alone canvas showing one item, used in the sidebar and while dragging. */
export function ItemPreview({ item, scale }: ItemPreviewProps) {
  const size = Math.ceil(ITEM_EXTENT[item.type] * scale) + 4
  return (
    <Stage width={size} height={size} listening={false}>
      <Layer>
        <Group x={size / 2} y={size / 2} scaleX={scale} scaleY={scale}>
          <ItemShape
            type={item.type}
            color={item.color}
            label={item.label ?? (item.type === 'player' ? '1' : '')}
            rotation={item.rotation ?? 0}
          />
        </Group>
      </Layer>
    </Stage>
  )
}

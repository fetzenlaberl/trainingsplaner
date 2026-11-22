import { Group } from 'react-konva'
import type { PitchColor } from '../field/pitchStyle'
import type { Item } from '../model/types'
import { isStanding, projectedRotation, type FieldProjector } from '../perspective/upright'
import { ImagesContext } from './imagesContext'
import { ItemShape } from './ItemShape'
import { PitchColorContext } from './pitchColorContext'
import { ViewRotationContext } from './viewRotationContext'

const NO_IMAGES: Record<string, string> = {}
/** Signs (text, crest) keep their own rotation; everything else turns with the tilted field. */
const OWN_ROTATION = new Set(['text', 'textbox', 'crest'])

interface UprightItemsProps {
  items: (Item & { opacity?: number; glow?: number })[]
  project: FieldProjector
  pitchColor: PitchColor
  images?: Record<string, string>
}

/**
 * Standing items of the perspective view, drawn untilted in screen pixels at the projected
 * spot of each item, back to front so near items cover far ones.
 */
export function UprightItems({ items, project, pitchColor, images = NO_IMAGES }: UprightItemsProps) {
  const placed = items
    .filter((item) => isStanding(item.type))
    .map((item) => ({ item, at: project(item.x, item.y) }))
    .sort((a, b) => a.at.y - b.at.y)
  return (
    <ImagesContext.Provider value={images}>
      <PitchColorContext.Provider value={pitchColor}>
        <ViewRotationContext.Provider value={0}>
          <Group listening={false}>
            {placed.map(({ item, at }) => (
              <Group
                key={item.id}
                x={at.x}
                y={at.y}
                scaleX={at.scale * item.size}
                scaleY={at.scale * item.size}
                opacity={(item.opacity ?? 1) * (item.alpha ?? 1)}
              >
                <ItemShape
                  type={item.type}
                  color={item.color}
                  label={item.label}
                  rotation={
                    OWN_ROTATION.has(item.type) ? item.rotation : projectedRotation(project, item.x, item.y, item.rotation)
                  }
                  shape={item.shape}
                  facing={item.facing}
                  pose={item.pose}
                  name={item.name}
                  glow={item.glow ?? (item.highlight ? 1 : 0)}
                />
              </Group>
            ))}
          </Group>
        </ViewRotationContext.Provider>
      </PitchColorContext.Provider>
    </ImagesContext.Provider>
  )
}

/** Items lying on the ground (drawn in the tilted picture). */
export function groundItems<T extends Item>(items: T[]): T[] {
  return items.filter((item) => !isStanding(item.type))
}

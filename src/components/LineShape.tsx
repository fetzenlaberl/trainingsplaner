import { Group, Line as KonvaLine } from 'react-konva'
import {
  arrowHead,
  endDirection,
  flatten,
  offsetPolyline,
  polylineLength,
  samplePath,
  trimEnd,
  wavePolyline,
} from '../lines/geometry'
import { useContext } from 'react'
import { displayColor } from '../field/pitchStyle'
import { dashStyle, hasArrow, weightFactor } from '../lines/styles'
import type { Line } from '../model/types'
import { PitchColorContext } from './pitchColorContext'

type LineShapeProps = Pick<Line, 'type' | 'points' | 'smooth' | 'color' | 'pattern' | 'weight'> & {
  /** Pixels per meter, used to keep lines readable at small sizes */
  scale: number
  opacity?: number
}

/** Draws a line in meter units: pattern and weight as chosen, with an arrowhead except for plain lines. */
export function LineShape({
  type,
  points,
  smooth,
  color: chosenColor,
  pattern,
  weight,
  scale,
  opacity = 1,
}: LineShapeProps) {
  const color = displayColor(chosenColor, useContext(PitchColorContext))
  const path = samplePath(points, smooth)
  const end = path[path.length - 1]
  const total = polylineLength(path)
  if (total === 0) return null

  const strokeWidth = Math.max(0.22, 2 / scale) * weightFactor(weight)
  const arrow = hasArrow(type)
  const shotGap = Math.max(0.25, 2.5 / scale)
  const arrowLength = Math.min(
    Math.max(1.2, 10 / scale) * (type === 'shot' ? 1.3 : 1) * Math.sqrt(weightFactor(weight)),
    total * 0.5,
  )
  const arrowWidth = type === 'shot' ? 2 * shotGap + arrowLength * 0.8 : arrowLength * 0.8
  const body = arrow ? trimEnd(path, arrowLength * 0.8) : path
  const head = arrowHead(end, endDirection(path), arrowLength, arrowWidth)
  const { dash, lineCap } = dashStyle(pattern, strokeWidth)

  const stroke = {
    stroke: color,
    strokeWidth,
    lineCap,
    dash,
    lineJoin: 'round' as const,
  }

  let bodyShapes
  switch (type) {
    case 'pass':
    case 'run':
    case 'line':
      bodyShapes = <KonvaLine points={flatten(body)} {...stroke} />
      break
    case 'dribble':
      bodyShapes = (
        <KonvaLine
          points={flatten(
            wavePolyline(body, Math.max(0.35, 3 / scale), Math.max(1.5, 12 / scale)),
          )}
          {...stroke}
        />
      )
      break
    case 'shot':
      bodyShapes = (
        <>
          <KonvaLine points={flatten(offsetPolyline(body, shotGap))} {...stroke} />
          <KonvaLine points={flatten(offsetPolyline(body, -shotGap))} {...stroke} />
        </>
      )
      break
  }

  return (
    <Group listening={false} opacity={opacity}>
      {bodyShapes}
      {arrow && (
        <KonvaLine points={flatten(head)} closed fill={color} stroke={color} strokeWidth={strokeWidth / 2} lineJoin="round" />
      )}
    </Group>
  )
}

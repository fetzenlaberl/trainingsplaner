import type { Line } from '../model/types'

export const MAX_STEP = 99

/** Next free step number in a scene (one higher than the highest used). */
export function nextStep(lines: Pick<Line, 'step'>[]): number {
  return Math.min(MAX_STEP, lines.reduce((max, l) => Math.max(max, l.step ?? 0), 0) + 1)
}

/** Step number of the last numbered line (to give several lines the same step), or 1. */
export function sameStep(lines: Pick<Line, 'step'>[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const step = lines[i].step
    if (step !== null) return step
  }
  return 1
}

/** Renumbers the numbered lines 1, 2, 3 … in their current order, closing gaps. */
export function renumberSteps<T extends Pick<Line, 'step'>>(lines: T[]): T[] {
  const ordered = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.step !== null)
    .sort((a, b) => a.line.step! - b.line.step! || a.index - b.index)
  const newSteps = new Map(ordered.map(({ index }, i) => [index, i + 1]))
  return lines.map((line, index) => (newSteps.has(index) ? { ...line, step: newSteps.get(index)! } : line))
}

export function clampStep(step: number): number {
  return Math.min(Math.max(Math.round(step), 1), MAX_STEP)
}

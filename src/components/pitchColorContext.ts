import { createContext } from 'react'
import type { PitchColor } from '../field/pitchStyle'

/** Pitch color of the field being drawn, so items and lines can stay visible on a white pitch. */
export const PitchColorContext = createContext<PitchColor>('grass')

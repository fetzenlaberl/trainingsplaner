import { createContext } from 'react'

/**
 * Rotation (degrees) of the field on screen: 0 in landscape, -90 in portrait.
 * Texts rotate by the opposite angle so they stay readable.
 */
export const ViewRotationContext = createContext(0)

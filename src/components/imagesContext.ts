import { createContext } from 'react'

/** Pictures of the drill being drawn (id → data URL), for picture items and the background. */
export const ImagesContext = createContext<Record<string, string>>({})

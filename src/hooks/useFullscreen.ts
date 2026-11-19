import { useCallback, useEffect, useState } from 'react'

// Safari (iPad) still uses the webkit-prefixed fullscreen API.
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }

function currentFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

/** Browser fullscreen for the whole app; \`supported\` is false where the browser offers none. */
export function useFullscreen() {
  const root = document.documentElement as FullscreenElement
  const supported = typeof root.requestFullscreen === 'function' || typeof root.webkitRequestFullscreen === 'function'
  const [active, setActive] = useState(() => currentFullscreenElement() !== null)

  useEffect(() => {
    const onChange = () => setActive(currentFullscreenElement() !== null)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggle = useCallback(async () => {
    const doc = document as FullscreenDocument
    try {
      if (currentFullscreenElement()) {
        await (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.())
      } else {
        await (root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen?.())
      }
    } catch (err) {
      // E.g. the browser refused because the request did not come from a tap or click.
      console.error(err)
    }
  }, [root])

  return { supported, active, toggle }
}

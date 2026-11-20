import { useEffect, useState } from 'react'

// Imported pictures are stored as data URLs; loaded <img> elements are kept here so the
// pitch, exports and thumbnails do not decode the same picture again and again.

const cache = new Map<string, HTMLImageElement>()
const pending = new Map<string, Promise<HTMLImageElement>>()

/** The loaded picture, or undefined while it is still loading. */
export function loadedImage(src: string): HTMLImageElement | undefined {
  return cache.get(src)
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const done = cache.get(src)
  if (done) return Promise.resolve(done)
  const running = pending.get(src)
  if (running) return running
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      cache.set(src, img)
      pending.delete(src)
      resolve(img)
    }
    img.onerror = () => {
      pending.delete(src)
      reject(new Error('Bild konnte nicht geladen werden'))
    }
    img.src = src
  })
  pending.set(src, promise)
  return promise
}

/** Loads all pictures (e.g. before an export, so nothing is missing). */
export async function preloadImages(sources: string[]): Promise<void> {
  await Promise.all(sources.map((src) => loadImage(src).catch(() => undefined)))
}

/** The picture for drawing; re-renders once it has loaded. */
export function useLoadedImage(src: string | undefined): HTMLImageElement | undefined {
  const [, setLoaded] = useState(0)
  useEffect(() => {
    if (!src || cache.has(src)) return
    let cancelled = false
    loadImage(src).then(
      () => {
        if (!cancelled) setLoaded((n) => n + 1)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [src])
  return src ? cache.get(src) : undefined
}

import { useSyncExternalStore } from 'react'

/** Small screens get the reduced phone layout: narrow portrait, or a low landscape touch screen. */
export const PHONE_QUERY = '(max-width: 639px), (max-height: 499px) and (pointer: coarse)'

export function isPhoneScreen(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(PHONE_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/** True while the phone layout applies (updates when the device is rotated). */
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, isPhoneScreen, () => false)
}

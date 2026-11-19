import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { buttonClass } from '../components/ui'

/** Chrome/Edge/Android event that allows showing the install dialog from a button. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** "App installieren" button, shown only where the browser offers installation. */
export function InstallButton() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!installEvent) return null
  return (
    <button
      type="button"
      className={`${buttonClass} order-last`}
      title="Als App auf diesem Gerät installieren – funktioniert dann auch ohne Internet"
      onClick={async () => {
        await installEvent.prompt()
        await installEvent.userChoice
        setInstallEvent(null)
      }}
    >
      ⬇ App installieren
    </button>
  )
}

/** Notice at the bottom when a new version of the app has been downloaded. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-600 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-2xl"
    >
      {needRefresh ? (
        <>
          <span>Neue Version verfügbar.</span>
          <button
            type="button"
            className={`${buttonClass} bg-emerald-700 hover:bg-emerald-600`}
            onClick={() => void updateServiceWorker(true)}
          >
            Neu laden
          </button>
          <button type="button" className={buttonClass} onClick={() => setNeedRefresh(false)}>
            Später
          </button>
        </>
      ) : (
        <>
          <span>Die App funktioniert jetzt auch ohne Internet.</span>
          <button type="button" className={buttonClass} onClick={() => setOfflineReady(false)}>
            OK
          </button>
        </>
      )}
    </div>
  )
}

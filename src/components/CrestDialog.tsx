import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { importPictureFile, ImportError } from '../import/fileImport'
import { currentScene, findElement, useDrillStore } from '../store/drillStore'
import { buttonClass } from './ui'

/**
 * Window for choosing the picture of a crest; opens after dropping one and on a double tap.
 * The picture stays inside the drill on this device (nothing is uploaded).
 */
export function CrestDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = useDrillStore((s) => findElement(currentScene(s), itemId))
  const images = useDrillStore((s) => s.images)
  const inputRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!item || !('label' in item)) onCloseRef.current()
  }, [item])

  if (!item || !('label' in item)) return null
  const current = item.label ? images[item.label] : undefined

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const picture = await importPictureFile(file)
      const store = useDrillStore.getState()
      const before = store.snapshot()
      const imageId = store.addImage(picture.src)
      store.setItemLabel(itemId, imageId)
      store.pushHistory(before)
      onCloseRef.current()
    } catch (err) {
      console.error(err)
      setError(err instanceof ImportError ? err.message : 'Das Bild konnte nicht geöffnet werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crest-title"
        className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="crest-title" className="text-base font-semibold text-white">
          {current ? 'Wappen ändern' : 'Wappen einfügen'}
        </h2>
        {current ? (
          <img src={current} alt="Aktuelles Wappen" className="mx-auto max-h-32 max-w-full object-contain" />
        ) : (
          <p className="text-sm text-slate-400">Wähle ein Bild deines Wappens (Foto, PNG, JPG oder PDF).</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass} onClick={onClose}>
            {current ? 'Fertig' : 'Später'}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${buttonClass} bg-emerald-700 hover:bg-emerald-600`}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Wird geladen …' : 'Bild auswählen …'}
          </button>
        </div>
      </div>
    </div>
  )
}

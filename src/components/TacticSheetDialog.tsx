import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { SHEET_VARIANTS, type SheetVariant } from '../export/tacticSheet'
import { loadClubSettings, readLogo, saveClubSettings, type ClubSettings } from '../settings/clubSettings'
import { useDrillStore } from '../store/drillStore'
import { buttonClass, inputClass } from './ui'

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Options for the printable tactic sheet (for GoodNotes or paper). */
export function TacticSheetDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const title = useDrillStore((s) => s.title)
  const [variant, setVariant] = useState<SheetVariant>('one')
  const [content, setContent] = useState<'scene' | 'empty'>('scene')
  const [printFriendly, setPrintFriendly] = useState(true)
  const [date, setDate] = useState(today)
  const [topic, setTopic] = useState(title)
  const [club, setClub] = useState<ClubSettings>(loadClubSettings)
  const [busy, setBusy] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)

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

  function updateClub(next: ClubSettings) {
    setClub(next)
    saveClubSettings(next)
  }

  async function handleLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      updateClub({ ...club, logo: await readLogo(file) })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Das Bild konnte nicht gelesen werden.')
    }
  }

  async function handleCreate() {
    setBusy(true)
    try {
      const { exportTacticSheet } = await import('../export/tacticSheetPdf')
      await exportTacticSheet({ variant, content, printFriendly, date, topic, club })
      onClose()
    } catch (err) {
      console.error(err)
      window.alert('Das Taktikblatt konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  const radio = (active: boolean) =>
    `flex min-h-10 flex-1 items-center justify-center rounded-md px-2 text-sm ${
      active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="outline-none flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="sheet-title" className="text-base font-semibold text-white">
          Taktikblatt (PDF)
        </h2>

        <div role="group" aria-label="Aufteilung" className="flex flex-col gap-1 text-sm text-slate-400">
          Aufteilung
          <div className="flex gap-1">
            {SHEET_VARIANTS.map((v) => (
              <button key={v.key} type="button" aria-pressed={variant === v.key} className={radio(variant === v.key)} onClick={() => setVariant(v.key)}>
                {v.name}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Inhalt" className="flex flex-col gap-1 text-sm text-slate-400">
          Inhalt der Felder
          <div className="flex gap-1">
            <button type="button" aria-pressed={content === 'scene'} className={radio(content === 'scene')} onClick={() => setContent('scene')}>
              Aktuelle Szene
            </button>
            <button type="button" aria-pressed={content === 'empty'} className={radio(content === 'empty')} onClick={() => setContent('empty')}>
              Leeres Feld zum Zeichnen
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-500"
            checked={printFriendly}
            onChange={(e) => setPrintFriendly(e.target.checked)}
          />
          Druckfreundlich (weißes Feld, spart Tinte)
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Datum
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Thema
            <input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-700 p-3">
          <legend className="px-1 text-sm text-slate-400">Verein (wird gemerkt)</legend>
          <input
            className={inputClass}
            placeholder="Vereinsname, z. B. FC Musterstadt"
            value={club.name}
            onChange={(e) => updateClub({ ...club, name: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-white/90">
              {club.logo ? (
                <img src={club.logo.dataUrl} alt="Vereinswappen" className="max-h-full max-w-full" />
              ) : (
                <span className="text-[10px] text-slate-500">Wappen</span>
              )}
            </span>
            <button type="button" className={buttonClass} onClick={() => logoInputRef.current?.click()}>
              Wappen wählen …
            </button>
            {club.logo && (
              <button type="button" className={buttonClass} onClick={() => updateClub({ ...club, logo: null })}>
                Entfernen
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass} onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className={`${buttonClass} bg-emerald-700 text-white hover:bg-emerald-600`}
            disabled={busy}
            onClick={handleCreate}
          >
            {busy ? 'Wird erstellt …' : 'PDF erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

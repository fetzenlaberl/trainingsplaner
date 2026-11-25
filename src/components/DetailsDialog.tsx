import { useEffect, useRef } from 'react'
import { AREA_LABELS, CATEGORY_LABELS } from '../library/library'
import { CATEGORIES } from '../model/serialize'
import { AGE_GROUPS, parseCount, type AgeGroup } from '../model/drillInfo'
import type { Category, DrillArea } from '../model/types'
import { useDrillStore } from '../store/drillStore'
import { AutoTextarea } from './AutoTextarea'
import { buttonClass, inputClass } from './ui'

/** Title, category and description of the drill in the editor. */
export function DetailsDialog({ onClose }: { onClose: () => void }) {
  const title = useDrillStore((s) => s.title)
  const description = useDrillStore((s) => s.description)
  const category = useDrillStore((s) => s.category)
  const setTitle = useDrillStore((s) => s.setTitle)
  const setDescription = useDrillStore((s) => s.setDescription)
  const setCategory = useDrillStore((s) => s.setCategory)
  const info = useDrillStore((s) => s.info)
  const setInfo = useDrillStore((s) => s.setInfo)
  const area = useDrillStore((s) => s.area)
  const setArea = useDrillStore((s) => s.setArea)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Runs once: focus the first field and close on Escape.
  useEffect(() => {
    firstFieldRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
        aria-labelledby="details-title"
        className="flex max-h-full w-full max-w-lg flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="details-title" className="text-base font-semibold text-white">
          Details der Übung
        </h2>
        {/* A long description scrolls in here, so the heading and "Fertig" stay in view. */}
        <div className="-mx-3 flex min-h-0 flex-col gap-4 overflow-y-auto px-3">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Titel
            <input
              ref={firstFieldRef}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div role="group" aria-label="Bereich" className="flex flex-col gap-1 text-sm text-slate-400">
            Bereich in der Bibliothek
            <div className="flex gap-1">
              {(Object.keys(AREA_LABELS) as DrillArea[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={area === key}
                  onClick={() => setArea(key)}
                  className={`min-h-10 flex-1 rounded-md px-2 text-sm ${
                    area === key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {AREA_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Kategorie
            <select
              className={inputClass}
              value={category ?? ''}
              onChange={(e) => setCategory(e.target.value === '' ? null : (e.target.value as Category))}
            >
              <option value="">Keine Kategorie</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Spieler
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder="z. B. 12"
                value={info.players ?? ''}
                onChange={(e) => setInfo({ players: parseCount(e.target.value, 99) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Dauer (min)
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder="z. B. 15"
                value={info.durationMin ?? ''}
                onChange={(e) => setInfo({ durationMin: parseCount(e.target.value, 240) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Feldgröße
              <input
                className={inputClass}
                placeholder="30 × 20 m"
                value={info.fieldSize}
                onChange={(e) => setInfo({ fieldSize: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Altersklasse
              <select
                className={inputClass}
                value={info.ageGroup ?? ''}
                onChange={(e) => setInfo({ ageGroup: e.target.value === '' ? null : (e.target.value as AgeGroup) })}
              >
                <option value="">–</option>
                {AGE_GROUPS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Beschreibung
            <AutoTextarea
              label="Beschreibung"
              minLines={5}
              value={description}
              placeholder="Ablauf, Coachingpunkte, Varianten …"
              onChange={setDescription}
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="button" className={buttonClass} onClick={onClose}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

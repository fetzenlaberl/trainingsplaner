import { useRef, useState } from 'react'
import { LibraryView } from '../components/LibraryView'
import { PitchStage, type DropTarget } from '../components/PitchStage'
import { SessionsView } from '../components/SessionsView'
import { JournalView } from '../components/JournalView'
import { buttonClass } from '../components/ui'
import { useFullscreen } from '../hooks/useFullscreen'
import { usePlaybackLoop } from '../hooks/usePlaybackLoop'
import { locateTime, totalDuration } from '../animation/interpolate'
import { currentDrill, useDrillStore } from '../store/drillStore'
import { serializeDrill } from '../model/serialize'
import { saveToLibraryWithFeedback } from '../library/libraryActions'
import { useLibraryLink } from '../library/libraryStore'
import { togglePlayback } from '../store/playbackActions'
import { SPEEDS, usePlaybackStore } from '../store/playbackStore'
import { useViewStore } from '../store/viewStore'
import { UpdateBanner } from '../pwa/AppBanners'
import { FieldPanel } from '../components/FieldPanel'
import { useLayoutStore } from '../store/layoutStore'

type Tab = 'library' | 'sessions' | 'week' | 'journal'

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'library', label: 'Bibliothek', icon: '▦' },
  { tab: 'sessions', label: 'Einheiten', icon: '☰' },
  { tab: 'week', label: 'Woche', icon: '▤' },
  { tab: 'journal', label: 'Journal', icon: '✎' },
]

/**
 * Reduced layout for phones: browse the library, view and play drills,
 * see sessions and the week plan. Drawing tools stay on tablet and PC.
 */
export function PhoneApp() {
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  const [tab, setTab] = useState<Tab>('library')
  // Opening a drill (from the library or a session) switches the shared view to "editor".
  const showingDrill = view === 'editor'

  function openTab(next: Tab) {
    usePlaybackStore.getState().stop()
    useDrillStore.getState().select(null)
    setTab(next)
    setView(next === 'library' ? 'library' : next === 'journal' ? 'journal' : 'sessions')
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {showingDrill ? (
          <DrillViewer onBack={() => openTab(tab)} backLabel={TABS.find((t) => t.tab === tab)?.label ?? 'Zurück'} />
        ) : tab === 'library' ? (
          <LibraryView />
        ) : tab === 'journal' ? (
          <JournalView />
        ) : (
          // The week tab is the sessions screen opened in its week mode.
          <SessionsView key={tab} initialMode={tab === 'week' ? 'week' : 'list'} hideModeTabs />
        )}
      </main>
      {!showingDrill && (
        <nav
          aria-label="Bereich"
          className="flex border-t border-slate-700 bg-slate-900 pb-[env(safe-area-inset-bottom)]"
        >
          {TABS.map((t) => (
            <button
              key={t.tab}
              type="button"
              aria-current={t.tab === tab ? 'page' : undefined}
              onClick={() => openTab(t.tab)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                t.tab === tab ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <span aria-hidden className="text-lg leading-none">
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
      <UpdateBanner />
    </div>
  )
}

/** Shows the opened drill with a simple play bar; players can still be moved and edited via the quick menu. */
function DrillViewer({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  const dropTargetRef = useRef<DropTarget | null>(null)
  const title = useDrillStore((s) => s.title)
  const scenes = useDrillStore((s) => s.scenes)
  const sceneIndex = useDrillStore((s) => s.sceneIndex)
  const selectScene = useDrillStore((s) => s.selectScene)
  const time = usePlaybackStore((s) => s.time)
  const playing = usePlaybackStore((s) => s.playing)
  const speed = usePlaybackStore((s) => s.speed)
  const setSpeed = usePlaybackStore((s) => s.setSpeed)
  const stop = usePlaybackStore((s) => s.stop)
  usePlaybackLoop()

  const total = totalDuration(scenes)
  const shownIndex = time !== null ? locateTime(scenes, time).index : sceneIndex
  const goToScene = (index: number) => {
    stop()
    selectScene(index)
  }
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]
  const fullscreen = useFullscreen()
  const fieldPanel = useLayoutStore((s) => s.fieldPanel)
  const drillJson = useDrillStore((s) => serializeDrill(currentDrill(s)))
  const savedJson = useLibraryLink((s) => s.savedJson)
  const dirty = drillJson !== savedJson
  const [saving, setSaving] = useState(false)
  const setFieldPanel = useLayoutStore((s) => s.setFieldPanel)
  const [immersive, setImmersive] = useState(false)
  const [showTip, setShowTip] = useState(false)

  function enterImmersive() {
    setFieldPanel(false)
    setImmersive(true)
    // Real fullscreen where the browser allows it (e.g. Android); iPhone Safari does not.
    if (fullscreen.supported && !fullscreen.active) void fullscreen.toggle()
    if (!isStandalone() && !tipShown()) {
      rememberTipShown()
      setShowTip(true)
    }
  }

  function leaveImmersive() {
    setImmersive(false)
    setShowTip(false)
    if (fullscreen.active) void fullscreen.toggle()
  }

  if (immersive) {
    return (
      <div className="relative h-full bg-slate-950">
        <PitchStage dropTargetRef={dropTargetRef} showTrash={false} />
        <button
          type="button"
          aria-label="Vollbild beenden"
          onClick={leaveImmersive}
          className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 z-20 rounded-full bg-slate-900/80 px-3 py-2 text-sm font-semibold text-white shadow"
        >
          ⤡
        </button>
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Abspielen'}
          disabled={total <= 0}
          onClick={togglePlayback}
          className="absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 h-12 w-12 rounded-full bg-emerald-600/90 text-lg text-white shadow-lg disabled:opacity-40"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        {showTip && (
          <div
            role="status"
            className="absolute inset-x-3 bottom-20 z-20 rounded-lg bg-slate-900/95 p-3 text-sm text-slate-100 shadow-lg"
          >
            Tipp: Über <b>Teilen → „Zum Home-Bildschirm“</b> verschwinden auch die Leisten von Safari.
            <button type="button" className="ml-2 font-semibold text-emerald-400" onClick={() => setShowTip(false)}>
              OK
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-slate-700 bg-slate-900 px-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            stop()
            setFieldPanel(false)
            onBack()
          }}
        >
          ‹ {backLabel}
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</h1>
        <button
          type="button"
          className={
            dirty
              ? buttonClass.replace('bg-slate-800', 'bg-emerald-700').replace('hover:bg-slate-700', 'hover:bg-emerald-600')
              : buttonClass
          }
          disabled={saving || !dirty}
          title={dirty ? 'Änderungen in der Übungsbibliothek speichern' : 'In der Bibliothek gespeichert'}
          aria-label={dirty ? 'In Bibliothek speichern' : 'In der Bibliothek gespeichert'}
          onClick={async () => {
            setSaving(true)
            await saveToLibraryWithFeedback()
            setSaving(false)
          }}
        >
          {saving ? '…' : dirty ? 'Speichern' : '✓'}
        </button>
        <button
          type="button"
          aria-pressed={fieldPanel}
          title="Feldart, Farbe, Linien, Raster und Notizen"
          className={fieldPanel ? buttonClass.replace('bg-slate-800', 'bg-emerald-700') : buttonClass}
          onClick={() => setFieldPanel(!fieldPanel)}
        >
          ⚽ Feld
        </button>
        <button type="button" className={buttonClass} title="Nur das Feld zeigen" aria-label="Vollbild" onClick={enterImmersive}>
          ⤢
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <PitchStage dropTargetRef={dropTargetRef} showTrash={false} />
        </div>
        {fieldPanel && <FieldPanel fullWidth />}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-700 bg-slate-900 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className={buttonClass}
          aria-label="Vorherige Szene"
          disabled={shownIndex <= 0}
          onClick={() => goToScene(shownIndex - 1)}
        >
          ◀
        </button>
        <span className="min-w-16 text-center text-sm text-slate-300 tabular-nums">
          Szene {shownIndex + 1}/{scenes.length}
        </span>
        <button
          type="button"
          className={buttonClass}
          aria-label="Nächste Szene"
          disabled={shownIndex >= scenes.length - 1}
          onClick={() => goToScene(shownIndex + 1)}
        >
          ▶
        </button>
        <button
          type="button"
          className={`${buttonClass} ml-auto min-w-24 justify-center bg-emerald-700 hover:bg-emerald-600`}
          disabled={total <= 0}
          onClick={togglePlayback}
        >
          {playing ? '❚❚ Pause' : '▶ Abspielen'}
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-label="Tempo"
          title="Tempo ändern"
          onClick={() => setSpeed(nextSpeed)}
        >
          {String(speed).replace('.', ',')}×
        </button>
      </div>
    </div>
  )
}

const TIP_KEY = 'trainingsplaner.homeScreenTipShown'

/** Started from the home screen (no Safari bars). */
function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function tipShown(): boolean {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return false
  }
}

function rememberTipShown(): void {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    // Not critical: the tip may show again.
  }
}

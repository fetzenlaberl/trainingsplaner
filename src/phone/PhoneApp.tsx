import { useRef, useState } from 'react'
import { LibraryView } from '../components/LibraryView'
import { PitchStage, type DropTarget } from '../components/PitchStage'
import { SessionsView } from '../components/SessionsView'
import { buttonClass } from '../components/ui'
import { usePlaybackLoop } from '../hooks/usePlaybackLoop'
import { locateTime, totalDuration } from '../animation/interpolate'
import { useDrillStore } from '../store/drillStore'
import { togglePlayback } from '../store/playbackActions'
import { SPEEDS, usePlaybackStore } from '../store/playbackStore'
import { useViewStore } from '../store/viewStore'
import { UpdateBanner } from '../pwa/AppBanners'

type Tab = 'library' | 'sessions' | 'week'

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'library', label: 'Bibliothek', icon: '▦' },
  { tab: 'sessions', label: 'Einheiten', icon: '☰' },
  { tab: 'week', label: 'Woche', icon: '▤' },
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
    setView(next === 'library' ? 'library' : 'sessions')
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {showingDrill ? (
          <DrillViewer onBack={() => openTab(tab)} backLabel={TABS.find((t) => t.tab === tab)?.label ?? 'Zurück'} />
        ) : tab === 'library' ? (
          <LibraryView />
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

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-slate-700 bg-slate-900 px-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            stop()
            onBack()
          }}
        >
          ‹ {backLabel}
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</h1>
      </header>
      <div className="min-h-0 flex-1">
        <PitchStage dropTargetRef={dropTargetRef} />
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

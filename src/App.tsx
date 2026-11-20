import { useRef } from 'react'
import { CollapseButton, CollapsedStrip, MaximizeButton } from './components/CollapseControls'
import { FieldTypeSwitcher } from './components/FieldTypeSwitcher'
import { NotesPanel } from './components/NotesPanel'
import { FileBar } from './components/FileBar'
import { ItemSidebar } from './components/ItemSidebar'
import { LibraryView } from './components/LibraryView'
import { LineToolbar } from './components/LineToolbar'
import { PitchStage, type DropTarget } from './components/PitchStage'
import { PitchStyleMenu } from './components/PitchStyleMenu'
import { SessionsView } from './components/SessionsView'
import { TeamsView } from './components/TeamsView'
import { Timeline } from './components/Timeline'
import { buttonClass } from './components/ui'
import { useFullscreen } from './hooks/useFullscreen'
import { useIsPhone } from './hooks/useIsPhone'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { PhoneApp } from './phone/PhoneApp'
import { InstallButton, UpdateBanner } from './pwa/AppBanners'
import { useLayoutStore } from './store/layoutStore'
import { togglePlayback } from './store/playbackActions'
import { usePlaybackStore } from './store/playbackStore'
import { useViewStore, type View } from './store/viewStore'

const VIEWS: { view: View; label: string }[] = [
  { view: 'editor', label: 'Editor' },
  { view: 'library', label: 'Bibliothek' },
  { view: 'sessions', label: 'Einheiten' },
  { view: 'teams', label: 'Mannschaft' },
]

export default function App() {
  const phone = useIsPhone()
  return phone ? <PhoneApp /> : <DesktopApp />
}

function DesktopApp() {
  const dropTargetRef = useRef<DropTarget | null>(null)
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  const fullscreen = useFullscreen()
  useKeyboardShortcuts(view === 'editor')
  const collapsed = useLayoutStore((s) => s.collapsed)
  const playing = usePlaybackStore((s) => s.playing)
  const editor = view === 'editor'

  return (
    <div className="flex h-full flex-col">
      {editor && collapsed.header ? (
        <CollapsedStrip bar="header" label="Menü" edge="top" />
      ) : (
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2">
          <nav aria-label="Bereich" className="flex gap-1 rounded-lg bg-slate-800 p-1">
            {VIEWS.map((v) => (
              <button
                key={v.view}
                type="button"
                aria-current={v.view === view ? 'page' : undefined}
                onClick={() => {
                  usePlaybackStore.getState().stop()
                  setView(v.view)
                }}
                className={`min-h-10 rounded-md px-3 text-sm font-semibold ${
                  v.view === view ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <InstallButton />
          {fullscreen.supported && (
            <button
              type="button"
              className={`${buttonClass} order-last`}
              aria-pressed={fullscreen.active}
              title={fullscreen.active ? 'Vollbild beenden' : 'Vollbild: mehr Platz für das Feld'}
              onClick={() => void fullscreen.toggle()}
            >
              {fullscreen.active ? '⤡ Vollbild beenden' : '⤢ Vollbild'}
            </button>
          )}
          {view === 'editor' && (
            <>
              <FileBar />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <PitchStyleMenu />
                <FieldTypeSwitcher />
              </div>
              <CollapseButton bar="header" label="Menü" className="order-last" />
            </>
          )}
        </header>
      )}
      {view === 'editor' ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {collapsed.sidebar ? (
            <CollapsedStrip bar="sidebar" label="Objekte" edge="side" />
          ) : (
            <ItemSidebar dropTargetRef={dropTargetRef} />
          )}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {collapsed.tools ? (
              <CollapsedStrip bar="tools" label="Werkzeuge" edge="top" />
            ) : (
              <div className="relative">
                <LineToolbar />
                <CollapseButton bar="tools" label="Werkzeuge" className="absolute top-2 right-2" />
              </div>
            )}
            <div className="relative min-h-0 flex-1">
              <PitchStage dropTargetRef={dropTargetRef} />
              <MaximizeButton />
            </div>
            <NotesPanel />
            {collapsed.timeline ? (
              <CollapsedStrip bar="timeline" label="Zeitleiste" edge="bottom">
                <button type="button" className={`${buttonClass} ml-auto`} onClick={togglePlayback}>
                  {playing ? '❚❚ Pause' : '▶ Abspielen'}
                </button>
              </CollapsedStrip>
            ) : (
              <div className="relative">
                <Timeline />
                <CollapseButton bar="timeline" label="Zeitleiste" className="absolute top-2 right-2" />
              </div>
            )}
          </main>
        </div>
      ) : (
        <main className="min-h-0 flex-1">
          {view === 'library' ? <LibraryView /> : view === 'sessions' ? <SessionsView /> : <TeamsView />}
        </main>
      )}
      <UpdateBanner />
    </div>
  )
}

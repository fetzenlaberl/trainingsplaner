import { useRef } from 'react'
import { FieldTypeSwitcher } from './components/FieldTypeSwitcher'
import { FileBar } from './components/FileBar'
import { ItemSidebar } from './components/ItemSidebar'
import { LineToolbar } from './components/LineToolbar'
import { PitchStage, type DropTarget } from './components/PitchStage'
import { Timeline } from './components/Timeline'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  const dropTargetRef = useRef<DropTarget | null>(null)
  useKeyboardShortcuts()

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2">
        <FileBar />
        <FieldTypeSwitcher />
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ItemSidebar dropTargetRef={dropTargetRef} />
        <main className="flex min-h-0 flex-1 flex-col">
          <LineToolbar />
          <div className="min-h-0 flex-1">
            <PitchStage dropTargetRef={dropTargetRef} />
          </div>
          <Timeline />
        </main>
      </div>
    </div>
  )
}

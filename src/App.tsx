import { useRef } from 'react'
import { FieldTypeSwitcher } from './components/FieldTypeSwitcher'
import { ItemSidebar } from './components/ItemSidebar'
import { LineToolbar } from './components/LineToolbar'
import { PitchStage, type DropTarget } from './components/PitchStage'

export default function App() {
  const dropTargetRef = useRef<DropTarget | null>(null)

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2">
        <h1 className="text-lg font-semibold text-white">Trainingsplaner</h1>
        <FieldTypeSwitcher />
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ItemSidebar dropTargetRef={dropTargetRef} />
        <main className="flex min-h-0 flex-1 flex-col">
          <LineToolbar />
          <div className="min-h-0 flex-1">
            <PitchStage dropTargetRef={dropTargetRef} />
          </div>
        </main>
      </div>
    </div>
  )
}

import { FieldTypeSwitcher } from './components/FieldTypeSwitcher'
import { PitchStage } from './components/PitchStage'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2">
        <h1 className="text-lg font-semibold text-white">Trainingsplaner</h1>
        <FieldTypeSwitcher />
      </header>
      <main className="min-h-0 flex-1">
        <PitchStage />
      </main>
    </div>
  )
}

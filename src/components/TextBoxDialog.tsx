import { useEffect, useRef } from 'react'
import { currentScene, findElement, useDrillStore } from '../store/drillStore'
import { buttonClass, inputClass } from './ui'

/** Multi-line editor for a text box; the whole edit counts as one undo step. */
export function TextBoxDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = useDrillStore((s) => findElement(currentScene(s), itemId))
  const setItemLabel = useDrillStore((s) => s.setItemLabel)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Runs once: remember the state for undo, focus the text, close on Escape.
  useEffect(() => {
    const { snapshot, pushHistory } = useDrillStore.getState()
    const before = snapshot()
    textareaRef.current?.focus()
    textareaRef.current?.select()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      pushHistory(before)
    }
  }, [])

  if (!item || !('label' in item)) return null

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
        aria-labelledby="textbox-title"
        className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="textbox-title" className="text-base font-semibold text-white">
          Text bearbeiten
        </h2>
        <textarea
          ref={textareaRef}
          className={`${inputClass} min-h-32 py-2`}
          value={item.label}
          maxLength={400}
          placeholder="Anweisung oder Erklärung …"
          onChange={(e) => setItemLabel(item.id, e.target.value)}
        />
        <div className="flex justify-end">
          <button type="button" className={buttonClass} onClick={onClose}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

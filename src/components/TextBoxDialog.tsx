import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { currentScene, findElement, useDrillStore } from '../store/drillStore'
import { AutoTextarea } from './AutoTextarea'
import { buttonClass, inputClass } from './ui'

/**
 * Input window for a text (one line) or a text box (several lines); opens after dropping
 * one and on a double tap. The whole edit counts as one undo step.
 */
export function TextBoxDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const item = useDrillStore((s) => findElement(currentScene(s), itemId))
  const setItemLabel = useDrillStore((s) => s.setItemLabel)
  const fieldRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Runs once: remember the state for undo, focus the text, close on Escape.
  useEffect(() => {
    const { snapshot, pushHistory } = useDrillStore.getState()
    const before = snapshot()
    fieldRef.current?.focus()
    fieldRef.current?.select()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      pushHistory(before)
    }
  }, [])

  // The item may vanish (undo, scene change): then there is nothing to edit.
  useEffect(() => {
    if (!item || !('label' in item)) onCloseRef.current()
  }, [item])

  if (!item || !('label' in item)) return null
  const multiLine = 'type' in item && item.type === 'textbox'

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
        aria-labelledby="textbox-title"
        className="outline-none flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="textbox-title" className="text-base font-semibold text-white">
          Text eingeben
        </h2>
        {multiLine ? (
          <AutoTextarea
            ref={fieldRef}
            label="Text"
            minLines={5}
            maxHeightClass="max-h-[50dvh]"
            value={item.label}
            maxLength={400}
            placeholder="Anweisung oder Erklärung …"
            onChange={(text) => setItemLabel(item.id, text)}
          />
        ) : (
          <input
            ref={fieldRef}
            className={inputClass}
            value={item.label}
            maxLength={60}
            placeholder="Text …"
            enterKeyHint="done"
            onChange={(e) => setItemLabel(item.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onClose()
            }}
          />
        )}
        <div className="flex justify-end">
          <button type="button" className={buttonClass} onClick={onClose}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

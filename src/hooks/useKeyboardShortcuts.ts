import { useEffect } from 'react'
import { saveToLibraryWithFeedback } from '../library/libraryActions'
import { currentScene, findElement, useDrillStore, type Element } from '../store/drillStore'
import { togglePlayback } from '../store/playbackActions'
import { usePlaybackStore } from '../store/playbackStore'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Editor shortcuts: save (Ctrl+S), undo/redo, copy/paste/duplicate, delete,
 * Escape and Space (play/pause). Inactive while `enabled` is false or a dialog is open.
 */
export function useKeyboardShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let clipboard: Element | null = null

    function onKeyDown(e: KeyboardEvent) {
      if (document.querySelector('[aria-modal="true"]')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        // Works while typing in the title too; replaces the browser's "save page".
        e.preventDefault()
        void saveToLibraryWithFeedback()
        return
      }
      if (isTyping(e.target)) return
      const store = useDrillStore.getState()
      const selected = findElement(currentScene(store), store.selectedId)
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        store.redo()
      } else if (mod && key === 'd') {
        e.preventDefault()
        if (selected) store.insertCopy(selected)
      } else if (mod && key === 'c') {
        if (selected) clipboard = selected
      } else if (mod && key === 'v') {
        if (!clipboard) return
        e.preventDefault()
        const id = store.insertCopy(clipboard)
        // Repeated pastes cascade instead of stacking on the same spot.
        clipboard = findElement(currentScene(useDrillStore.getState()), id) ?? clipboard
      } else if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (!selected) return
        e.preventDefault()
        store.deleteElement(selected.id)
      } else if (e.key === 'Escape') {
        store.select(null)
        usePlaybackStore.getState().stop()
      } else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        togglePlayback()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

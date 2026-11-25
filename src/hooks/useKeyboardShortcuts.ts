import { useEffect } from 'react'
import { saveToLibraryWithFeedback } from '../library/libraryActions'
import { currentScene, findElement, useDrillStore, type Element } from '../store/drillStore'
import { allElementIds } from '../store/selection'
import { spaceKey } from './spaceKey'
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
 * Editor shortcuts: save (Ctrl+S), undo/redo, select all, copy/paste/duplicate, delete,
 * Escape and Space (play/pause; held down with a drag it pans the view). Inactive while `enabled` is false or a dialog is open;
 * menus and windows with `data-blocks-editing` only hold back the ones that change the pitch.
 * Space does not start or pause the animation while any menu or window is open.
 */
export function useKeyboardShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let clipboard: Element[] = []

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
      const scene = currentScene(store)
      const selected = store.selectedIds
        .map((id) => findElement(scene, id))
        .filter((el): el is Element => el !== undefined)
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const edits = mod ? ['z', 'y', 'd', 'v'].includes(key) : e.key === 'Delete' || e.key === 'Backspace'
      // Nothing changes on the pitch behind a menu or window that is about something else.
      if (edits && document.querySelector('[data-blocks-editing]')) {
        e.preventDefault()
        return
      }

      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        store.redo()
      } else if (mod && key === 'a') {
        e.preventDefault()
        store.selectMany(allElementIds(scene))
      } else if (mod && key === 'd') {
        e.preventDefault()
        if (selected.length > 0) store.insertCopies(selected)
      } else if (mod && key === 'c') {
        if (selected.length > 0) clipboard = selected
      } else if (mod && key === 'v') {
        if (clipboard.length === 0) return
        e.preventDefault()
        const ids = store.insertCopies(clipboard)
        // Repeated pastes cascade instead of stacking on the same spot.
        const pasted = currentScene(useDrillStore.getState())
        clipboard = ids.map((id) => findElement(pasted, id)).filter((el): el is Element => el !== undefined)
      } else if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selected.length === 0) return
        e.preventDefault()
        store.deleteElements(selected.map((el) => el.id))
      } else if (e.key === 'Escape') {
        if (e.defaultPrevented) return // closed a menu
        store.select(null)
        usePlaybackStore.getState().stop()
      } else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        // Playback toggles on release, unless the space bar was used to pan the view.
        e.preventDefault()
        if (!e.repeat) {
          spaceKey.down = true
          // Behind an open menu or window it can still pan, but does not start or pause the animation.
          spaceKey.usedForPan = document.querySelector('[role="menu"], [role="dialog"]') !== null
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key !== ' ' || !spaceKey.down) return
      spaceKey.down = false
      if (!spaceKey.usedForPan && !isTyping(e.target)) togglePlayback()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [enabled])
}

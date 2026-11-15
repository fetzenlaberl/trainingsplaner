import { renderSceneToCanvas } from '../export/renderDrill'
import { serializeDrill } from '../model/serialize'
import type { Drill } from '../model/types'
import { currentDrill, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { createEntry, updateEntry, type LibraryEntry } from './library'
import { getEntry, putEntry } from './libraryDb'
import { useLibraryLink } from './libraryStore'

/** Thumbnail resolution in pixels per meter (full field ≈ 450 × 300 px). */
const THUMBNAIL_SCALE = 4

async function createThumbnail(drill: Drill): Promise<string | null> {
  try {
    const canvas = await renderSceneToCanvas(drill.fieldType, drill.scenes[0], THUMBNAIL_SCALE)
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch {
    return null // The drill is still saved, just without a preview image.
  }
}

/** True if the drill in the editor differs from what is saved in the library. */
export function isEditorDirty(): boolean {
  return serializeDrill(currentDrill(useDrillStore.getState())) !== useLibraryLink.getState().savedJson
}

/** Saves the drill in the editor to the library (updates its entry if it already has one). */
export async function saveEditorToLibrary(): Promise<LibraryEntry> {
  const drill = currentDrill(useDrillStore.getState())
  const thumbnail = await createThumbnail(drill)
  const now = Date.now()
  const { libraryId } = useLibraryLink.getState()
  const existing = libraryId ? await getEntry(libraryId) : undefined
  const entry = existing ? updateEntry(existing, drill, thumbnail, now) : createEntry(drill, thumbnail, now)
  await putEntry(entry)
  useLibraryLink.getState().setLink(entry.id, serializeDrill(drill))
  return entry
}

/** Opens a library entry in the editor. */
export function openEntryInEditor(entry: LibraryEntry): void {
  usePlaybackStore.getState().stop()
  useDrillStore.getState().loadDrill(entry.drill)
  useLibraryLink.getState().setLink(entry.id, serializeDrill(entry.drill))
}

/** Detaches the editor from the library (new drill or a drill opened from a file). */
export function unlinkEditor(savedJson: string | null): void {
  useLibraryLink.getState().setLink(null, savedJson)
}

/** Saves the editor's drill to the library and reports errors to the user. */
export async function saveToLibraryWithFeedback(): Promise<void> {
  try {
    await saveEditorToLibrary()
  } catch (err) {
    console.error(err)
    window.alert(
      'Speichern in der Bibliothek fehlgeschlagen. Möglicherweise erlaubt dieser Browser (z. B. im privaten Modus) keine dauerhafte Speicherung. Speichere die Übung sicherheitshalber als Datei.',
    )
  }
}

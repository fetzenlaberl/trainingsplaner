import { getViewport } from '../field/dimensions'
import { usePlaybackStore } from '../store/playbackStore'
import { useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { importPictureFile, importTextFile, ImportError, isText } from './fileImport'

export type ImportTarget = 'item' | 'background' | 'text'

/** Middle of the visible field (meters), where imported objects are placed. */
function fieldCenter(): { x: number; y: number } {
  const { fieldType, pitch } = useDrillStore.getState()
  const viewport = getViewport(fieldType, pitch.area)
  return { x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 }
}

function selectNew(id: string) {
  usePlaybackStore.getState().stop()
  useToolStore.getState().setTool('select')
  useDrillStore.getState().select(id)
}

/**
 * Imports a file: a picture or PDF as an object on the pitch or as background,
 * a text file as a text box. Returns an error message for the user, or null.
 */
export async function importFile(file: File, target: ImportTarget): Promise<string | null> {
  try {
    const store = useDrillStore.getState()
    if (target === 'text' || (target === 'item' && isText(file))) {
      const text = await importTextFile(file)
      if (!text) return 'Die Textdatei ist leer.'
      const { x, y } = fieldCenter()
      selectNew(store.addItem({ type: 'textbox', color: '#fde047', label: text }, x, y))
      return null
    }
    const picture = await importPictureFile(file)
    const id = store.addImage(picture.src)
    if (target === 'background') {
      store.setPitchBackground({ background: id })
      return null
    }
    const { x, y } = fieldCenter()
    selectNew(store.addItem({ type: 'image', color: '#ffffff', label: id }, x, y))
    return null
  } catch (err) {
    console.error(err)
    return err instanceof ImportError ? err.message : 'Die Datei konnte nicht geöffnet werden.'
  }
}

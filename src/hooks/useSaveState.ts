import { useCallback, useState } from 'react'

export type SaveState = 'saved' | 'saving' | 'failed'

/** Keeps track of background writes per record id, so a save button can show their outcome. */
export function useSaveState() {
  const [states, setStates] = useState<Record<string, SaveState>>({})

  const track = useCallback((id: string, write: Promise<void>, onError: (err: unknown) => void) => {
    const set = (state: SaveState) => setStates((all) => ({ ...all, [id]: state }))
    set('saving')
    write.then(
      () => set('saved'),
      (err) => {
        set('failed')
        onError(err)
      },
    )
  }, [])

  return { stateOf: (id: string): SaveState => states[id] ?? 'saved', track }
}

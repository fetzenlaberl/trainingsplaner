import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isPhoneScreen } from './hooks/useIsPhone'
import { restoreDrill, startAutosave } from './store/persistence'
import { useViewStore } from './store/viewStore'

restoreDrill()
startAutosave()

// Phones start in the library (there is no full editor on small screens).
if (isPhoneScreen()) useViewStore.getState().setView('library')

// Ask the browser not to clear the stored drills, sessions and teams when space runs low.
void navigator.storage?.persist?.().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

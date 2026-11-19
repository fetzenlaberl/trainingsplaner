import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { restoreDrill, startAutosave } from './store/persistence'

restoreDrill()
startAutosave()

// Ask the browser not to clear the stored drills, sessions and teams when space runs low.
void navigator.storage?.persist?.().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

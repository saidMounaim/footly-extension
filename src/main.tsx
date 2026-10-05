import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, pageStorage, readCachedTheme } from './lib/theme.ts'

// Apply the last chosen theme before the first paint; the saved setting confirms it after load.
applyTheme(document.documentElement, readCachedTheme(pageStorage()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

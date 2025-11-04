/**
 * Renderer process entry point
 */
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(<App />)
// Setup IPC listeners
if (window.api) {
  window.api.onAbout(() => {
    console.log('Received About event from main process')
  })
  window.api.onPing((payload) => {
    console.log(`Received Ping event from main process with payload: ${payload}`)
  })
}

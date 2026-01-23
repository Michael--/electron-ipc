import { createRoot } from 'react-dom/client'
import { App } from './App'
import { LoggerWindow } from './LoggerWindow'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

// Determine which component to render based on role query parameter
const params = new URLSearchParams(window.location.search)
const role = params.get('role')

createRoot(root).render(role === 'logger' ? <LoggerWindow /> : <App />)

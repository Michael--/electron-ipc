import { contextBridge } from 'electron'
import { api, ApiType } from './api-generated'

/**
 * Preload script - runs in isolated context
 *
 * This is where we expose the generated IPC API to the renderer
 */

declare global {
  interface Window {
    api: ApiType
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.api = api
}

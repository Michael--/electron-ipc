import { ApiType, exposeApi } from '../../dist/ipc-api.generated'

/**
 * Preload script - exposes IPC API to renderer
 */

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()

console.log('✅ Preload script loaded, IPC API exposed')

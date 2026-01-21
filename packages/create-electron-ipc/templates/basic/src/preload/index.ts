import { ApiType, exposeApi } from '@gen/ipc-api'

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

exposeApi()

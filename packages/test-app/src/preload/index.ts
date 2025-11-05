import { ApiType, exposeApi } from './api-generated'

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

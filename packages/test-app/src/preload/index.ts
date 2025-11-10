import { ApiType, exposeApi } from './api-generated'
import { StreamApiType, exposeApi as exposeStreamApi } from './api-stream-generated'

/**
 * Preload script - runs in isolated context
 *
 * This is where we expose the generated IPC API to the renderer
 */

declare global {
  interface Window {
    api: ApiType
    streamApi: StreamApiType
  }
}

exposeApi()
exposeStreamApi()

import { ApiType, exposeApi } from './ipc-api.generated'

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()

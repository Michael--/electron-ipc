import { ApiType, exposeApi } from '@gen/ipc-api'

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()

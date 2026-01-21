import { LabApiType, exposeLabApi } from '@gen/lab-api'
import { LabStreamApiType, exposeLabStreamApi } from '@gen/lab-stream-api'

declare global {
  interface Window {
    labApi: LabApiType
    labStreamApi: LabStreamApiType
  }
}

exposeLabApi()
exposeLabStreamApi()

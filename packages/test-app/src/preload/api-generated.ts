import { ipcRenderer } from 'electron'

import { ITestBroadcastContracts } from '../main/ipc-api'

// This function takes the channel and request, infers the types, and calls ipcRenderer.on with the correct types enforced.
const onITestBroadcastContracts = <K extends keyof ITestBroadcastContracts>(
  channel: K,
  callback: (payload: ITestBroadcastContracts[K]['payload']) => void
): void => {
  ipcRenderer.on(channel as string, (_event, payload: ITestBroadcastContracts[K]['payload']) =>
    callback(payload)
  )
}

const ITestBroadcastContractsApi = {
  onAbout: (callback: (content: ITestBroadcastContracts['About']['payload']) => void) => {
    return onITestBroadcastContracts('About', callback)
  },
}

export const api = {
  ...ITestBroadcastContractsApi,
}
export type ApiType = typeof api

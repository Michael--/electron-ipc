import { ipcRenderer } from 'electron'

import { InvokeContracts } from '../main/ipc-api'

// This function takes the channel and request, infers the types, and calls ipcRenderer.invoke with the correct types enforced.
const invokeInvokeContracts = <K extends keyof InvokeContracts>(
  channel: K,
  request: InvokeContracts[K]['request']
): Promise<InvokeContracts[K]['response']> => {
  return ipcRenderer.invoke(channel as string, request) as Promise<InvokeContracts[K]['response']>
}

const InvokeContractsApi = {
  invokeAddNumbers: (request: InvokeContracts['AddNumbers']['request']) => {
    return invokeInvokeContracts('AddNumbers', request)
  },
}

import { EventContracts } from '../main/ipc-api'

// This function takes the channel and request, infers the types, and calls ipcRenderer.send with the correct types enforced.
const sendEventContracts = <K extends keyof EventContracts>(
  channel: K,
  request: EventContracts[K]['request']
): void => {
  ipcRenderer.send(channel as string, request)
}

const EventContractsApi = {
  sendQuit: (request: EventContracts['Quit']['request']) => {
    return sendEventContracts('Quit', request)
  },
}

import { IBroadcastContracts } from '../main/ipc-api'

// This function takes the channel and request, infers the types, and calls ipcRenderer.on with the correct types enforced.
const onIBroadcastContracts = <K extends keyof IBroadcastContracts>(
  channel: K,
  callback: (payload: IBroadcastContracts[K]['payload']) => void
): void => {
  ipcRenderer.on(channel as string, (_event, payload: IBroadcastContracts[K]['payload']) =>
    callback(payload)
  )
}

const IBroadcastContractsApi = {
  onPing: (callback: (content: IBroadcastContracts['Ping']['payload']) => void) => {
    return onIBroadcastContracts('Ping', callback)
  },
  onAbout: (callback: (content: IBroadcastContracts['About']['payload']) => void) => {
    return onIBroadcastContracts('About', callback)
  },
}

export const api = {
  ...InvokeContractsApi,
  ...EventContractsApi,
  ...IBroadcastContractsApi,
}
export type ApiType = typeof api

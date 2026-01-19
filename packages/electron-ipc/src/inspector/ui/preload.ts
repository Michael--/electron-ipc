import { contextBridge, ipcRenderer } from 'electron'
import type {
  InspectorCommand,
  InspectorCommandResponsePayload,
  InspectorEventBatchPayload,
  InspectorEventPayload,
  InspectorInitPayload,
  InspectorStatusPayload,
} from '../inspector-contracts'

/**
 * Inspector API exposed to renderer process
 */
const inspectorAPI = {
  /**
   * Sends HELLO message to main process
   */
  hello: () => {
    ipcRenderer.send('INSPECTOR:HELLO', {
      version: '1.0',
      timestamp: Date.now(),
    })
  },

  /**
   * Sends a command to main process
   */
  sendCommand: (command: InspectorCommand) => {
    ipcRenderer.send('INSPECTOR:COMMAND', { command })
  },

  /**
   * Gets current status from main process
   */
  getStatus: async (): Promise<InspectorStatusPayload | null> => {
    try {
      return await ipcRenderer.invoke('INSPECTOR:GET_STATUS')
    } catch {
      return null
    }
  },

  /**
   * Listens for INIT message from main process
   */
  onInit: (callback: (payload: InspectorInitPayload) => void) => {
    ipcRenderer.on('INSPECTOR:INIT', (_event, payload: InspectorInitPayload) => {
      callback(payload)
    })
  },

  /**
   * Listens for live trace events from main process
   */
  onEvent: (callback: (payload: InspectorEventPayload) => void) => {
    ipcRenderer.on('INSPECTOR:EVENT', (_event, payload: InspectorEventPayload) => {
      callback(payload)
    })
  },

  /**
   * Listens for event batches from main process
   */
  onEventBatch: (callback: (payload: InspectorEventBatchPayload) => void) => {
    ipcRenderer.on('INSPECTOR:EVENT_BATCH', (_event, payload: InspectorEventBatchPayload) => {
      callback(payload)
    })
  },

  /**
   * Listens for status updates from main process
   */
  onStatus: (callback: (payload: InspectorStatusPayload) => void) => {
    ipcRenderer.on('INSPECTOR:STATUS', (_event, payload: InspectorStatusPayload) => {
      callback(payload)
    })
  },

  /**
   * Listens for command responses from main process
   */
  onCommandResponse: (callback: (payload: InspectorCommandResponsePayload) => void) => {
    ipcRenderer.on(
      'INSPECTOR:COMMAND_RESPONSE',
      (_event, payload: InspectorCommandResponsePayload) => {
        callback(payload)
      }
    )
  },
}

// Expose API to renderer process
contextBridge.exposeInMainWorld('inspectorAPI', inspectorAPI)

// Type declaration for TypeScript
export type InspectorAPI = typeof inspectorAPI

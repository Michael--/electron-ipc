/* eslint-disable no-console */
/**
 * IPC Handlers for High-Volume Test
 */

import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  defineEventHandlers,
  defineInvokeHandlers,
} from '@number10/electron-ipc'
import { getTestStats, startHighVolumeTest, stopHighVolumeTest } from './high-volume-generator'
import type { EventContracts, InvokeContracts } from './ipc-api'

/**
 * Register IPC handlers using electron-ipc
 */
class RegisterHandler extends AbstractRegisterHandler {
  handlers = defineInvokeHandlers<InvokeContracts>({
    testPing: async (_event, request) => {
      return {
        echo: request.message,
        timestamp: Date.now(),
      }
    },
    testHeavy: async (_event, request) => {
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1))

      return {
        processed: true,
        size: request.data?.length || 0,
      }
    },
    testError: async (_event, request) => {
      if (request.shouldFail) {
        throw new Error('Simulated error')
      }
      return { success: true }
    },
    controlStart: async (_event, request) => {
      try {
        const testId = startHighVolumeTest(
          request.mode,
          request.eventsPerSecond,
          request.duration,
          request.payloadSize || 0
        )
        return {
          started: true,
          testId,
        }
      } catch (error) {
        throw new Error(`Failed to start test: ${(error as Error).message}`)
      }
    },
    controlStop: async () => {
      stopHighVolumeTest()
      return { stopped: true }
    },
    controlStatus: async () => {
      return getTestStats()
    },
  })
}

/**
 * Register event handlers
 */
class RegisterEvent extends AbstractRegisterEvent {
  events = defineEventHandlers<EventContracts>({
    testEvent: (_event, payload) => {
      console.log('[Main] Received test event:', payload)
    },
  })
}

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers() {
  RegisterHandler.register()
  RegisterEvent.register()
  console.log('[IPC] All handlers registered')
}

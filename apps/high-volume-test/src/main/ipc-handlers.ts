/**
 * IPC Handlers for High-Volume Test
 */

import { api as ipcAPI } from './ipc-api.generated'
import { startHighVolumeTest, stopHighVolumeTest, getTestStats } from './high-volume-generator'

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers() {
  // Test: Ping
  ipcAPI.handle('testPing', async (request) => {
    return {
      echo: request.message,
      timestamp: Date.now(),
    }
  })

  // Test: Heavy payload
  ipcAPI.handle('testHeavy', async (request) => {
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1))

    return {
      processed: true,
      size: request.data?.length || 0,
    }
  })

  // Test: Error
  ipcAPI.handle('testError', async (request) => {
    if (request.shouldFail) {
      throw new Error('Simulated error')
    }
    return { success: true }
  })

  // Control: Start test
  ipcAPI.handle('controlStart', async (request) => {
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
  })

  // Control: Stop test
  ipcAPI.handle('controlStop', async () => {
    stopHighVolumeTest()
    return { stopped: true }
  })

  // Control: Get status
  ipcAPI.handle('controlStatus', async () => {
    return getTestStats()
  })

  // Listen to events from renderer
  ipcAPI.on('testEvent', (payload) => {
    console.log('[Main] Received test event:', payload)
  })

  console.log('[IPC] All handlers registered')
}

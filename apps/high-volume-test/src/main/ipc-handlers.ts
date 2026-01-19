/* eslint-disable no-console */
/**
 * IPC Handlers for High-Volume Test
 */

import { ipcMain } from 'electron'
import { getTestStats, startHighVolumeTest, stopHighVolumeTest } from './high-volume-generator'
import type { EventContracts, InvokeContracts } from './ipc-api'

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers() {
  // Test: Ping
  ipcMain.handle('testPing', async (_event, request: InvokeContracts['testPing']['request']) => {
    return {
      echo: request.message,
      timestamp: Date.now(),
    } as InvokeContracts['testPing']['response']
  })

  // Test: Heavy payload
  ipcMain.handle('testHeavy', async (_event, request: InvokeContracts['testHeavy']['request']) => {
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1))

    return {
      processed: true,
      size: request.data?.length || 0,
    } as InvokeContracts['testHeavy']['response']
  })

  // Test: Error
  ipcMain.handle('testError', async (_event, request: InvokeContracts['testError']['request']) => {
    if (request.shouldFail) {
      throw new Error('Simulated error')
    }
    return { success: true } as InvokeContracts['testError']['response']
  })

  // Control: Start test
  ipcMain.handle(
    'controlStart',
    async (_event, request: InvokeContracts['controlStart']['request']) => {
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
        } as InvokeContracts['controlStart']['response']
      } catch (error) {
        throw new Error(`Failed to start test: ${(error as Error).message}`)
      }
    }
  )

  // Control: Stop test
  ipcMain.handle('controlStop', async () => {
    stopHighVolumeTest()
    return { stopped: true } as InvokeContracts['controlStop']['response']
  })

  // Control: Get status
  ipcMain.handle('controlStatus', async () => {
    return getTestStats() as InvokeContracts['controlStatus']['response']
  })

  // Listen to events from renderer
  ipcMain.on('testEvent', (_event, payload: EventContracts['testEvent']['request']) => {
    console.log('[Main] Received test event:', payload)
  })

  console.log('[IPC] All handlers registered')
}

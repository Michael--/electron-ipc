/**
 * Auto-initialization for Inspector IPC handlers
 *
 * This module registers dummy handlers for Inspector IPC channels
 * to prevent console errors when the Inspector is not explicitly enabled.
 *
 * These handlers will be replaced by real handlers when enableIpcInspector() is called.
 */

// Only run in main process (ipcMain is only available there)
let initialized = false

// Store handler references so they can be replaced later
let payloadModeHandler: (() => string) | null = null
let statusHandler:
  | (() => {
      isTracing: boolean
      traceEnabled: boolean
      eventCount: number
      bufferCapacity: number
      droppedCount: number
      payloadMode: string
    })
  | null = null

/**
 * Registers default Inspector handlers to prevent console errors
 * when Inspector is not explicitly enabled.
 *
 * Automatically disabled in production builds.
 */
export function ensureInspectorHandlers(): void {
  // Only initialize once
  if (initialized) {
    return
  }
  initialized = true

  // Never register handlers in production
  if (process.env.NODE_ENV === 'production') {
    return
  }

  // Only run in main process
  try {
    // Import ipcMain dynamically - this will fail gracefully in renderer/preload
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ipcMain } = require('electron')

    if (!ipcMain) {
      return
    }

    // Create default handlers that can be replaced
    payloadModeHandler = () => 'redacted'

    statusHandler = () => ({
      isTracing: false,
      traceEnabled: false,
      eventCount: 0,
      bufferCapacity: 0,
      droppedCount: 0,
      payloadMode: 'redacted',
    })

    // Register dummy handler for GET_PAYLOAD_MODE if not already registered
    const payloadModeListeners = ipcMain.listenerCount('INSPECTOR:GET_PAYLOAD_MODE')

    if (!payloadModeListeners) {
      ipcMain.handle('INSPECTOR:GET_PAYLOAD_MODE', () => payloadModeHandler?.())
    }

    // Register dummy handler for GET_STATUS if not already registered
    const statusListeners = ipcMain.listenerCount('INSPECTOR:GET_STATUS')

    if (!statusListeners) {
      ipcMain.handle('INSPECTOR:GET_STATUS', () => statusHandler?.())
    }
  } catch {
    // Silently ignore errors (e.g., when not in main process)
  }
}

/**
 * Replaces the default handlers with real Inspector handlers
 * Called internally by enableIpcInspector
 */
export function replaceInspectorHandlers(
  newPayloadModeHandler: () => string,
  newStatusHandler: () => {
    isTracing: boolean
    traceEnabled: boolean
    eventCount: number
    bufferCapacity: number
    droppedCount: number
    payloadMode: string
  }
): void {
  payloadModeHandler = newPayloadModeHandler
  statusHandler = newStatusHandler
}

// Auto-initialize when module is imported
ensureInspectorHandlers()

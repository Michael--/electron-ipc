/**
 * Renderer-to-Renderer IPC Routing
 *
 * Main-process router that mediates invoke calls between renderer processes.
 * Provides type-safe, timeout-aware request-response communication while
 * maintaining security through main process validation.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import { emitTrace, createTraceEnvelope, createPayloadPreview } from '../inspector/trace'
import { unwrapTracePayload, wrapTracePayload } from '../inspector/trace-propagation'
import { getWindowRegistry } from '../window-manager/registry'
import { getWindowFromEvent } from '../window-manager/helpers'

/**
 * Timeout constraints for renderer invoke requests
 */
const MIN_TIMEOUT = 100
const MAX_TIMEOUT = 60000

/**
 * Envelope for renderer invoke requests (renderer → main)
 */
interface RendererInvokeEnvelope {
  requestId: string
  targetRole: string
  channel: string
  request: unknown
  timeout: number
  sourceWindowId: number
}

/**
 * Envelope for renderer invoke responses (target renderer → main → source renderer)
 */
interface RendererResponseEnvelope {
  requestId: string
  response?: unknown
  error?: { message: string; name?: string; stack?: string }
}

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
  sourceWindowId: number
  targetWindowId: number
  channel: string
  targetRole: string
  tsStart: number
  cleanupHandler?: () => void
}

/**
 * Main-process router for renderer-to-renderer invoke calls.
 * Handles request routing, response correlation, and timeout management.
 */
export class RendererInvokeRouter {
  private pendingRequests = new Map<string, PendingRequest>()
  private routeHandler?: (
    event: IpcMainInvokeEvent,
    envelope: RendererInvokeEnvelope
  ) => Promise<unknown>
  private responseHandler?: (
    event: Electron.IpcMainEvent,
    response: RendererResponseEnvelope
  ) => void

  constructor() {
    this.setupHandlers()
  }

  /**
   * Set up IPC handlers for routing
   */
  private setupHandlers(): void {
    // Handle invoke requests from renderers
    this.routeHandler = async (
      event: IpcMainInvokeEvent,
      envelope: Omit<RendererInvokeEnvelope, 'requestId' | 'sourceWindowId'>
    ) => {
      return this.route(event, envelope)
    }
    ipcMain.handle('__RENDERER_ROUTE__', this.routeHandler)

    // Handle responses from target renderers
    this.responseHandler = (event: Electron.IpcMainEvent, response: RendererResponseEnvelope) => {
      this.handleResponse(event, response)
    }
    ipcMain.on('__RENDERER_RESPONSE__', this.responseHandler)
  }

  /**
   * Route a renderer invoke request to the target window
   */
  private async route(
    event: IpcMainInvokeEvent,
    envelope: Omit<RendererInvokeEnvelope, 'requestId' | 'sourceWindowId'>
  ): Promise<unknown> {
    const { targetRole, channel, request: rawRequest, timeout: rawTimeout } = envelope
    const requestId = randomUUID()
    const tsStart = Date.now()

    // Validate and clamp timeout to prevent abuse
    const timeout = Math.max(MIN_TIMEOUT, Math.min(rawTimeout, MAX_TIMEOUT))

    const sourceWindow = getWindowFromEvent(event)
    if (!sourceWindow) {
      throw new Error('Source window not found')
    }

    // Find target window by role
    const targetWindows = getWindowRegistry().getByRole(targetRole)
    if (targetWindows.length === 0) {
      throw new Error(`No window with role '${targetRole}' found`)
    }

    const targetWindow = targetWindows[0].window
    if (targetWindow.isDestroyed()) {
      throw new Error(`Target window '${targetRole}' is destroyed`)
    }

    // Unwrap trace context if present
    const { payload: request, trace } = unwrapTracePayload(rawRequest)

    // Emit trace for main-process routing
    if (trace) {
      emitTrace({
        id: trace.spanId,
        kind: 'invoke',
        channel,
        direction: 'renderer→renderer',
        status: 'ok',
        tsStart,
        trace: createTraceEnvelope(trace, tsStart),
        source: {
          windowId: sourceWindow.id,
          webContentsId: sourceWindow.webContents.id,
        },
        request: createPayloadPreview(request),
      })
    }

    // Create promise for response
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const pending = this.pendingRequests.get(requestId)
        if (pending) {
          pending.cleanupHandler?.()
          this.pendingRequests.delete(requestId)
        }

        // Emit trace for timeout
        if (trace) {
          const tsEnd = Date.now()
          emitTrace({
            id: trace.spanId,
            kind: 'invoke',
            channel,
            direction: 'renderer→renderer',
            status: 'timeout',
            tsStart,
            tsEnd,
            durationMs: tsEnd - tsStart,
            trace: createTraceEnvelope(trace, tsStart, tsEnd),
            source: {
              windowId: sourceWindow.id,
              webContentsId: sourceWindow.webContents.id,
            },
            request: createPayloadPreview(request),
            error: { name: 'TimeoutError', message: `Timeout after ${timeout}ms` },
          })
        }

        reject(new Error(`Renderer invoke timeout after ${timeout}ms for channel '${channel}'`))
      }, timeout)

      // Setup cleanup handlers for window lifecycle
      const sourceCleanup = () => {
        const pending = this.pendingRequests.get(requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(requestId)
          reject(new Error(`Source window closed before response for channel '${channel}'`))
        }
      }

      const targetCleanup = () => {
        const pending = this.pendingRequests.get(requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(requestId)
          reject(new Error(`Target window closed before response for channel '${channel}'`))
        }
      }

      const combinedCleanup = () => {
        sourceWindow.webContents.off('destroyed', sourceCleanup)
        targetWindow.webContents.off('destroyed', targetCleanup)
      }

      sourceWindow.webContents.once('destroyed', sourceCleanup)
      targetWindow.webContents.once('destroyed', targetCleanup)

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        sourceWindowId: sourceWindow.id,
        targetWindowId: targetWindow.id,
        channel,
        targetRole,
        tsStart,
        cleanupHandler: combinedCleanup,
      })

      // Get source role if available
      const sourceMetadata = getWindowRegistry().getByWindowId(sourceWindow.id)

      // Send request to target renderer (with trace)
      targetWindow.webContents.send(`__RENDERER_HANDLER_${channel}__`, {
        requestId,
        request: wrapTracePayload(request, trace ?? undefined),
        sourceWindowId: sourceWindow.id,
        sourceRole: sourceMetadata?.role,
      })
    })
  }

  /**
   * Handle response from target renderer
   */
  private handleResponse(event: Electron.IpcMainEvent, response: RendererResponseEnvelope): void {
    const { requestId, response: rawData, error } = response
    const pending = this.pendingRequests.get(requestId)

    if (!pending) {
      return // Already timed out or resolved
    }

    // Security: Validate that response comes from expected target window
    const senderWindow = getWindowFromEvent(event)
    if (!senderWindow || senderWindow.id !== pending.targetWindowId) {
      console.warn(
        `[RendererInvokeRouter] Response spoofing attempt: expected window ${pending.targetWindowId}, got ${senderWindow?.id ?? 'unknown'}`
      )
      return
    }

    pending.cleanupHandler?.()
    clearTimeout(pending.timeout)
    this.pendingRequests.delete(requestId)

    const tsEnd = Date.now()

    // Unwrap trace context if present
    const { payload: data, trace } = unwrapTracePayload(rawData)

    if (error) {
      // Emit trace for error response
      if (trace) {
        const sourceWindow = getWindowRegistry().getByWindowId(pending.sourceWindowId)?.window
        emitTrace({
          id: trace.spanId,
          kind: 'invoke',
          channel: pending.channel,
          direction: 'renderer→renderer',
          status: 'error',
          tsStart: pending.tsStart,
          tsEnd,
          durationMs: tsEnd - pending.tsStart,
          trace: createTraceEnvelope(trace, pending.tsStart, tsEnd),
          source: {
            windowId: pending.sourceWindowId,
            webContentsId: sourceWindow?.webContents.id ?? 0,
          },
          error: { name: error.name ?? 'Error', message: error.message },
        })
      }

      const err = new Error(error.message)
      if (error.name) err.name = error.name
      if (error.stack) err.stack = error.stack
      pending.reject(err)
    } else {
      // Emit trace for successful response
      if (trace) {
        const sourceWindow = getWindowRegistry().getByWindowId(pending.sourceWindowId)?.window
        emitTrace({
          id: trace.spanId,
          kind: 'invoke',
          channel: pending.channel,
          direction: 'renderer→renderer',
          status: 'ok',
          tsStart: pending.tsStart,
          tsEnd,
          durationMs: tsEnd - pending.tsStart,
          trace: createTraceEnvelope(trace, pending.tsStart, tsEnd),
          source: {
            windowId: pending.sourceWindowId,
            webContentsId: sourceWindow?.webContents.id ?? 0,
          },
          response: createPayloadPreview(data),
        })
      }

      pending.resolve(data)
    }
  }

  /**
   * Get statistics about pending requests
   */
  public getStats(): {
    pendingRequests: number
    requests: Array<{ channel: string; targetRole: string; waitingMs: number }>
  } {
    const now = Date.now()
    const requests = Array.from(this.pendingRequests.values()).map((req) => ({
      channel: req.channel,
      targetRole: req.targetRole,
      waitingMs: now - req.tsStart,
    }))

    return {
      pendingRequests: this.pendingRequests.size,
      requests,
    }
  }

  /**
   * Clean up all pending requests (e.g., on app shutdown)
   */
  public cleanup(): void {
    // Clean up all pending requests with their cleanup handlers
    for (const pending of this.pendingRequests.values()) {
      pending.cleanupHandler?.()
      clearTimeout(pending.timeout)
      pending.reject(new Error('Router cleanup: request cancelled'))
    }
    this.pendingRequests.clear()

    // Remove IPC handlers to prevent memory leaks
    if (this.routeHandler) {
      ipcMain.removeHandler('__RENDERER_ROUTE__')
      this.routeHandler = undefined
    }
    if (this.responseHandler) {
      ipcMain.removeListener('__RENDERER_RESPONSE__', this.responseHandler)
      this.responseHandler = undefined
    }
  }
}

// Singleton instance
let routerInstance: RendererInvokeRouter | null = null

/**
 * Initialize the renderer invoke router.
 * Call this once in your main process setup before creating windows.
 *
 * @example
 * ```typescript
 * import { initRendererInvokeRouter } from '@number10/electron-ipc/renderer-routing'
 *
 * app.whenReady().then(() => {
 *   initRendererInvokeRouter()
 *   createMainWindow()
 * })
 * ```
 */
export function initRendererInvokeRouter(): void {
  if (!routerInstance) {
    routerInstance = new RendererInvokeRouter()
  }
}

/**
 * Get the router instance.
 * Throws if router hasn't been initialized.
 */
export function getRendererInvokeRouter(): RendererInvokeRouter {
  if (!routerInstance) {
    throw new Error('RendererInvokeRouter not initialized. Call initRendererInvokeRouter() first.')
  }
  return routerInstance
}

/**
 * Reset the router (mainly for testing)
 */
export function resetRendererInvokeRouter(): void {
  if (routerInstance) {
    routerInstance.cleanup()
    routerInstance = null
  }
}

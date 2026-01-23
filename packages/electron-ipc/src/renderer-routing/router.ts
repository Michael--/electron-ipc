/**
 * Renderer-to-Renderer IPC Routing
 *
 * Main-process router that mediates invoke calls between renderer processes.
 * Provides type-safe, timeout-aware request-response communication while
 * maintaining security through main process validation.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { getWindowRegistry } from '../window-manager/registry'
import { getWindowFromEvent } from '../window-manager/helpers'

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
  channel: string
  targetRole: string
  tsStart: number
}

/**
 * Main-process router for renderer-to-renderer invoke calls.
 * Handles request routing, response correlation, and timeout management.
 */
export class RendererInvokeRouter {
  private pendingRequests = new Map<string, PendingRequest>()
  private requestCounter = 0

  constructor() {
    this.setupHandlers()
  }

  /**
   * Set up IPC handlers for routing
   */
  private setupHandlers(): void {
    // Handle invoke requests from renderers
    ipcMain.handle(
      '__RENDERER_ROUTE__',
      async (event, envelope: Omit<RendererInvokeEnvelope, 'requestId' | 'sourceWindowId'>) => {
        return this.route(event, envelope)
      }
    )

    // Handle responses from target renderers
    ipcMain.on('__RENDERER_RESPONSE__', (_event, response: RendererResponseEnvelope) => {
      this.handleResponse(response)
    })
  }

  /**
   * Route a renderer invoke request to the target window
   */
  private async route(
    event: IpcMainInvokeEvent,
    envelope: Omit<RendererInvokeEnvelope, 'requestId' | 'sourceWindowId'>
  ): Promise<unknown> {
    const { targetRole, channel, request, timeout } = envelope
    const requestId = this.generateRequestId()
    const tsStart = Date.now()

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

    // Create promise for response
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Renderer invoke timeout after ${timeout}ms for channel '${channel}'`))
      }, timeout)

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        sourceWindowId: sourceWindow.id,
        channel,
        targetRole,
        tsStart,
      })

      // Get source role if available
      const sourceMetadata = getWindowRegistry().getByWindowId(sourceWindow.id)

      // Send request to target renderer
      targetWindow.webContents.send(`__RENDERER_HANDLER_${channel}__`, {
        requestId,
        request,
        sourceWindowId: sourceWindow.id,
        sourceRole: sourceMetadata?.role,
      })
    })
  }

  /**
   * Handle response from target renderer
   */
  private handleResponse(response: RendererResponseEnvelope): void {
    const { requestId, response: data, error } = response
    const pending = this.pendingRequests.get(requestId)

    if (!pending) {
      return // Already timed out or resolved
    }

    clearTimeout(pending.timeout)
    this.pendingRequests.delete(requestId)

    if (error) {
      const err = new Error(error.message)
      if (error.name) err.name = error.name
      if (error.stack) err.stack = error.stack
      pending.reject(err)
    } else {
      pending.resolve(data)
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    this.requestCounter = (this.requestCounter + 1) % 1000000
    return `rr-${Date.now()}-${this.requestCounter.toString(36)}`
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
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Router cleanup: request cancelled'))
    })
    this.pendingRequests.clear()
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

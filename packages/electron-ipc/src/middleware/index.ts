import type { IpcMainInvokeEvent } from 'electron'

/**
 * Generic Koa-style middleware type.
 *
 * @param ctx - Middleware context
 * @param next - Next middleware in the chain
 * @returns Promise that resolves when middleware completes
 */
export type Middleware<Context> = (ctx: Context, next: () => Promise<void>) => Promise<void>

/**
 * Context passed to invoke middleware.
 */
export interface InvokeMiddlewareContext {
  /**
   * Electron IPC event for the invoke call.
   */
  event: IpcMainInvokeEvent
  /**
   * IPC channel name for the invoke.
   */
  channel: string
  /**
   * Request payload received from the renderer.
   */
  request: unknown
  /**
   * Response payload returned to the renderer.
   */
  response?: unknown
}

/**
 * Context passed to event middleware.
 */
export interface EventMiddlewareContext {
  /**
   * Electron IPC event for the event call.
   */
  event: IpcMainInvokeEvent
  /**
   * IPC channel name for the event.
   */
  channel: string
  /**
   * Request payload received from the renderer.
   */
  request: unknown
}

/**
 * Context passed to stream invoke middleware.
 */
export interface StreamInvokeMiddlewareContext {
  /**
   * Electron IPC event for the stream invoke call.
   */
  event: IpcMainInvokeEvent
  /**
   * IPC channel name for the stream invoke.
   */
  channel: string
  /**
   * Request payload received from the renderer.
   */
  request: unknown
  /**
   * Stream returned by the handler.
   */
  stream?: ReadableStream<unknown>
}

/**
 * Context passed to stream upload middleware.
 */
export interface StreamUploadMiddlewareContext {
  /**
   * Electron IPC event for the stream upload call.
   */
  event: IpcMainInvokeEvent
  /**
   * IPC channel name for the stream upload.
   */
  channel: string
  /**
   * Request payload received from the renderer.
   */
  request: unknown
}

/**
 * Context passed to stream download middleware.
 */
export interface StreamDownloadMiddlewareContext {
  /**
   * Electron IPC event for the stream download call.
   */
  event: IpcMainInvokeEvent
  /**
   * IPC channel name for the stream download.
   */
  channel: string
  /**
   * Request payload received from the renderer.
   */
  request: unknown
  /**
   * Stream returned by the handler.
   */
  stream?: ReadableStream<unknown>
}

/**
 * Context passed to renderer invoke middleware.
 */
export interface RendererInvokeMiddlewareContext {
  /**
   * Electron IPC event for the renderer invoke route.
   */
  event: IpcMainInvokeEvent
  /**
   * IPC channel name for the renderer invoke.
   */
  channel: string
  /**
   * Request payload received from the source renderer.
   */
  request: unknown
  /**
   * Target window role to route to.
   */
  targetRole: string
  /**
   * Timeout for the renderer invoke in milliseconds.
   */
  timeout: number
  /**
   * Source window id.
   */
  sourceWindowId: number
  /**
   * Target window id (available after routing).
   */
  targetWindowId?: number
  /**
   * Response payload returned to the source renderer.
   */
  response?: unknown
}

/**
 * Context passed to broadcast middleware.
 */
export interface BroadcastMiddlewareContext {
  /**
   * IPC channel name for the broadcast.
   */
  channel: string
  /**
   * Payload sent to the renderer.
   */
  payload: unknown
  /**
   * Target window for the broadcast.
   */
  window: import('electron').BrowserWindow
  /**
   * Broadcast mode identifier.
   */
  mode: 'single' | 'all' | 'role' | 'app'
  /**
   * Target role for role broadcasts.
   */
  role?: string
  /**
   * Excluded roles for broadcast-to-all.
   */
  excludeRoles?: string[]
}

/**
 * Middleware for invoke IPC calls (renderer → main).
 */
export type InvokeMiddleware = Middleware<InvokeMiddlewareContext>

/**
 * Middleware for event IPC calls (renderer → main).
 */
export type EventMiddleware = Middleware<EventMiddlewareContext>

/**
 * Middleware for stream invoke IPC calls (renderer ↔ main).
 */
export type StreamInvokeMiddleware = Middleware<StreamInvokeMiddlewareContext>

/**
 * Middleware for stream upload IPC calls (renderer → main).
 */
export type StreamUploadMiddleware = Middleware<StreamUploadMiddlewareContext>

/**
 * Middleware for stream download IPC calls (main → renderer).
 */
export type StreamDownloadMiddleware = Middleware<StreamDownloadMiddlewareContext>

/**
 * Middleware for renderer invoke routing (renderer ↔ renderer via main).
 */
export type RendererInvokeMiddleware = Middleware<RendererInvokeMiddlewareContext>

/**
 * Middleware for broadcast operations (main → renderer).
 */
export type BroadcastMiddleware = Middleware<BroadcastMiddlewareContext>

/**
 * IPC middleware registration object.
 */
export interface IpcMiddleware {
  /**
   * Middleware for invoke handlers (renderer → main).
   */
  onInvoke?: InvokeMiddleware
  /**
   * Middleware for event handlers (renderer → main).
   */
  onEvent?: EventMiddleware
  /**
   * Middleware for stream invoke handlers (renderer ↔ main).
   */
  onStreamInvoke?: StreamInvokeMiddleware
  /**
   * Middleware for stream upload handlers (renderer → main).
   */
  onStreamUpload?: StreamUploadMiddleware
  /**
   * Middleware for stream download handlers (main → renderer).
   */
  onStreamDownload?: StreamDownloadMiddleware
  /**
   * Middleware for renderer-to-renderer invoke routing.
   */
  onRendererInvoke?: RendererInvokeMiddleware
  /**
   * Middleware for broadcast operations (main → renderer).
   */
  onBroadcast?: BroadcastMiddleware
}

const invokeMiddlewareRegistry: InvokeMiddleware[] = []
const eventMiddlewareRegistry: EventMiddleware[] = []
const streamInvokeMiddlewareRegistry: StreamInvokeMiddleware[] = []
const streamUploadMiddlewareRegistry: StreamUploadMiddleware[] = []
const streamDownloadMiddlewareRegistry: StreamDownloadMiddleware[] = []
const rendererInvokeMiddlewareRegistry: RendererInvokeMiddleware[] = []
const broadcastMiddlewareRegistry: BroadcastMiddleware[] = []

/**
 * Registers IPC middleware handlers.
 *
 * @param middleware - Middleware registration object
 * @returns Unregister function
 */
export const registerIpcMiddleware = (middleware: IpcMiddleware): (() => void) => {
  const unregisters: Array<() => void> = []

  if (middleware.onInvoke) {
    const handler = middleware.onInvoke
    invokeMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = invokeMiddlewareRegistry.indexOf(handler)
      if (index >= 0) invokeMiddlewareRegistry.splice(index, 1)
    })
  }

  if (middleware.onEvent) {
    const handler = middleware.onEvent
    eventMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = eventMiddlewareRegistry.indexOf(handler)
      if (index >= 0) eventMiddlewareRegistry.splice(index, 1)
    })
  }

  if (middleware.onStreamInvoke) {
    const handler = middleware.onStreamInvoke
    streamInvokeMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = streamInvokeMiddlewareRegistry.indexOf(handler)
      if (index >= 0) streamInvokeMiddlewareRegistry.splice(index, 1)
    })
  }

  if (middleware.onStreamUpload) {
    const handler = middleware.onStreamUpload
    streamUploadMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = streamUploadMiddlewareRegistry.indexOf(handler)
      if (index >= 0) streamUploadMiddlewareRegistry.splice(index, 1)
    })
  }

  if (middleware.onStreamDownload) {
    const handler = middleware.onStreamDownload
    streamDownloadMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = streamDownloadMiddlewareRegistry.indexOf(handler)
      if (index >= 0) streamDownloadMiddlewareRegistry.splice(index, 1)
    })
  }

  if (middleware.onRendererInvoke) {
    const handler = middleware.onRendererInvoke
    rendererInvokeMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = rendererInvokeMiddlewareRegistry.indexOf(handler)
      if (index >= 0) rendererInvokeMiddlewareRegistry.splice(index, 1)
    })
  }

  if (middleware.onBroadcast) {
    const handler = middleware.onBroadcast
    broadcastMiddlewareRegistry.push(handler)
    unregisters.push(() => {
      const index = broadcastMiddlewareRegistry.indexOf(handler)
      if (index >= 0) broadcastMiddlewareRegistry.splice(index, 1)
    })
  }

  return () => {
    unregisters.forEach((unregister) => unregister())
  }
}

/**
 * Clears all registered IPC middleware.
 */
export const clearIpcMiddleware = (): void => {
  invokeMiddlewareRegistry.length = 0
  eventMiddlewareRegistry.length = 0
  streamInvokeMiddlewareRegistry.length = 0
  streamUploadMiddlewareRegistry.length = 0
  streamDownloadMiddlewareRegistry.length = 0
  rendererInvokeMiddlewareRegistry.length = 0
  broadcastMiddlewareRegistry.length = 0
}

/**
 * Runs invoke middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runInvokeMiddleware = async (
  context: InvokeMiddlewareContext,
  terminal: InvokeMiddleware
): Promise<void> => {
  const composed = composeMiddleware<InvokeMiddlewareContext>([
    ...invokeMiddlewareRegistry,
    terminal,
  ])
  await composed(context)
}

/**
 * Runs event middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runEventMiddleware = async (
  context: EventMiddlewareContext,
  terminal: EventMiddleware
): Promise<void> => {
  const composed = composeMiddleware<EventMiddlewareContext>([...eventMiddlewareRegistry, terminal])
  await composed(context)
}

/**
 * Runs stream invoke middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runStreamInvokeMiddleware = async (
  context: StreamInvokeMiddlewareContext,
  terminal: StreamInvokeMiddleware
): Promise<void> => {
  const composed = composeMiddleware<StreamInvokeMiddlewareContext>([
    ...streamInvokeMiddlewareRegistry,
    terminal,
  ])
  await composed(context)
}

/**
 * Runs stream upload middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runStreamUploadMiddleware = async (
  context: StreamUploadMiddlewareContext,
  terminal: StreamUploadMiddleware
): Promise<void> => {
  const composed = composeMiddleware<StreamUploadMiddlewareContext>([
    ...streamUploadMiddlewareRegistry,
    terminal,
  ])
  await composed(context)
}

/**
 * Runs stream download middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runStreamDownloadMiddleware = async (
  context: StreamDownloadMiddlewareContext,
  terminal: StreamDownloadMiddleware
): Promise<void> => {
  const composed = composeMiddleware<StreamDownloadMiddlewareContext>([
    ...streamDownloadMiddlewareRegistry,
    terminal,
  ])
  await composed(context)
}

/**
 * Runs renderer invoke middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runRendererInvokeMiddleware = async (
  context: RendererInvokeMiddlewareContext,
  terminal: RendererInvokeMiddleware
): Promise<void> => {
  const composed = composeMiddleware<RendererInvokeMiddlewareContext>([
    ...rendererInvokeMiddlewareRegistry,
    terminal,
  ])
  await composed(context)
}

/**
 * Runs broadcast middleware chain.
 *
 * @param context - Middleware context
 * @param terminal - Terminal middleware that executes the handler
 * @returns Promise that resolves when the chain completes
 */
export const runBroadcastMiddleware = async (
  context: BroadcastMiddlewareContext,
  terminal: BroadcastMiddleware
): Promise<void> => {
  const composed = composeMiddleware<BroadcastMiddlewareContext>([
    ...broadcastMiddlewareRegistry,
    terminal,
  ])
  await composed(context)
}

const composeMiddleware = <Context>(
  middleware: Middleware<Context>[]
): ((context: Context) => Promise<void>) => {
  return async (context) => {
    let index = -1
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i
      const fn = middleware[i]
      if (!fn) return
      await fn(context, () => dispatch(i + 1))
    }
    await dispatch(0)
  }
}

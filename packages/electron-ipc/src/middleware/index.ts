import type { IpcMainInvokeEvent } from 'electron'

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
 * Next function for invoke middleware.
 */
export type InvokeMiddlewareNext = () => Promise<void>

/**
 * Middleware for invoke IPC calls (Koa-style).
 *
 * @param ctx - Invoke middleware context
 * @param next - Next middleware in the chain
 * @returns Promise that resolves when middleware completes
 */
export type InvokeMiddleware = (
  ctx: InvokeMiddlewareContext,
  next: InvokeMiddlewareNext
) => Promise<void>

/**
 * IPC middleware registration object.
 */
export interface IpcMiddleware {
  /**
   * Middleware for invoke handlers (renderer → main).
   */
  onInvoke?: InvokeMiddleware
}

const invokeMiddlewareRegistry: InvokeMiddleware[] = []

/**
 * Registers IPC middleware handlers.
 *
 * @param middleware - Middleware registration object
 * @returns Unregister function
 */
export const registerIpcMiddleware = (middleware: IpcMiddleware): (() => void) => {
  if (middleware.onInvoke) {
    const handler = middleware.onInvoke
    invokeMiddlewareRegistry.push(handler)
    return () => {
      const index = invokeMiddlewareRegistry.indexOf(handler)
      if (index >= 0) invokeMiddlewareRegistry.splice(index, 1)
    }
  }
  return () => {
    // No-op unregister for empty registration
  }
}

/**
 * Clears all registered IPC middleware.
 */
export const clearIpcMiddleware = (): void => {
  invokeMiddlewareRegistry.length = 0
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
  const composed = composeInvokeMiddleware([...invokeMiddlewareRegistry, terminal])
  await composed(context)
}

const composeInvokeMiddleware = (
  middleware: InvokeMiddleware[]
): ((context: InvokeMiddlewareContext) => Promise<void>) => {
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

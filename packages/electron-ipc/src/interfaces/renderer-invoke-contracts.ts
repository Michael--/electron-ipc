/**
 * Renderer-to-Renderer Invoke Contracts
 *
 * Enables type-safe request-response communication between renderer processes
 * via main process routing. This pattern allows windows to communicate directly
 * while maintaining security through the main process as a mediator.
 *
 * Key features:
 * - Type-safe request-response between renderers
 * - Main process routing and validation
 * - Timeout handling and error propagation
 * - Full Inspector tracing support
 *
 * Define renderer invoke contracts:
 * ```typescript
 * export type RendererInvokeContracts = GenericRendererInvokeContract<{
 *   GetDashboardData: IRendererInvokeContract<
 *     { query: string },
 *     { data: unknown; timestamp: number }
 *   >
 * }>
 * ```
 *
 * Use in renderer A (caller):
 * ```typescript
 * const data = await window.api.rendererInvokeGetDashboardData('dashboard', {
 *   query: 'sales'
 * })
 * ```
 *
 * Handle in renderer B (target):
 * ```typescript
 * window.api.handleGetDashboardData(async (request, context) => {
 *   console.log(`Request from window ${context.sourceWindowId}`)
 *   return { data: await fetchData(request.query), timestamp: Date.now() }
 * })
 * ```
 */

import type { EnforceStructure, Serializable } from './types'

/**
 * Defines a renderer-to-renderer invoke contract with request-response pattern.
 * Both request and response must be serializable types (JSON-compatible).
 *
 * @interface IRendererInvokeContract
 * @typeparam TRequest - The type of the request data (must be Serializable or void)
 * @typeparam TResponse - The type of the response data (must be Serializable or void)
 */
export interface IRendererInvokeContract<
  TRequest extends Serializable | void,
  TResponse extends Serializable | void,
> {
  request: TRequest
  response: TResponse
}

/**
 * Generic type wrapper for renderer invoke contracts.
 * Ensures all contracts follow the IRendererInvokeContract structure.
 *
 * @typeparam T - Object containing named renderer invoke contracts
 */
export type GenericRendererInvokeContract<T> = {
  [P in keyof T]: T[P] extends IRendererInvokeContract<infer Req, infer Res>
    ? EnforceStructure<T[P], IRendererInvokeContract<Req, Res>>
    : never
}

/**
 * Context information passed to renderer invoke handlers
 */
export interface RendererInvokeContext {
  /** Web contents ID of the source window */
  sourceWindowId: number
  /** Role of the source window (if registered) */
  sourceRole?: string
}

/**
 * Type helper to extract request type from a renderer invoke contract
 */
export type RendererInvokeRequestType<
  T extends GenericRendererInvokeContract<T>,
  K extends keyof T,
> = T[K] extends IRendererInvokeContract<infer Req, Serializable | void> ? Req : never

/**
 * Type helper to extract response type from a renderer invoke contract
 */
export type RendererInvokeResponseType<
  T extends GenericRendererInvokeContract<T>,
  K extends keyof T,
> = T[K] extends IRendererInvokeContract<Serializable | void, infer Res> ? Res : never

/**
 * Handler function type for renderer invoke contracts
 */
export type RendererInvokeHandler<T extends GenericRendererInvokeContract<T>, K extends keyof T> = (
  request: RendererInvokeRequestType<T, K>,
  context: RendererInvokeContext
) => Promise<RendererInvokeResponseType<T, K>>

/**
 * Maps renderer invoke contract keys to their respective handler functions
 */
export type RendererInvokeHandlerType<T extends GenericRendererInvokeContract<T>> = {
  [K in keyof T]: RendererInvokeHandler<T, K>
}

/**
 * Helper to define renderer invoke handlers with full type checking
 */
export function defineRendererInvokeHandlers<T extends GenericRendererInvokeContract<T>>(
  handlers: RendererInvokeHandlerType<T>
): RendererInvokeHandlerType<T> {
  return handlers
}

/**
 * Abstract class for registering renderer invoke handlers.
 * Must be used with RendererInvokeRouter to enable renderer-to-renderer communication.
 *
 * @abstract
 * @class AbstractRegisterRendererInvoke
 * @example
 * ```typescript
 * class MyRendererInvokeHandler extends AbstractRegisterRendererInvoke {
 *   handlers: RendererInvokeHandlerType<MyRendererInvokeContracts> = {
 *     GetData: async (request, context) => {
 *       return { data: await fetchData(request.query) }
 *     }
 *   }
 * }
 * MyRendererInvokeHandler.register()
 * ```
 */
export abstract class AbstractRegisterRendererInvoke {
  private static instances: Record<string, AbstractRegisterRendererInvoke> = {}

  /**
   * Abstract property that subclasses must implement
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handlers: RendererInvokeHandlerType<any>

  /**
   * Registers an instance of the handler class
   */
  static register(this: { new (): AbstractRegisterRendererInvoke }) {
    const className = this.name
    if (AbstractRegisterRendererInvoke.instances[className] == null) {
      AbstractRegisterRendererInvoke.instances[className] = new this()
    }
    // Note: Actual handler registration is done by RendererInvokeRouter
    // This class is primarily for type checking and organization
  }
}

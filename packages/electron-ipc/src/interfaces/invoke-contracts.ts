/**
 * Invoke contracts for IPC communication.
 *
 * Invoke contracts enable bidirectional IPC communication for request-response patterns between
 * the renderer and main processes. The renderer sends a request and expects a response from the main process.
 *
 * Key features:
 * - Type-safe request-response communication
 * - Asynchronous handling with Promises
 * - Support for streaming responses (StreamInvoke)
 *
 * Define invoke contracts:
 * ```typescript
 * export type MyInvokeContracts = GenericInvokeContract<{
 *   HelloEcho: IInvokeContract<string, string>
 *   GetUser: IInvokeContract<{ id: number }, User>
 * }>
 * ```
 *
 * Implement in main process:
 * ```typescript
 * class MyHandler extends AbstractRegisterHandler {
 *   handlers: IPCHandlerType<MyInvokeContracts> = {
 *     HelloEcho: async (_event, message) => `Echo: ${message}`,
 *     GetUser: async (_event, { id }) => await fetchUser(id)
 *   }
 * }
 * MyHandler.register()
 * ```
 *
 * Use in renderer:
 * ```typescript
 * const echo = await window.api.invokeHelloEcho("Hello")
 * const user = await window.api.invokeGetUser({ id: 123 })
 * ```
 *
 * For streaming responses, use StreamInvoke contracts for large data or real-time streams.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import type {
  GenericInvokeContract,
  GenericStreamInvokeContract,
  RequestType,
  ResponseType,
  StreamDataType,
  StreamRequestType,
} from './types'

/**
 * Represents a generic interface for IPC invocation contracts, specifying a structured contract
 * with a defined request and response type to ensure type-safe IPC communication.
 * Both request and response must be serializable types (JSON-compatible).
 *
 * @interface IInvokeContract
 * @typeparam TRequest - The type of the data sent from the renderer to the main process (must be Serializable).
 * @typeparam TResponse - The type of the data sent as a response from the main process back to the renderer (must be Serializable).
 */
export interface IInvokeContract<
  TRequest extends import('./types').Serializable | void,
  TResponse extends import('./types').Serializable | void,
> {
  request: TRequest
  response: TResponse
}

/**
 * Represents a generic interface for IPC invocation contracts where the response is a stream.
 * The request is serializable, but the response is a ReadableStream of serializable data chunks.
 *
 * @interface IStreamInvokeContract
 * @typeparam TRequest - The type of the data sent from the renderer to the main process (must be Serializable).
 * @typeparam TData - The type of each data chunk in the stream (must be Serializable).
 */
export interface IStreamInvokeContract<
  TRequest extends import('./types').Serializable | void,
  TData extends import('./types').Serializable,
> {
  request: TRequest
  stream: TData
}

/**
 * Handles IPC communication by setting up a listener for the specified channel.
 * Removes any existing handler for the channel before setting the new one.
 *
 * @function handle
 * @typeparam T - The contract type.
 * @typeparam K - The key of the contract.
 * @param {K} channel - The IPC channel to listen on.
 * @param {Function} listener - The listener function to handle incoming messages.
 * @throws {Error} If the listener throws an error during execution.
 */
function handle<T extends GenericInvokeContract<T>, K extends keyof T>(
  channel: K,
  listener: (
    event: IpcMainInvokeEvent,
    args: RequestType<T, K>
  ) => Promise<ResponseType<T, K>> | ResponseType<T, K>
): void {
  ipcMain.removeHandler(channel as string)
  ipcMain.handle(channel as string, listener)
}

/**
 * Defines a handler type for IPC communication, facilitating type-safe request-response handling.
 *
 * @type {IPCHandler}
 * @typeparam T - The contract type.
 * @typeparam K - The key of the contract.
 */
type IPCHandler<T extends GenericInvokeContract<T>, K extends keyof T> = (
  event: IpcMainInvokeEvent,
  request: RequestType<T, K>
) => Promise<ResponseType<T, K>> | ResponseType<T, K>

/**
 * Maps IPC contract keys to their respective handler functions, ensuring type-safe IPC handling.
 *
 * @type {IPCHandlerType}
 * @typeparam T - The contract type being handled.
 */
export type IPCHandlerType<T extends GenericInvokeContract<T>> = {
  [K in keyof T]: IPCHandler<T, K>
}

/**
 * Defines a handler type for IPC stream invocation communication, returning a ReadableStream.
 *
 * @type {IPCStreamHandler}
 * @typeparam T - The stream contract type.
 * @typeparam K - The key of the contract.
 */
type IPCStreamHandler<T extends GenericStreamInvokeContract<T>, K extends keyof T> = (
  event: IpcMainInvokeEvent,
  request: StreamRequestType<T, K>
) => ReadableStream<StreamDataType<T, K>>

/**
 * Maps IPC stream contract keys to their respective handler functions.
 *
 * @type {IPCStreamHandlerType}
 * @typeparam T - The stream contract type being handled.
 */
export type IPCStreamHandlerType<T extends GenericStreamInvokeContract<T>> = {
  [K in keyof T]: IPCStreamHandler<T, K>
}

/**
 * An abstract class for registering IPC handlers. It maintains a registry of handler instances
 * and provides a mechanism to register handlers for specific IPC channels.
 *
 * @abstract
 * @class AbstractRegisterHandler
 * @example
 * ```typescript
 * class MyHandler extends AbstractRegisterHandler {
 *   handlers: IPCHandlerType<MyContracts> = {
 *     myChannel: async (event, request) => `Response to ${request}`
 *   };
 * }
 * MyHandler.register();
 * ```
 */
export abstract class AbstractRegisterHandler {
  private static instances: Record<string, AbstractRegisterHandler> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC handlers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handlers: IPCHandlerType<any>

  /**
   * Registers an instance of the handler class, ensuring only one instance per class name.
   */
  static register(this: { new (): AbstractRegisterHandler }) {
    const className = this.name
    if (AbstractRegisterHandler.instances[className] == null) {
      AbstractRegisterHandler.instances[className] = new this()
    }
    const instance = AbstractRegisterHandler.instances[className]
    instance.registerHandler()
  }

  /**
   * Registers the handlers for the IPC channels defined by the subclass.
   * @private
   */
  private registerHandler() {
    for (const [channel, handler] of Object.entries(this.handlers)) {
      handle(channel as never, handler)
    }
  }
}

/**
 * An abstract class for registering IPC stream handlers. It maintains a registry of stream handler instances
 * and provides a mechanism to register handlers for specific IPC stream channels.
 *
 * @abstract
 * @class AbstractRegisterStreamHandler
 * @example
 * ```typescript
 * class MyStreamHandler extends AbstractRegisterStreamHandler {
 *   handlers: IPCStreamHandlerType<MyStreamContracts> = {
 *     myStreamChannel: (event, request) => createReadableStream(request)
 *   };
 * }
 * MyStreamHandler.register();
 * ```
 * @throws {Error} If the handler does not return a valid Web Streams API ReadableStream.
 */
export abstract class AbstractRegisterStreamHandler {
  private static instances: Record<string, AbstractRegisterStreamHandler> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC stream handlers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handlers: IPCStreamHandlerType<any>

  /**
   * Registers an instance of the stream handler class, ensuring only one instance per class name.
   */
  static register(this: { new (): AbstractRegisterStreamHandler }) {
    const className = this.name
    if (AbstractRegisterStreamHandler.instances[className] == null) {
      AbstractRegisterStreamHandler.instances[className] = new this()
    }
    const instance = AbstractRegisterStreamHandler.instances[className]
    instance.registerHandler()
  }

  /**
   * Registers the stream handlers for the IPC channels defined by the subclass.
   * @private
   */
  private registerHandler() {
    const activeReaders = new Map<string, ReadableStreamDefaultReader<unknown>>()

    for (const [channel, handler] of Object.entries(this.handlers)) {
      ipcMain.handle(channel as string, async (event, args) => {
        const stream = handler(event, args)

        // Check if this is a Web Streams API ReadableStream (has getReader method)
        if (typeof stream.getReader === 'function') {
          // Web Streams API
          const reader = stream.getReader()
          const key = `${event.sender.id}:${channel}`
          const existingReader = activeReaders.get(key)
          if (existingReader) {
            try {
              await existingReader.cancel()
            } catch {
              // Ignore cancel errors
            }
          }
          activeReaders.set(key, reader)
          try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              event.sender.send(`${channel}-data`, value)
            }
            event.sender.send(`${channel}-end`)
          } catch (err) {
            event.sender.send(`${channel}-error`, err)
          } finally {
            activeReaders.delete(key)
            reader.releaseLock()
          }
        } else {
          // Fallback: Not a Web Streams API stream
          event.sender.send(
            `${channel}-error`,
            new Error('Handler must return a Web Streams API ReadableStream')
          )
        }
      })

      ipcMain.on(`${channel}-cancel`, async (event) => {
        const key = `${event.sender.id}:${channel}`
        const reader = activeReaders.get(key)
        if (!reader) return
        try {
          await reader.cancel()
        } catch {
          // Ignore cancel errors
        } finally {
          activeReaders.delete(key)
        }
      })
    }
  }
}

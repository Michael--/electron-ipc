/**
 * Stream contracts for IPC communication (upload and download).
 *
 * Stream contracts enable efficient handling of large data transfers or real-time data streams
 * between renderer and main processes using Web Streams API.
 *
 * Two types of streaming:
 * - **Stream Invoke**: Request-response with streaming response (e.g., large data downloads)
 * - **Stream Upload**: Renderer uploads data to main (e.g., file uploads)
 * - **Stream Download**: Main streams data to renderer (e.g., real-time updates)
 *
 * Key features:
 * - Web Streams API integration
 * - Efficient for large data
 * - Type-safe stream handling
 * - Automatic error handling and cleanup
 *
 * Define stream contracts:
 * ```typescript
 * export type MyStreamInvokeContracts = GenericStreamInvokeContract<{
 *   GetLargeData: IStreamInvokeContract<{ offset: number }, string>
 * }>
 *
 * export type MyUploadContracts = GenericStreamUploadContract<{
 *   UploadFile: IStreamUploadContract<{ filename: string }, Uint8Array>
 * }>
 *
 * export type MyDownloadContracts = GenericStreamDownloadContract<{
 *   DownloadLogs: IStreamDownloadContract<{ sinceMs: number }, string>
 * }>
 * ```
 *
 * Implement in main process:
 * ```typescript
 * class MyStreamHandler extends AbstractRegisterStreamHandler {
 *   handlers: IPCStreamHandlerType<MyStreamInvokeContracts> = {
 *     GetLargeData: async (event, { offset }) => {
 *       return createReadableStream(offset)
 *     }
 *   }
 * }
 *
 * class MyUploadHandler extends AbstractRegisterStreamUpload {
 *   handlers: IPCStreamUploadHandlerType<MyUploadContracts> = {
 *     UploadFile: ({ filename }, stream) => {
 *       // Handle upload stream
 *     }
 *   }
 * }
 *
 * class MyDownloadHandler extends AbstractRegisterStreamDownload {
 *   handlers: IPCStreamDownloadHandlerType<MyDownloadContracts> = {
 *     DownloadLogs: ({ sinceMs }, event) => {
 *       return createLogStream(sinceMs)
 *     }
 *   }
 * }
 * ```
 *
 * Use in renderer:
 * ```typescript
 * // Stream invoke
 * const stopStream = window.api.invokeStreamGetLargeData(
 *   { offset: 0 },
 *   {
 *     onData: (chunk) => console.log('Chunk:', chunk),
 *     onEnd: () => console.log('Stream complete'),
 *     onError: (err) => console.error(err),
 *   }
 * )
 *
 * // Upload
 * const uploadStream = window.api.uploadUploadFile({ filename: 'data.txt' })
 * await uploadStream.write(new Uint8Array([1, 2, 3]))
 * await uploadStream.close()
 *
 * // Download
 * const stopDownload = window.api.downloadDownloadLogs(
 *   { sinceMs: Date.now() },
 *   (log) => console.log('Log:', log),
 *   () => console.log('Download complete'),
 *   (err) => console.error(err)
 * )
 * ```
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import type {
  DownloadDataType,
  DownloadRequestType,
  GenericStreamDownloadContract,
  GenericStreamUploadContract,
  UploadDataType,
  UploadRequestType,
} from './types'

/**
 * IStreamUploadContract: A generic interface defining the structure for IPC stream upload contracts.
 * It specifies a contract with a request and data type for unidirectional streaming from renderer to main process.
 * Both request and data must be serializable types (JSON-compatible).
 *
 * @interface IStreamUploadContract
 * @typeparam TRequest - The type of the request payload sent when initiating the upload (must be Serializable).
 * @typeparam TData - The type of each data chunk sent from renderer to main (must be Serializable).
 */
export interface IStreamUploadContract<
  TRequest extends import('./types').Serializable,
  TData extends import('./types').Serializable,
> {
  request: TRequest
  data: TData
}

/**
 * Defines a handler type for IPC stream upload, receiving callback setters for handling the upload stream.
 *
 * @type {IPCStreamUploadHandler}
 * @typeparam T - The upload contract type.
 * @typeparam K - The key of the contract.
 */
type IPCStreamUploadHandler<T extends GenericStreamUploadContract<T>, K extends keyof T> = (
  request: UploadRequestType<T, K>,
  onData: (callback: (chunk: UploadDataType<T, K>) => void) => void,
  onEnd: (callback: () => void) => void,
  onError: (callback: (error: unknown) => void) => void
) => void

/**
 * Maps IPC stream upload contract keys to their respective handler functions.
 *
 * @type {IPCStreamUploadHandlerType}
 * @typeparam T - The upload contract type being handled.
 */
export type IPCStreamUploadHandlerType<T extends GenericStreamUploadContract<T>> = {
  [K in keyof T]: IPCStreamUploadHandler<T, K>
}

/**
 * An abstract class for registering IPC stream upload handlers.
 *
 * @abstract
 * @class AbstractRegisterStreamUpload
 * @example
 * ```typescript
 * class MyUploadHandler extends AbstractRegisterStreamUpload {
 *   handlers: IPCStreamUploadHandlerType<MyUploadContracts> = {
 *     uploadFile: (request, stream) => handleUpload(request, stream)
 *   };
 * }
 * MyUploadHandler.register();
 * ```
 * @throws {Error} If stream handling fails.
 */
export abstract class AbstractRegisterStreamUpload {
  private static instances: Record<string, AbstractRegisterStreamUpload> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC stream upload handlers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handlers: IPCStreamUploadHandlerType<any>

  /**
   * Registers an instance of the stream upload handler class.
   */
  static register(this: { new (): AbstractRegisterStreamUpload }) {
    const className = this.name
    if (AbstractRegisterStreamUpload.instances[className] == null) {
      AbstractRegisterStreamUpload.instances[className] = new this()
    }
    const instance = AbstractRegisterStreamUpload.instances[className]
    instance.registerHandler()
  }

  /**
   * Registers the stream upload handlers.
   * @private
   */
  private registerHandler() {
    // Map to track active upload callbacks
    const activeCallbacks = new Map<
      string,
      {
        onData: (chunk: import('./types').Serializable) => void
        onEnd: () => void
        onError: (error: unknown) => void
      }
    >()

    for (const [channel, handler] of Object.entries(this.handlers)) {
      // Listen for stream start with request parameter
      ipcMain.on(`${channel}-start`, (_event, request) => {
        // Create callback functions that the handler can replace
        let onDataCallback: (chunk: import('./types').Serializable) => void = (_chunk) => {
          // Default: do nothing
        }
        let onEndCallback: () => void = () => {
          // Default: do nothing
        }
        let onErrorCallback: (error: unknown) => void = (_error) => {
          // Default: do nothing
        }

        const onData = (callback: (chunk: import('./types').Serializable) => void) => {
          onDataCallback = callback
        }
        const onEnd = (callback: () => void) => {
          onEndCallback = callback
        }
        const onError = (callback: (error: unknown) => void) => {
          onErrorCallback = callback
        }

        // Store the callbacks for this channel
        activeCallbacks.set(channel, {
          onData: (chunk) => onDataCallback(chunk),
          onEnd: () => onEndCallback(),
          onError: (error) => onErrorCallback(error),
        })

        // Call the handler with the request and callback setters
        handler(request, onData, onEnd, onError)
      })

      // Listen for data chunks
      ipcMain.on(`${channel}-data`, (_event, chunk) => {
        const callbacks = activeCallbacks.get(channel)
        if (callbacks) {
          callbacks.onData(chunk)
        }
      })

      // Listen for stream end
      ipcMain.on(`${channel}-end`, () => {
        const callbacks = activeCallbacks.get(channel)
        if (callbacks) {
          callbacks.onEnd()
          activeCallbacks.delete(channel)
        }
      })

      // Listen for stream error/abort
      ipcMain.on(`${channel}-error`, (_event, err) => {
        const callbacks = activeCallbacks.get(channel)
        if (callbacks) {
          callbacks.onError(err)
          activeCallbacks.delete(channel)
        }
      })
    }
  }
}

/**
 * IStreamDownloadContract: A generic interface defining the structure for IPC stream download contracts.
 * It specifies a contract with a request and data type for unidirectional streaming from main to renderer process.
 * Both request and data must be serializable types (JSON-compatible).
 *
 * @interface IStreamDownloadContract
 * @typeparam TRequest - The type of the request payload sent when initiating the download (must be Serializable).
 * @typeparam TData - The type of each data chunk sent from main to renderer (must be Serializable).
 */
export interface IStreamDownloadContract<
  TRequest extends import('./types').Serializable,
  TData extends import('./types').Serializable,
> {
  request: TRequest
  data: TData
}

/**
 * Defines a handler type for IPC stream download, providing a ReadableStream to the renderer.
 *
 * @type {IPCStreamDownloadHandler}
 * @typeparam T - The download contract type.
 * @typeparam K - The key of the contract.
 */
type IPCStreamDownloadHandler<T extends GenericStreamDownloadContract<T>, K extends keyof T> = (
  request: DownloadRequestType<T, K>,
  event: IpcMainInvokeEvent
) => ReadableStream<DownloadDataType<T, K>>

/**
 * Maps IPC stream download contract keys to their respective handler functions.
 *
 * @type {IPCStreamDownloadHandlerType}
 * @typeparam T - The download contract type being handled.
 */
export type IPCStreamDownloadHandlerType<T extends GenericStreamDownloadContract<T>> = {
  [K in keyof T]: IPCStreamDownloadHandler<T, K>
}

/**
 * An abstract class for registering IPC stream download handlers.
 *
 * @abstract
 * @class AbstractRegisterStreamDownload
 * @example
 * ```typescript
 * class MyDownloadHandler extends AbstractRegisterStreamDownload {
 *   handlers: IPCStreamDownloadHandlerType<MyDownloadContracts> = {
 *     downloadFile: (request, event) => createDownloadStream(request)
 *   };
 * }
 * MyDownloadHandler.register();
 * ```
 * @throws {Error} If stream creation fails.
 */
export abstract class AbstractRegisterStreamDownload {
  private static instances: Record<string, AbstractRegisterStreamDownload> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC stream download handlers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handlers: IPCStreamDownloadHandlerType<any>

  /**
   * Registers an instance of the stream download handler class.
   */
  static register(this: { new (): AbstractRegisterStreamDownload }) {
    const className = this.name
    if (AbstractRegisterStreamDownload.instances[className] == null) {
      AbstractRegisterStreamDownload.instances[className] = new this()
    }
    const instance = AbstractRegisterStreamDownload.instances[className]
    instance.registerHandler()
  }

  /**
   * Registers the stream download handlers.
   * @private
   */
  private registerHandler() {
    const activeReaders = new Map<string, ReadableStreamDefaultReader<unknown>>()

    for (const [channel, handler] of Object.entries(this.handlers)) {
      ipcMain.handle(channel as string, async (event, request) => {
        const stream = handler(request, event)
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

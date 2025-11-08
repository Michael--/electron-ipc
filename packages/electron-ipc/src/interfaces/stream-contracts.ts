/**
 * Stream contracts for IPC communication (upload and download).
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
 * Defines a handler type for IPC stream upload, receiving a WritableStream from the renderer.
 *
 * @type {IPCStreamUploadHandler}
 * @typeparam T - The upload contract type.
 * @typeparam K - The key of the contract.
 */
type IPCStreamUploadHandler<T extends GenericStreamUploadContract<T>, K extends keyof T> = (
  request: UploadRequestType<T, K>,
  stream: WritableStream<UploadDataType<T, K>>
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
    for (const [channel, handler] of Object.entries(this.handlers)) {
      // Listen for stream start with request parameter
      ipcMain.on(`${channel}-start`, (_event, request) => {
        const writable = new WritableStream({
          write(_chunk) {
            /* handle chunk */
          },
          close() {
            /* handle end */
          },
          abort(_err) {
            /* handle error */
          },
        })
        handler(request, writable)
      })
      ipcMain.on(`${channel}-data`, (_event, _chunk) => {
        // Send to writable stream
      })
      ipcMain.on(`${channel}-end`, () => {
        // Close writable stream
      })
      ipcMain.on(`${channel}-error`, (_event, _err) => {
        // Abort writable stream
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
    for (const [channel, handler] of Object.entries(this.handlers)) {
      ipcMain.handle(channel as string, async (event, request) => {
        const stream = handler(request, event)
        const reader = stream.getReader()
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
        }
      })
    }
  }
}

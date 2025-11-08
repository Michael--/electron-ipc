/**
 * Helper types for creating a type-safe IPC (Inter-Process Communication) API for Electron applications.
 *
 * Overview:
 * 1) Define your API in three parts, each representing a mandatory contract:
 *    - Invoke: Bidirectional IPC contracts for request-response communication between the renderer and main processes.
 *    - Event: Unidirectional IPC contracts for events sent from the renderer to the main process without expecting direct responses.
 *    - Send: Unidirectional IPC contracts for data or events sent from the main process to the renderer.
 *
 * 2) To make the API accessible in the Renderer process, execute the generator script:
 *    - Note: The renderer script is basic and may require adjustments to your specific paths.
 *    - Ensure the generated API definitions are made available in your preload script (e.g., `window.api = api`).
 *
 * 3) Integrate individual API implementations into your main process:
 *    - For Invoke and Event, implement classes derived from a specialized abstract base class to guarantee inclusion of any defined API method.
 *    - For Send, use a typed command to ensure the correct calling signature.
 *
 * Define the API example:
 * 1) API Definitions
 *    export type IPCInvokeContracts = GenericInvokeContract<{ HelloEcho: IInvokeContract<string, string> }>;
 *    export type IPCEventContracts = GenericRendererEventContract<{ Message: IRendererEventContract<string> }>;
 *    export type IBroadcastContracts = GenericBroadcastContract<{ Status: IBroadcastContract<string> }>;
 *
 * 2) Execute the adjusted script
 *    - Adjustments include the source path of the API definition, the destination path of the generated API, and the names of your API contracts.
 *
 * 3) Implementations in the main process
 *    - After the renderer window is created, implement and register. Type control aids in implementing all API definitions:
 *      class RegisterHandler extends AbstractRegisterHandler { handlers: IPCHandlerType<IPCInvokeContracts> = { HelloEcho: async (_event, v) => `Echo:${JSON.stringify(v)}` }; }
 *      class RegisterEvent extends AbstractRegisterEvent { events: IPCEventType<IPCEventContracts> = { Message: (_event, v) => { console.log(`received: ${v}`); } }; }
 *      RegisterHandler.register();
 *      RegisterEvent.register();
 *
 *    - Utilize the send contract as needed:
 *      create a broadcast function for your contract:
 *      export const broadcast = createBroadcast<IBroadcastContracts>()
 *      broadcast("Status", mainWindow, "Ready");
 *
 * 4) Access from the renderer process, assuming the API is published at `window.api`:
 *    - For Invoke: `console.log(await window.api.invokeHelloEcho("Hello"));`
 *    - For Event: `window.api.sendMessage("Yo");`
 *    - For Send: `window.api.onStatus(v => console.log(v));`
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron'

/**
 * Defines types that can be safely serialized across IPC boundaries.
 * Only JSON-compatible types are allowed: primitives, arrays, and plain objects.
 * Excludes: Date, Map, Set, Function, Class instances, undefined in arrays/objects.
 * Includes: Buffer for binary data in Electron IPC.
 *
 * @type {Serializable}
 */
export type Serializable =
  | string
  | number
  | boolean
  | null
  | Buffer
  | { [key: string]: Serializable }
  | Serializable[]

/**
 * Enforces a structure match between a given type `T` and a specified `Structure`.
 * It ensures that `T` extends `Structure` and has exactly the same set of keys.
 *
 * @type {EnforceStructure}
 * @typeparam T - The target type to validate.
 * @typeparam Structure - The structure to enforce on `T`.
 * @returns `T` if it matches `Structure`, otherwise never.
 */
type EnforceStructure<T, Structure> = T extends Structure
  ? Exclude<keyof Structure, keyof T> extends never
    ? T
    : never
  : never

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
  TRequest extends Serializable | void,
  TResponse extends Serializable | void,
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
  TRequest extends Serializable | void,
  TData extends Serializable,
> {
  request: TRequest
  stream: TData
}

/**
 * Defines a mapping of IPC invocation contracts enforcing a specific structure on each contract.
 * This type iterates over keys of `T` and applies `IInvokeContract` structure enforcement.
 *
 * @type {GenericInvokeContract}
 * @typeparam T - A type representing a collection of IPC invocation contracts.
 */
export type GenericInvokeContract<T> = {
  [P in keyof T]: T[P] extends IInvokeContract<infer Req, infer Res>
    ? EnforceStructure<T[P], IInvokeContract<Req, Res>>
    : never
}

/**
 * Defines a mapping of IPC stream invocation contracts enforcing a specific structure on each contract.
 * This type iterates over keys of `T` and applies `IStreamInvokeContract` structure enforcement.
 *
 * @type {GenericStreamInvokeContract}
 * @typeparam T - A type representing a collection of IPC stream invocation contracts.
 */
export type GenericStreamInvokeContract<T> = {
  [P in keyof T]: T[P] extends IStreamInvokeContract<infer Req, infer Data>
    ? EnforceStructure<T[P], IStreamInvokeContract<Req, Data>>
    : never
}

/**
 * Utility type for extracting the request type from a specified IInvokeContract.
 *
 * @type {RequestType}
 * @typeparam T - The target contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified contract.
 */
export type RequestType<T extends GenericInvokeContract<T>, K extends keyof T> =
  T[K] extends IInvokeContract<infer Req, any> ? Req : never

/**
 * Utility type for extracting the response type from a specified IInvokeContract.
 *
 * @type {ResponseType}
 * @typeparam T - The target contract type.
 * @typeparam K - The key of the contract to extract the response type from.
 * @returns The response type of the specified contract.
 */
export type ResponseType<T extends GenericInvokeContract<T>, K extends keyof T> =
  T[K] extends IInvokeContract<any, infer Res> ? Res : never

/**
 * Utility type for extracting the request type from a specified IStreamInvokeContract.
 *
 * @type {StreamRequestType}
 * @typeparam T - The target stream contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified stream contract.
 */
export type StreamRequestType<T extends GenericStreamInvokeContract<T>, K extends keyof T> =
  T[K] extends IStreamInvokeContract<infer Req, any> ? Req : never

/**
 * Utility type for extracting the data type from a specified IStreamInvokeContract.
 *
 * @type {StreamDataType}
 * @typeparam T - The target stream contract type.
 * @typeparam K - The key of the contract to extract the data type from.
 * @returns The data type of the specified stream contract.
 */
export type StreamDataType<T extends GenericStreamInvokeContract<T>, K extends keyof T> =
  T[K] extends IStreamInvokeContract<any, infer Data> ? Data : never

/**
 * Handles IPC communication by setting up a listener for the specified channel.
 * Removes any existing handler for the channel before setting the new one.
 *
 * @function handle
 * @typeparam T - The contract type.
 * @typeparam K - The key of the contract.
 * @param {K} channel - The IPC channel to listen on.
 * @param {Function} listener - The listener function to handle incoming messages.
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
 */
export abstract class AbstractRegisterHandler {
  private static instances: Record<string, AbstractRegisterHandler> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC handlers.
   */
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
 */
export abstract class AbstractRegisterStreamHandler {
  private static instances: Record<string, AbstractRegisterStreamHandler> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC stream handlers.
   */
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
    for (const [channel, handler] of Object.entries(this.handlers)) {
      // Note: Stream handlers need special handling, as they return streams
      // For now, assume ipcMain.handle can handle ReadableStream responses
      ipcMain.handle(channel as string, async (event, args) => {
        const stream = handler(event, args)
        // Simulate streaming over IPC by sending chunks
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

/**
 * Defines a generic interface for IPC event contracts, specifying a contract with a request type for unidirectional
 * communication from the renderer to the main process. It's typically used for events or notifications where a direct
 * response is not expected, facilitating type-safe data transmission.
 * The request must be a serializable type (JSON-compatible).
 *
 * @interface IRendererEventContract
 * @typeparam TRequest - The type of the data sent from the renderer to the main process (must be Serializable).
 */
export interface IRendererEventContract<TRequest extends Serializable | void> {
  request: TRequest
}

/**
 * Represents a generic mapping of IPC event contracts, enforcing a specific structure on each contract.
 * This type iterates over keys of `T` and applies `IRendererEventContract` structure enforcement, ensuring that
 * each property adheres to the IRendererEventContract interface.
 *
 * @type {GenericRendererEventContract}
 * @typeparam T - A type representing a collection of IPC event contracts.
 */
export type GenericRendererEventContract<T> = {
  [P in keyof T]: T[P] extends IRendererEventContract<infer Req>
    ? EnforceStructure<T[P], IRendererEventContract<Req>>
    : never
}

/**
 * Utility type for extracting the request type from a specified IPCEventContract.
 * This type facilitates the extraction of the request type that's sent from the renderer to the main process,
 * allowing for type-safe handling of IPC events.
 *
 * @type {EventType}
 * @typeparam T - The target event contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified contract.
 */
export type EventType<T extends GenericRendererEventContract<T>, K extends keyof T> =
  T[K] extends IRendererEventContract<infer Req> ? Req : never

/**
 * Sets up a listener for IPC events on the specified channel. This function facilitates the removal of any
 * existing handlers for the channel before setting up the new listener, ensuring that IPC events are
 * handled as expected without duplicating listeners.
 *
 * @function on
 * @typeparam T - The event contract type.
 * @typeparam K - The key of the contract.
 * @param {K} channel - The IPC channel to listen on.
 * @param {Function} listener - The listener function to execute when an event is received.
 */
function on<T extends GenericRendererEventContract<T>, K extends keyof T>(
  channel: K,
  listener: (event: IpcMainInvokeEvent, args: EventType<T, K>) => void
): void {
  ipcMain.removeHandler(channel as string)
  ipcMain.on(channel as string, listener)
}

/**
 * Defines a handler type for IPC events, enabling type-safe processing of incoming event data.
 * This type specifies the structure of functions intended to handle IPC events, including the
 * event data and the Electron IpcMainInvokeEvent object.
 *
 * @type {IPCEvent}
 * @typeparam T - The event contract type.
 * @typeparam K - The key of the contract.
 */
type IPCEvent<T extends GenericRendererEventContract<T>, K extends keyof T> = (
  event: IpcMainInvokeEvent,
  request: EventType<T, K>
) => void

/**
 * Maps IPC event contract keys to their respective handler functions, ensuring type-safe handling
 * of IPC events. This type allows for a structured and type-safe definition of event handlers
 * corresponding to different IPC channels.
 *
 * @type {IPCEventType}
 * @typeparam T - The event contract type being handled.
 */
export type IPCEventType<T extends GenericRendererEventContract<T>> = {
  [K in keyof T]: IPCEvent<T, K>
}

/**
 * An abstract class for registering IPC event handlers. It maintains a registry of event handler instances
 * and provides a mechanism to register handlers for specific IPC event channels, facilitating the organized
 * and type-safe handling of IPC events.
 *
 * @abstract
 * @class AbstractRegisterEvent
 */
export abstract class AbstractRegisterEvent {
  private static instances: Record<string, AbstractRegisterEvent> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC events to be handled.
   */
  abstract events: IPCEventType<any>

  /**
   * Registers an instance of the event handler class, ensuring that only one instance per class name
   * is created and registered. This method facilitates the singleton pattern for handler instances.
   */
  static register(this: { new (): AbstractRegisterEvent }) {
    const className = this.name
    if (AbstractRegisterEvent.instances[className] == null) {
      AbstractRegisterEvent.instances[className] = new this()
    }
    const instance = AbstractRegisterEvent.instances[className]
    instance.registerHandler()
  }

  /**
   * Registers the event handlers for the IPC channels defined by the subclass. This method
   * iterates over the `events` property of the subclass and sets up IPC listeners accordingly.
   * @private
   */
  private registerHandler() {
    for (const [channel, handler] of Object.entries(this.events)) {
      on(channel as never, handler as never)
    }
  }
}

/**
 * IBroadcastContract: A generic interface defining the structure for IPC send contracts.
 * It specifies a contract with a payload type for unidirectional communication from the main process to the renderer.
 * Typically used for sending data or triggering events in the renderer from the main process.
 * The payload must be a serializable type (JSON-compatible).
 *
 * @interface
 * @typeparam TRequest - The type of the data (payload) sent from the main process to the renderer (must be Serializable).
 */
export interface IBroadcastContract<TRequest extends Serializable | void> {
  payload: TRequest
}

/**
 * Represents a generic mapping of IPC broadcast contracts, enforcing a specific structure on each contract.
 * This type iterates over keys of `T` and applies `IBroadcastContract` structure enforcement, ensuring that
 * each property adheres to the IBroadcastContract interface.
 *
 * @type {GenericBroadcastContract}
 * @typeparam T - A type representing a collection of IPC broadcast contracts.
 */
export type GenericBroadcastContract<T> = {
  [P in keyof T]: T[P] extends IBroadcastContract<infer Req>
    ? EnforceStructure<T[P], IBroadcastContract<Req>>
    : never
}

/**
 * Utility type for extracting the payload type from a specified IBroadcastContract.
 * This type facilitates the extraction of the payload type that's sent from the main process to the renderer,
 * allowing for type-safe handling of IPC broadcasts.
 *
 * @type {PayloadType}
 * @typeparam T - The target broadcast contract type.
 * @typeparam K - The key of the contract to extract the payload type from.
 * @returns The payload type of the specified contract.
 */
export type PayloadType<T extends GenericBroadcastContract<T>, K extends keyof T> =
  T[K] extends IBroadcastContract<infer Req> ? Req : never

/**
 * Creates a specialized broadcast function tailored to a specific set of IPC send contract interfaces.
 * This higher-order function returns a new function that is pre-configured to send IPC messages
 * according to the specified contracts, ensuring type safety for the channel names and payload structures.
 *
 * The returned function captures the generic type of the IPC contracts and provides a convenient way
 * to send IPC messages without repeatedly specifying the contract type.
 *
 * @returns A function that can be used to send IPC messages for the specified contract types. This function takes a channel name, a BrowserWindow instance, and a payload as arguments. It sends the payload to the specified channel if the BrowserWindow instance is not destroyed.
 * @template T A generic parameter representing the set of all possible IPC send contracts for which the broadcast function is being created. This parameter does not need to extend any specific type, offering flexibility in defining IPC contracts.
 */
export function createBroadcast<T>() {
  return <K extends keyof T>(
    channel: K,
    mainWindow: BrowserWindow,
    payload: T[K] extends { payload: infer P } ? P : never // Ensure payload compatibility
  ): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel as string, payload)
    }
  }
}

/**
 * IStreamUploadContract: A generic interface defining the structure for IPC stream upload contracts.
 * It specifies a contract with a data type for unidirectional streaming from renderer to main process.
 * The data must be a serializable type (JSON-compatible).
 *
 * @interface IStreamUploadContract
 * @typeparam TData - The type of each data chunk sent from renderer to main (must be Serializable).
 */
export interface IStreamUploadContract<TData extends Serializable> {
  data: TData
}

/**
 * Represents a generic mapping of IPC stream upload contracts, enforcing a specific structure on each contract.
 *
 * @type {GenericStreamUploadContract}
 * @typeparam T - A type representing a collection of IPC stream upload contracts.
 */
export type GenericStreamUploadContract<T> = {
  [P in keyof T]: T[P] extends IStreamUploadContract<infer Data>
    ? EnforceStructure<T[P], IStreamUploadContract<Data>>
    : never
}

/**
 * Utility type for extracting the data type from a specified IStreamUploadContract.
 *
 * @type {UploadDataType}
 * @typeparam T - The target upload contract type.
 * @typeparam K - The key of the contract.
 * @returns The data type of the specified contract.
 */
export type UploadDataType<T extends GenericStreamUploadContract<T>, K extends keyof T> =
  T[K] extends IStreamUploadContract<infer Data> ? Data : never

/**
 * IStreamDownloadContract: A generic interface defining the structure for IPC stream download contracts.
 * It specifies a contract with a data type for unidirectional streaming from main to renderer process.
 * The data must be a serializable type (JSON-compatible).
 *
 * @interface IStreamDownloadContract
 * @typeparam TData - The type of each data chunk sent from main to renderer (must be Serializable).
 */
export interface IStreamDownloadContract<TData extends Serializable> {
  data: TData
}

/**
 * Represents a generic mapping of IPC stream download contracts, enforcing a specific structure on each contract.
 *
 * @type {GenericStreamDownloadContract}
 * @typeparam T - A type representing a collection of IPC stream download contracts.
 */
export type GenericStreamDownloadContract<T> = {
  [P in keyof T]: T[P] extends IStreamDownloadContract<infer Data>
    ? EnforceStructure<T[P], IStreamDownloadContract<Data>>
    : never
}

/**
 * Utility type for extracting the data type from a specified IStreamDownloadContract.
 *
 * @type {DownloadDataType}
 * @typeparam T - The target download contract type.
 * @typeparam K - The key of the contract.
 * @returns The data type of the specified contract.
 */
export type DownloadDataType<T extends GenericStreamDownloadContract<T>, K extends keyof T> =
  T[K] extends IStreamDownloadContract<infer Data> ? Data : never

/**
 * Defines a handler type for IPC stream upload, receiving a WritableStream from the renderer.
 *
 * @type {IPCStreamUploadHandler}
 * @typeparam T - The upload contract type.
 * @typeparam K - The key of the contract.
 */
type IPCStreamUploadHandler<T extends GenericStreamUploadContract<T>, K extends keyof T> = (
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
 */
export abstract class AbstractRegisterStreamUpload {
  private static instances: Record<string, AbstractRegisterStreamUpload> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC stream upload handlers.
   */
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
      // Listen for stream start, data, end, error from renderer
      ipcMain.on(`${channel}-start`, () => {
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
        handler(writable)
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
 * Defines a handler type for IPC stream download, providing a ReadableStream to the renderer.
 *
 * @type {IPCStreamDownloadHandler}
 * @typeparam T - The download contract type.
 * @typeparam K - The key of the contract.
 */
type IPCStreamDownloadHandler<T extends GenericStreamDownloadContract<T>, K extends keyof T> = (
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
 */
export abstract class AbstractRegisterStreamDownload {
  private static instances: Record<string, AbstractRegisterStreamDownload> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC stream download handlers.
   */
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
      ipcMain.handle(channel as string, async (event) => {
        const stream = handler(event)
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

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
 *    export interface IBroadcastContracts { Status: IBroadcastContract<string>; }
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
 *      export const broadcast = createBroadcastFor<IBroadcastContracts>()
 *      broadcast("Status", mainWindow, "Ready");
 *
 * 4) Access from the renderer process, assuming the API is published at `window.api`:
 *    - For Invoke: `console.log(await window.api.invokeHelloEcho("Hello"));`
 *    - For Event: `window.api.sendMessage("Yo");`
 *    - For Send: `window.api.onStatus(v => console.log(v));`
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';

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
  : never;

/**
 * Represents a generic interface for IPC invocation contracts, specifying a structured contract
 * with a defined request and response type to ensure type-safe IPC communication.
 *
 * @interface IInvokeContract
 * @typeparam TRequest - The type of the data sent from the renderer to the main process.
 * @typeparam TResponse - The type of the data sent as a response from the main process back to the renderer.
 */
export interface IInvokeContract<TRequest, TResponse> {
  request: TRequest;
  response: TResponse;
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
    : never;
};

/**
 * Utility type for extracting the request type from a specified IInvokeContract.
 *
 * @type {RequestType}
 * @typeparam T - The target contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified contract.
 */
export type RequestType<T extends GenericInvokeContract<T>, K extends keyof T> =
  T[K] extends IInvokeContract<infer Req, any> ? Req : never;

/**
 * Utility type for extracting the response type from a specified IInvokeContract.
 *
 * @type {ResponseType}
 * @typeparam T - The target contract type.
 * @typeparam K - The key of the contract to extract the response type from.
 * @returns The response type of the specified contract.
 */
export type ResponseType<T extends GenericInvokeContract<T>, K extends keyof T> =
  T[K] extends IInvokeContract<any, infer Res> ? Res : never;

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
  ipcMain.removeHandler(channel as string);
  ipcMain.handle(channel as string, listener);
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
) => Promise<ResponseType<T, K>> | ResponseType<T, K>;

/**
 * Maps IPC contract keys to their respective handler functions, ensuring type-safe IPC handling.
 *
 * @type {IPCHandlerType}
 * @typeparam T - The contract type being handled.
 */
export type IPCHandlerType<T extends GenericInvokeContract<T>> = {
  [K in keyof T]: IPCHandler<T, K>;
};

/**
 * An abstract class for registering IPC handlers. It maintains a registry of handler instances
 * and provides a mechanism to register handlers for specific IPC channels.
 *
 * @abstract
 * @class AbstractRegisterHandler
 */
export abstract class AbstractRegisterHandler {
  private static instances: Record<string, AbstractRegisterHandler> = {};

  /**
   * Abstract property that subclasses must implement, defining the IPC handlers.
   */
  abstract handlers: IPCHandlerType<any>;

  /**
   * Registers an instance of the handler class, ensuring only one instance per class name.
   */
  static register(this: { new (): AbstractRegisterHandler }) {
    const className = this.name;
    if (AbstractRegisterHandler.instances[className] == null) {
      AbstractRegisterHandler.instances[className] = new this();
    }
    const instance = AbstractRegisterHandler.instances[className];
    instance.registerHandler();
  }

  /**
   * Registers the handlers for the IPC channels defined by the subclass.
   * @private
   */
  private registerHandler() {
    for (const [channel, handler] of Object.entries(this.handlers)) {
      handle(channel as never, handler);
    }
  }
}

/**
 * Defines a generic interface for IPC event contracts, specifying a contract with a request type for unidirectional
 * communication from the renderer to the main process. It's typically used for events or notifications where a direct
 * response is not expected, facilitating type-safe data transmission.
 *
 * @interface IRendererEventContract
 * @typeparam TRequest - The type of the data sent from the renderer to the main process.
 */
export interface IRendererEventContract<TRequest> {
  request: TRequest;
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
    : never;
};

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
  T[K] extends IRendererEventContract<infer Req> ? Req : never;

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
  ipcMain.removeHandler(channel as string);
  ipcMain.on(channel as string, listener);
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
) => void;

/**
 * Maps IPC event contract keys to their respective handler functions, ensuring type-safe handling
 * of IPC events. This type allows for a structured and type-safe definition of event handlers
 * corresponding to different IPC channels.
 *
 * @type {IPCEventType}
 * @typeparam T - The event contract type being handled.
 */
export type IPCEventType<T extends GenericRendererEventContract<T>> = {
  [K in keyof T]: IPCEvent<T, K>;
};

/**
 * An abstract class for registering IPC event handlers. It maintains a registry of event handler instances
 * and provides a mechanism to register handlers for specific IPC event channels, facilitating the organized
 * and type-safe handling of IPC events.
 *
 * @abstract
 * @class AbstractRegisterEvent
 */
export abstract class AbstractRegisterEvent {
  private static instances: Record<string, AbstractRegisterEvent> = {};

  /**
   * Abstract property that subclasses must implement, defining the IPC events to be handled.
   */
  abstract events: IPCEventType<any>;

  /**
   * Registers an instance of the event handler class, ensuring that only one instance per class name
   * is created and registered. This method facilitates the singleton pattern for handler instances.
   */
  static register(this: { new (): AbstractRegisterEvent }) {
    const className = this.name;
    if (AbstractRegisterEvent.instances[className] == null) {
      AbstractRegisterEvent.instances[className] = new this();
    }
    const instance = AbstractRegisterEvent.instances[className];
    instance.registerHandler();
  }

  /**
   * Registers the event handlers for the IPC channels defined by the subclass. This method
   * iterates over the `events` property of the subclass and sets up IPC listeners accordingly.
   * @private
   */
  private registerHandler() {
    for (const [channel, handler] of Object.entries(this.events)) {
      on(channel as never, handler as never);
    }
  }
}

/**
 * IBroadcastContract: A generic interface defining the structure for IPC send contracts.
 * It specifies a contract with a payload type for unidirectional communication from the main process to the renderer.
 * Typically used for sending data or triggering events in the renderer from the main process.
 *
 * @interface
 * @typeparam TRequest - The type of the data (payload) sent from the main process to the renderer.
 */
export interface IBroadcastContract<TRequest> {
  payload: TRequest;
}

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
export function createBroadcastFor<T>() {
  return <K extends keyof T>(
    channel: K,
    mainWindow: BrowserWindow,
    payload: T[K] extends { payload: infer P } ? P : never // Ensure payload compatibility
  ): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel as string, payload);
    }
  };
}

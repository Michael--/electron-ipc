/**
 * Event contracts for IPC communication.
 *
 * Event contracts enable unidirectional IPC communication from the renderer to the main process
 * for fire-and-forget notifications or commands. No response is expected from the main process.
 *
 * Key features:
 * - One-way communication (renderer → main)
 * - No return values or promises
 * - Ideal for notifications, commands, or logging
 *
 * Define event contracts:
 * ```typescript
 * export type MyEventContracts = GenericRendererEventContract<{
 *   LogMessage: IRendererEventContract<{ level: string; message: string }>
 *   Quit: IRendererEventContract<void>
 * }>
 * ```
 *
 * Implement in main process:
 * ```typescript
 * class MyEventHandler extends AbstractRegisterEvent {
 *   events: IPCEventType<MyEventContracts> = {
 *     LogMessage: (_event, { level, message }) => console.log(`[${level}] ${message}`),
 *     Quit: () => app.quit()
 *   }
 * }
 * MyEventHandler.register()
 * ```
 *
 * Use in renderer:
 * ```typescript
 * window.api.sendLogMessage({ level: 'info', message: 'App started' })
 * window.api.sendQuit()
 * ```
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import type { EventType, GenericRendererEventContract } from './types'

/**
 * Defines a generic interface for IPC event contracts, specifying a contract with a request type for unidirectional
 * communication from the renderer to the main process. It's typically used for events or notifications where a direct
 * response is not expected, facilitating type-safe data transmission.
 * The request must be a serializable type (JSON-compatible).
 *
 * @interface IRendererEventContract
 * @typeparam TRequest - The type of the data sent from the renderer to the main process (must be Serializable).
 */
export interface IRendererEventContract<TRequest extends import('./types').Serializable | void> {
  request: TRequest
}

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
 * @throws {Error} If the listener throws an error during execution.
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
 * Helper to define event handlers with full type checking.
 */
export function defineEventHandlers<T extends GenericRendererEventContract<T>>(
  events: IPCEventType<T>
): IPCEventType<T> {
  return events
}

/**
 * An abstract class for registering IPC event handlers. It maintains a registry of event handler instances
 * and provides a mechanism to register handlers for specific IPC event channels, facilitating the organized
 * and type-safe handling of IPC events.
 *
 * @abstract
 * @class AbstractRegisterEvent
 * @example
 * ```typescript
 * class MyEventHandler extends AbstractRegisterEvent {
 *   events: IPCEventType<MyEventContracts> = {
 *     myEvent: (event, request) => console.log('Received:', request)
 *   };
 * }
 * MyEventHandler.register();
 * ```
 */
export abstract class AbstractRegisterEvent {
  private static instances: Record<string, AbstractRegisterEvent> = {}

  /**
   * Abstract property that subclasses must implement, defining the IPC events to be handled.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

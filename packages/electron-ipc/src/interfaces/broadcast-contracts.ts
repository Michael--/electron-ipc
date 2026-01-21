/**
 * Broadcast contracts for IPC communication.
 *
 * Broadcast contracts enable unidirectional IPC communication from the main process to the renderer
 * for sending notifications, updates, or data without expecting a response.
 *
 * Key features:
 * - One-way communication (main → renderer)
 * - Type-safe payload delivery
 * - Automatic window destruction checks
 *
 * Define broadcast contracts:
 * ```typescript
 * export type MyBroadcastContracts = GenericBroadcastContract<{
 *   StatusUpdate: IBroadcastContract<{ status: string; progress: number }>
 *   Ping: IBroadcastContract<number>
 * }>
 * ```
 *
 * Use in main process:
 * ```typescript
 * const broadcast = createBroadcast<MyBroadcastContracts>()
 * broadcast("StatusUpdate", mainWindow, { status: 'loading', progress: 50 })
 * broadcast("Ping", mainWindow, Date.now())
 * ```
 *
 * Listen in renderer:
 * ```typescript
 * window.api.onStatusUpdate(({ status, progress }) => {
 *   console.log(`Status: ${status}, Progress: ${progress}%`)
 * })
 * window.api.onPing((timestamp) => {
 *   console.log('Ping received at', timestamp)
 * })
 * ```
 */

import { BrowserWindow } from 'electron'
import { getCurrentTraceContext, wrapTracePayload } from '../inspector/trace-propagation'

/**
 * IBroadcastContract: A generic interface defining the structure for IPC send contracts.
 * It specifies a contract with a payload type for unidirectional communication from the main process to the renderer.
 * Typically used for sending data or triggering events in the renderer from the main process.
 * The payload must be a serializable type (JSON-compatible).
 *
 * @interface IBroadcastContract
 * @typeparam TRequest - The type of the data (payload) sent from the main process to the renderer (must be Serializable).
 */
export interface IBroadcastContract<TRequest extends import('./types').Serializable | void> {
  payload: TRequest
}

/**
 * Creates a specialized broadcast function tailored to a specific set of IPC send contract interfaces.
 * This higher-order function returns a new function that is pre-configured to send IPC messages
 * according to the specified contracts, ensuring type safety for the channel names and payload structures.
 *
 * @returns A function that can be used to send IPC messages for the specified contract types. This function takes a channel name, a BrowserWindow instance, and a payload as arguments. It sends the payload to the specified channel if the BrowserWindow instance is not destroyed.
 * @template T A generic parameter representing the set of all possible IPC send contracts for which the broadcast function is being created. This parameter does not need to extend any specific type, offering flexibility in defining IPC contracts.
 * @example
 * ```typescript
 * const broadcast = createBroadcast<MyBroadcastContracts>()
 * broadcast("statusUpdate", mainWindow, { status: "ready" });
 * ```
 */
export function createBroadcast<T>() {
  return <K extends keyof T>(
    channel: K,
    mainWindow: BrowserWindow,
    payload: T[K] extends { payload: infer P } ? P : never // Ensure payload compatibility
  ): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        channel as string,
        wrapTracePayload(payload, getCurrentTraceContext())
      )
    }
  }
}

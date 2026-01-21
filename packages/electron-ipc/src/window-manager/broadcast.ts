import { getWindowRegistry } from './registry'

/**
 * Extracts payload type from contract definition
 */
type BroadcastPayload<T, K extends keyof T> = T[K] extends { payload: infer P } ? P : never

/**
 * Creates a broadcast function that sends to ALL registered windows
 * @returns Broadcast function with overloads for void and non-void payloads
 * @example
 * ```ts
 * const broadcastAll = createBroadcastToAll<BroadcastContracts>()
 * broadcastAll('Ping', 42) // to all windows
 * broadcastAll('Ping', 42, { excludeRoles: ['inspector'] }) // exclude inspector
 * ```
 */
export function createBroadcastToAll<T>() {
  // Overload: with payload and options

  function broadcast<K extends keyof T>(
    channel: K,
    payload: BroadcastPayload<T, K>,
    options?: { excludeRoles?: string[] }
  ): void

  // Overload: void payload (no payload argument needed)
  // eslint-disable-next-line no-redeclare
  function broadcast<K extends keyof T>(channel: K): void

  // Implementation
  // eslint-disable-next-line no-redeclare
  function broadcast<K extends keyof T>(
    channel: K,
    payload?: BroadcastPayload<T, K>,
    options?: { excludeRoles?: string[] }
  ): void {
    const registry = getWindowRegistry()
    const windows = registry.getAll()

    windows.forEach((meta) => {
      // Skip excluded roles
      if (options?.excludeRoles?.includes(meta.role)) return

      if (!meta.window.isDestroyed()) {
        meta.window.webContents.send(channel as string, payload)
      }
    })
  }

  return broadcast
}

/**
 * Creates a broadcast function for a specific window role
 * @param role - Window role to broadcast to (e.g., 'main', 'secondary')
 * @returns Broadcast function
 * @example
 * ```ts
 * const broadcastMain = createBroadcastToRole<BroadcastContracts>('main')
 * broadcastMain('Ping', 42) // only to main windows
 * ```
 */
export function createBroadcastToRole<T>(role: string) {
  // Overload: with payload

  function broadcast<K extends keyof T>(channel: K, payload: BroadcastPayload<T, K>): void

  // Overload: void payload
  // eslint-disable-next-line no-redeclare
  function broadcast<K extends keyof T>(channel: K): void

  // Implementation
  // eslint-disable-next-line no-redeclare
  function broadcast<K extends keyof T>(channel: K, payload?: BroadcastPayload<T, K>): void {
    const registry = getWindowRegistry()
    const windows = registry.getByRole(role)

    windows.forEach((meta) => {
      if (!meta.window.isDestroyed()) {
        meta.window.webContents.send(channel as string, payload)
      }
    })
  }

  return broadcast
}

/**
 * Helper: Broadcasts to all windows except inspector
 * Alias for createBroadcastToAll with excludeRoles: ['inspector']
 * @example
 * ```ts
 * const broadcast = broadcastToApp<BroadcastContracts>()
 * broadcast('Ping', 42) // to all app windows, excluding inspector
 * ```
 */
export function broadcastToApp<T>() {
  const broadcastAll = createBroadcastToAll<T>()

  // Wrap to automatically exclude inspector

  function broadcast<K extends keyof T>(channel: K, payload: BroadcastPayload<T, K>): void
  // eslint-disable-next-line no-redeclare
  function broadcast<K extends keyof T>(channel: K): void
  // eslint-disable-next-line no-redeclare
  function broadcast<K extends keyof T>(channel: K, payload?: BroadcastPayload<T, K>): void {
    broadcastAll(channel, payload as BroadcastPayload<T, K>, { excludeRoles: ['inspector'] })
  }

  return broadcast
}

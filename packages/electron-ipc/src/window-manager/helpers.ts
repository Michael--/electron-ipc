import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { BrowserWindow as ElectronBrowserWindow } from 'electron'
import { getWindowRegistry } from './registry'

/**
 * Gets window metadata from main process IPC events
 * @param event - IpcMainEvent or IpcMainInvokeEvent
 * @returns BrowserWindow instance or null if not found
 */
export function getWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
  return ElectronBrowserWindow.fromWebContents(event.sender)
}

/**
 * Gets window role from main process IPC event
 * @param event - IpcMainEvent or IpcMainInvokeEvent
 * @returns Window role string or undefined if window not registered
 */
export function getWindowRoleFromEvent(
  event: IpcMainEvent | IpcMainInvokeEvent
): string | undefined {
  const window = getWindowFromEvent(event)
  if (!window) return undefined

  const registry = getWindowRegistry()
  return registry.getById(window.id)?.role
}

/**
 * Gets main window (convenience helper)
 * @returns Main window instance or null if not registered
 */
export function getMainWindow(): BrowserWindow | null {
  const registry = getWindowRegistry()
  return registry.getMain()?.window ?? null
}

/**
 * Gets all app windows (excludes inspector by default)
 * @param excludeInspector - Whether to exclude inspector windows (default: true)
 * @returns Array of BrowserWindow instances
 */
export function getAllAppWindows(excludeInspector = true): BrowserWindow[] {
  const registry = getWindowRegistry()
  let windows = registry.getAll()

  if (excludeInspector) {
    windows = windows.filter((meta) => meta.role !== 'inspector')
  }

  return windows.map((meta) => meta.window)
}

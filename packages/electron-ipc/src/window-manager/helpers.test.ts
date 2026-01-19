import { BrowserWindow as ElectronBrowserWindow } from 'electron'
import type { BrowserWindow, IpcMainEvent } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetWindowRegistry } from './registry'
import {
  getAllAppWindows,
  getMainWindow,
  getWindowFromEvent,
  getWindowRoleFromEvent,
} from './helpers'
import { getWindowRegistry } from './registry'

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

interface MockWindow {
  id: number
  isDestroyed: () => boolean
  on: (event: string, callback: (...args: unknown[]) => void) => void
}

function createMockWindow(id: number): MockWindow {
  return {
    id,
    isDestroyed: () => false,
    on: () => undefined,
  }
}

describe('window-manager helpers', () => {
  beforeEach(() => {
    resetWindowRegistry()
    vi.mocked(ElectronBrowserWindow.fromWebContents).mockReset()
  })

  it('getWindowFromEvent returns the BrowserWindow from webContents', () => {
    const window = createMockWindow(1)
    const sender = { id: 123 }

    vi.mocked(ElectronBrowserWindow.fromWebContents).mockReturnValue(
      window as unknown as BrowserWindow
    )

    const result = getWindowFromEvent({ sender } as IpcMainEvent)

    expect(ElectronBrowserWindow.fromWebContents).toHaveBeenCalledWith(sender)
    expect(result).toBe(window)
  })

  it('getWindowRoleFromEvent returns role for registered window', () => {
    const registry = getWindowRegistry()
    const window = createMockWindow(7)
    registry.register(window as unknown as BrowserWindow, 'main')

    vi.mocked(ElectronBrowserWindow.fromWebContents).mockReturnValue(
      window as unknown as BrowserWindow
    )

    const role = getWindowRoleFromEvent({ sender: { id: 7 } } as IpcMainEvent)
    expect(role).toBe('main')
  })

  it('getWindowRoleFromEvent returns undefined for unregistered window', () => {
    const window = createMockWindow(7)
    vi.mocked(ElectronBrowserWindow.fromWebContents).mockReturnValue(
      window as unknown as BrowserWindow
    )

    const role = getWindowRoleFromEvent({ sender: { id: 7 } } as IpcMainEvent)
    expect(role).toBeUndefined()
  })

  it('getMainWindow returns the registered main window', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    registry.register(mainWindow as unknown as BrowserWindow, 'main')

    expect(getMainWindow()).toBe(mainWindow)
  })

  it('getMainWindow returns null when registry is empty', () => {
    expect(getMainWindow()).toBeNull()
  })

  it('getAllAppWindows excludes inspector windows by default', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondaryWindow = createMockWindow(2)
    const inspectorWindow = createMockWindow(3)

    registry.register(mainWindow as unknown as BrowserWindow, 'main')
    registry.register(secondaryWindow as unknown as BrowserWindow, 'secondary')
    registry.register(inspectorWindow as unknown as BrowserWindow, 'inspector')

    const windows = getAllAppWindows()
    expect(windows).toEqual([mainWindow, secondaryWindow])
  })

  it('getAllAppWindows includes inspector windows when requested', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const inspectorWindow = createMockWindow(3)

    registry.register(mainWindow as unknown as BrowserWindow, 'main')
    registry.register(inspectorWindow as unknown as BrowserWindow, 'inspector')

    const windows = getAllAppWindows(false)
    expect(windows).toEqual([mainWindow, inspectorWindow])
  })
})

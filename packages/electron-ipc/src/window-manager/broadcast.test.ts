import type { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastToApp, createBroadcastToAll, createBroadcastToRole } from './broadcast'
import { getWindowRegistry, resetWindowRegistry } from './registry'

// Mock BrowserWindow with event triggering capability
interface MockWindow extends BrowserWindow {
  _trigger: (event: string, ...args: unknown[]) => void
}

function createMockWindow(id: number): MockWindow {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

  const mockWindow = {
    id,
    isDestroyed: vi.fn(() => false),
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(callback)
      return mockWindow
    }),
    webContents: {
      send: vi.fn(),
    },
    _trigger: (event: string, ...args: unknown[]) => {
      const cbs = listeners[event]
      if (cbs) cbs.forEach((cb) => cb(...args))
    },
  } as unknown as MockWindow

  return mockWindow
}

// Test contract types
type TestContracts = {
  Ping: { payload: number }
  Status: { payload: string }
  Empty: { payload: void }
}

describe('createBroadcastToAll', () => {
  beforeEach(() => {
    resetWindowRegistry()
  })

  it('should broadcast to all registered windows', () => {
    const registry = getWindowRegistry()
    const window1 = createMockWindow(1)
    const window2 = createMockWindow(2)
    const window3 = createMockWindow(3)

    registry.register(window1, 'main')
    registry.register(window2, 'secondary')
    registry.register(window3, 'secondary')

    const broadcast = createBroadcastToAll<TestContracts>()
    broadcast('Ping', 42)

    expect(window1.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(window2.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(window3.webContents.send).toHaveBeenCalledWith('Ping', 42)
  })

  it('should exclude specified roles', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondaryWindow = createMockWindow(2)
    const inspectorWindow = createMockWindow(3)

    registry.register(mainWindow, 'main')
    registry.register(secondaryWindow, 'secondary')
    registry.register(inspectorWindow, 'inspector')

    const broadcast = createBroadcastToAll<TestContracts>()
    broadcast('Ping', 42, { excludeRoles: ['inspector'] })

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(secondaryWindow.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(inspectorWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('should exclude multiple roles', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondaryWindow = createMockWindow(2)
    const inspectorWindow = createMockWindow(3)

    registry.register(mainWindow, 'main')
    registry.register(secondaryWindow, 'secondary')
    registry.register(inspectorWindow, 'inspector')

    const broadcast = createBroadcastToAll<TestContracts>()
    broadcast('Ping', 42, { excludeRoles: ['inspector', 'secondary'] })

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(secondaryWindow.webContents.send).not.toHaveBeenCalled()
    expect(inspectorWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('should skip destroyed windows', () => {
    const registry = getWindowRegistry()
    const window1 = createMockWindow(1)
    const window2 = createMockWindow(2)

    registry.register(window1)
    registry.register(window2)

    // Mark window1 as destroyed
    vi.mocked(window1.isDestroyed).mockReturnValue(true)

    const broadcast = createBroadcastToAll<TestContracts>()
    broadcast('Ping', 42)

    expect(window1.webContents.send).not.toHaveBeenCalled()
    expect(window2.webContents.send).toHaveBeenCalledWith('Ping', 42)
  })

  it('should handle void payloads', () => {
    const registry = getWindowRegistry()
    const window = createMockWindow(1)
    registry.register(window)

    const broadcast = createBroadcastToAll<TestContracts>()
    broadcast('Empty')

    expect(window.webContents.send).toHaveBeenCalledWith('Empty', undefined)
  })

  it('should work when no windows registered', () => {
    const broadcast = createBroadcastToAll<TestContracts>()
    expect(() => broadcast('Ping', 42)).not.toThrow()
  })
})

describe('createBroadcastToRole', () => {
  beforeEach(() => {
    resetWindowRegistry()
  })

  it('should broadcast only to windows with specified role', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondary1 = createMockWindow(2)
    const secondary2 = createMockWindow(3)
    const inspector = createMockWindow(4)

    registry.register(mainWindow, 'main')
    registry.register(secondary1, 'secondary')
    registry.register(secondary2, 'secondary')
    registry.register(inspector, 'inspector')

    const broadcastToSecondary = createBroadcastToRole<TestContracts>('secondary')
    broadcastToSecondary('Status', 'active')

    expect(mainWindow.webContents.send).not.toHaveBeenCalled()
    expect(secondary1.webContents.send).toHaveBeenCalledWith('Status', 'active')
    expect(secondary2.webContents.send).toHaveBeenCalledWith('Status', 'active')
    expect(inspector.webContents.send).not.toHaveBeenCalled()
  })

  it('should work with main role', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondaryWindow = createMockWindow(2)

    registry.register(mainWindow, 'main')
    registry.register(secondaryWindow, 'secondary')

    const broadcastToMain = createBroadcastToRole<TestContracts>('main')
    broadcastToMain('Ping', 99)

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('Ping', 99)
    expect(secondaryWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('should skip destroyed windows', () => {
    const registry = getWindowRegistry()
    const window1 = createMockWindow(1)
    const window2 = createMockWindow(2)

    registry.register(window1, 'secondary')
    registry.register(window2, 'secondary')

    vi.mocked(window1.isDestroyed).mockReturnValue(true)

    const broadcast = createBroadcastToRole<TestContracts>('secondary')
    broadcast('Ping', 42)

    expect(window1.webContents.send).not.toHaveBeenCalled()
    expect(window2.webContents.send).toHaveBeenCalledWith('Ping', 42)
  })

  it('should work when no windows match role', () => {
    const registry = getWindowRegistry()
    const window = createMockWindow(1)
    registry.register(window, 'main')

    const broadcast = createBroadcastToRole<TestContracts>('inspector')
    expect(() => broadcast('Ping', 42)).not.toThrow()
  })

  it('should handle void payloads', () => {
    const registry = getWindowRegistry()
    const window = createMockWindow(1)
    registry.register(window, 'main')

    const broadcast = createBroadcastToRole<TestContracts>('main')
    broadcast('Empty')

    expect(window.webContents.send).toHaveBeenCalledWith('Empty', undefined)
  })
})

describe('broadcastToApp', () => {
  beforeEach(() => {
    resetWindowRegistry()
  })

  it('should broadcast to all windows except inspector', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondaryWindow = createMockWindow(2)
    const inspectorWindow = createMockWindow(3)

    registry.register(mainWindow, 'main')
    registry.register(secondaryWindow, 'secondary')
    registry.register(inspectorWindow, 'inspector')

    const broadcast = broadcastToApp<TestContracts>()
    broadcast('Ping', 42)

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(secondaryWindow.webContents.send).toHaveBeenCalledWith('Ping', 42)
    expect(inspectorWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('should work when no inspector windows exist', () => {
    const registry = getWindowRegistry()
    const mainWindow = createMockWindow(1)
    const secondaryWindow = createMockWindow(2)

    registry.register(mainWindow, 'main')
    registry.register(secondaryWindow, 'secondary')

    const broadcast = broadcastToApp<TestContracts>()
    broadcast('Status', 'ok')

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('Status', 'ok')
    expect(secondaryWindow.webContents.send).toHaveBeenCalledWith('Status', 'ok')
  })

  it('should handle void payloads', () => {
    const registry = getWindowRegistry()
    const window = createMockWindow(1)
    registry.register(window, 'main')

    const broadcast = broadcastToApp<TestContracts>()
    broadcast('Empty')

    expect(window.webContents.send).toHaveBeenCalledWith('Empty', undefined)
  })
})

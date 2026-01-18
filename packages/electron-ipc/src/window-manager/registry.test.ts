import type { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WindowRegistry, getWindowRegistry, resetWindowRegistry } from './registry'

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
    // Helper to trigger events
    _trigger: (event: string, ...args: unknown[]) => {
      const cbs = listeners[event]
      if (cbs) cbs.forEach((cb) => cb(...args))
    },
  } as unknown as MockWindow

  return mockWindow
}

describe('WindowRegistry', () => {
  let registry: WindowRegistry

  beforeEach(() => {
    resetWindowRegistry()
    registry = new WindowRegistry()
  })

  describe('register', () => {
    it('should register a window with default role', () => {
      const window = createMockWindow(1)
      registry.register(window)

      const all = registry.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(1)
      expect(all[0].role).toBe('secondary')
      expect(all[0].window).toBe(window)
      expect(all[0].createdAt).toBeGreaterThan(0)
    })

    it('should register a window with custom role', () => {
      const window = createMockWindow(1)
      registry.register(window, 'main')

      const metadata = registry.getById(1)
      expect(metadata?.role).toBe('main')
    })

    it('should track main window', () => {
      const mainWindow = createMockWindow(1)
      const secondaryWindow = createMockWindow(2)

      registry.register(mainWindow, 'main')
      registry.register(secondaryWindow, 'secondary')

      const main = registry.getMain()
      expect(main?.id).toBe(1)
    })

    it('should set up auto-cleanup on window close', () => {
      const window = createMockWindow(1)
      registry.register(window)

      expect(registry.getAll()).toHaveLength(1)

      // Trigger closed event
      window._trigger('closed')

      expect(registry.getAll()).toHaveLength(0)
    })

    it('should track focus events', () => {
      const window = createMockWindow(1)
      registry.register(window)

      const before = registry.getById(1)
      expect(before?.lastFocusedAt).toBeUndefined()

      // Trigger focus event
      window._trigger('focus')

      const after = registry.getById(1)
      expect(after?.lastFocusedAt).toBeGreaterThan(0)
    })
  })

  describe('unregister', () => {
    it('should unregister a window', () => {
      const window = createMockWindow(1)
      registry.register(window)
      expect(registry.getAll()).toHaveLength(1)

      registry.unregister(1)
      expect(registry.getAll()).toHaveLength(0)
    })

    it('should clear main window reference when unregistering main', () => {
      const mainWindow = createMockWindow(1)
      registry.register(mainWindow, 'main')

      expect(registry.getMain()?.id).toBe(1)

      registry.unregister(1)
      expect(registry.getMain()).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all registered windows', () => {
      const window1 = createMockWindow(1)
      const window2 = createMockWindow(2)
      const window3 = createMockWindow(3)

      registry.register(window1, 'main')
      registry.register(window2, 'secondary')
      registry.register(window3, 'inspector')

      const all = registry.getAll()
      expect(all).toHaveLength(3)
      expect(all.map((m) => m.id)).toEqual([1, 2, 3])
    })

    it('should filter out destroyed windows', () => {
      const window1 = createMockWindow(1)
      const window2 = createMockWindow(2)

      registry.register(window1)
      registry.register(window2)

      expect(registry.getAll()).toHaveLength(2)

      // Mark window as destroyed
      vi.mocked(window1.isDestroyed).mockReturnValue(true)

      expect(registry.getAll()).toHaveLength(1)
      expect(registry.getAll()[0].id).toBe(2)
    })
  })

  describe('getByRole', () => {
    it('should filter windows by role', () => {
      const mainWindow = createMockWindow(1)
      const secondary1 = createMockWindow(2)
      const secondary2 = createMockWindow(3)
      const inspector = createMockWindow(4)

      registry.register(mainWindow, 'main')
      registry.register(secondary1, 'secondary')
      registry.register(secondary2, 'secondary')
      registry.register(inspector, 'inspector')

      const secondaries = registry.getByRole('secondary')
      expect(secondaries).toHaveLength(2)
      expect(secondaries.map((m) => m.id)).toEqual([2, 3])

      const mains = registry.getByRole('main')
      expect(mains).toHaveLength(1)
      expect(mains[0].id).toBe(1)
    })
  })

  describe('getById', () => {
    it('should get window by ID', () => {
      const window = createMockWindow(42)
      registry.register(window, 'main')

      const metadata = registry.getById(42)
      expect(metadata?.id).toBe(42)
      expect(metadata?.role).toBe('main')
    })

    it('should return undefined for non-existent ID', () => {
      expect(registry.getById(999)).toBeUndefined()
    })

    it('should return undefined for destroyed window', () => {
      const window = createMockWindow(1)
      registry.register(window)

      vi.mocked(window.isDestroyed).mockReturnValue(true)

      expect(registry.getById(1)).toBeUndefined()
    })
  })

  describe('getMain', () => {
    it('should return main window', () => {
      const mainWindow = createMockWindow(1)
      registry.register(mainWindow, 'main')

      const main = registry.getMain()
      expect(main?.id).toBe(1)
    })

    it('should fallback to first window if no main window', () => {
      const window1 = createMockWindow(1)
      const window2 = createMockWindow(2)

      registry.register(window1, 'secondary')
      registry.register(window2, 'secondary')

      const main = registry.getMain()
      expect(main?.id).toBe(1)
    })

    it('should return undefined if no windows registered', () => {
      expect(registry.getMain()).toBeUndefined()
    })
  })

  describe('count', () => {
    it('should count all windows excluding inspector by default', () => {
      const mainWindow = createMockWindow(1)
      const secondary = createMockWindow(2)
      const inspector = createMockWindow(3)

      registry.register(mainWindow, 'main')
      registry.register(secondary, 'secondary')
      registry.register(inspector, 'inspector')

      expect(registry.count()).toBe(2)
    })

    it('should count all windows including inspector when specified', () => {
      const mainWindow = createMockWindow(1)
      const secondary = createMockWindow(2)
      const inspector = createMockWindow(3)

      registry.register(mainWindow, 'main')
      registry.register(secondary, 'secondary')
      registry.register(inspector, 'inspector')

      expect(registry.count(false)).toBe(3)
    })
  })
})

describe('getWindowRegistry', () => {
  beforeEach(() => {
    resetWindowRegistry()
  })

  it('should return singleton instance', () => {
    const registry1 = getWindowRegistry()
    const registry2 = getWindowRegistry()

    expect(registry1).toBe(registry2)
  })

  it('should persist state across calls', () => {
    const registry1 = getWindowRegistry()
    const window = createMockWindow(1)
    registry1.register(window)

    const registry2 = getWindowRegistry()
    expect(registry2.getAll()).toHaveLength(1)
  })
})

describe('resetWindowRegistry', () => {
  it('should reset singleton instance', () => {
    const registry1 = getWindowRegistry()
    const window = createMockWindow(1)
    registry1.register(window)

    resetWindowRegistry()

    const registry2 = getWindowRegistry()
    expect(registry2.getAll()).toHaveLength(0)
  })
})

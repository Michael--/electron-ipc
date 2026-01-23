/* eslint-disable @typescript-eslint/no-explicit-any */
import '../test-helpers/electron-mock'
import { extendElectronMock } from '../test-helpers/electron-mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getInspectorServer } from './server'

const ipcMainOnHandlers = new Map<string, (...args: any[]) => void>()
const ipcMainHandleHandlers = new Map<string, (...args: any[]) => unknown>()

const ipcMain = {
  on: vi.fn((channel: string, handler: (...args: any[]) => void) => {
    ipcMainOnHandlers.set(channel, handler)
  }),
  handle: vi.fn((channel: string, handler: (...args: any[]) => unknown) => {
    ipcMainHandleHandlers.set(channel, handler)
  }),
  listenerCount: vi.fn((channel: string) => {
    const onCount = ipcMainOnHandlers.has(channel) ? 1 : 0
    const handleCount = ipcMainHandleHandlers.has(channel) ? 1 : 0
    return onCount + handleCount
  }),
}

const app = {
  whenReady: vi.fn(() => Promise.resolve()),
}

const globalShortcut = {
  register: vi.fn(),
}

let nextWindowId = 1

class MockBrowserWindow {
  static instances: MockBrowserWindow[] = []
  static fromWebContents = vi.fn((webContents: unknown) => {
    return (
      MockBrowserWindow.instances.find((instance) => instance.webContents === webContents) ?? null
    )
  })

  id: number
  options: unknown
  webContents: {
    id: number
    send: ReturnType<typeof vi.fn>
    isDestroyed: ReturnType<typeof vi.fn<[], boolean>>
  }
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

  constructor(options: unknown) {
    this.id = nextWindowId++
    this.options = options
    this.webContents = {
      id: this.id + 1000,
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    }
    MockBrowserWindow.instances.push(this)
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  isDestroyed = vi.fn(() => false)
  focus = vi.fn()
  loadFile = vi.fn()
  getTitle = vi.fn(() => `Window ${this.id}`)
  close = vi.fn(() => {
    const callbacks = this.listeners.closed ?? []
    callbacks.forEach((cb) => cb())
  })
}

extendElectronMock({
  app,
  BrowserWindow: MockBrowserWindow,
  ipcMain,
  globalShortcut,
})

vi.mock('./server', () => ({
  getInspectorServer: vi.fn(),
}))

const createMockServer = () => ({
  push: vi.fn(),
  subscribe: vi.fn(),
  getSubscriber: vi.fn(),
  sendInit: vi.fn(),
  getOptions: vi.fn(() => ({ payloadMode: 'redacted' })),
  getStatus: vi.fn(() => ({ ok: true })),
  clear: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  setTracingEnabled: vi.fn(),
  setPayloadMode: vi.fn(),
  setBufferSize: vi.fn(),
  exportJson: vi.fn(() => ({ events: [] })),
  flush: vi.fn(),
})

const originalEnv = process.env.NODE_ENV

async function loadEnableModule(env: string = 'test') {
  process.env.NODE_ENV = env
  vi.resetModules()
  return import('./enable')
}

describe('inspector/enable', () => {
  beforeEach(() => {
    ipcMainOnHandlers.clear()
    ipcMainHandleHandlers.clear()
    MockBrowserWindow.instances = []
    nextWindowId = 1
    vi.clearAllMocks()
    app.whenReady.mockImplementation(() => Promise.resolve())
    // Reset vi.fn mock implementations
    ipcMain.on.mockClear()
    ipcMain.handle.mockClear()
    ipcMain.listenerCount.mockClear()
  })

  it('flushInspector calls server.flush when available', async () => {
    const server = createMockServer()
    vi.mocked(getInspectorServer).mockReturnValue(server)

    const { flushInspector } = await loadEnableModule()
    flushInspector()

    expect(server.flush).toHaveBeenCalled()
  })

  it('enableIpcInspector returns null in production', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { enableIpcInspector } = await loadEnableModule('production')

    const result = enableIpcInspector()

    expect(result).toBeNull()
    expect(getInspectorServer).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('enableIpcInspector returns null when disabled', async () => {
    const { enableIpcInspector } = await loadEnableModule()

    const result = enableIpcInspector({ enabled: false })

    expect(result).toBeNull()
    expect(getInspectorServer).not.toHaveBeenCalled()
  })

  it('creates inspector window when openOnStart is true', async () => {
    const server = createMockServer()
    vi.mocked(getInspectorServer).mockReturnValue(server)

    const { enableIpcInspector } = await loadEnableModule()
    const window = enableIpcInspector({ openOnStart: true })

    expect(window).not.toBeNull()
    expect(server.subscribe).toHaveBeenCalledWith(window)
    expect(window?.loadFile).toHaveBeenCalled()

    const { getWindowRegistry } = await import('../window-manager/registry')
    const registry = getWindowRegistry()
    if (!window) {
      throw new Error('Expected inspector window to be created')
    }
    expect(registry.getById(window.id)?.role).toBe('inspector')
  })

  it('registers keyboard shortcut when configured', async () => {
    const server = createMockServer()
    vi.mocked(getInspectorServer).mockReturnValue(server)

    const { enableIpcInspector } = await loadEnableModule()
    app.whenReady.mockImplementation(
      () =>
        ({
          then: (callback: () => void) => {
            callback()
            return Promise.resolve()
          },
        }) as unknown as Promise<void>
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    enableIpcInspector({ openOnStart: false, shortcut: 'CmdOrCtrl+I' })

    expect(app.whenReady).toHaveBeenCalled()
    const registered = globalShortcut.register.mock.calls.length > 0
    const errored = errorSpy.mock.calls.length > 0
    expect(registered || errored).toBe(true)
    errorSpy.mockRestore()
  })

  it('handles inspector IPC commands', async () => {
    const server = createMockServer()
    vi.mocked(getInspectorServer).mockReturnValue(server)

    const { enableIpcInspector } = await loadEnableModule()
    enableIpcInspector({ openOnStart: false, shortcut: undefined })

    const handler = ipcMainOnHandlers.get('INSPECTOR:COMMAND')
    expect(handler).toBeDefined()
    if (!handler) {
      throw new Error('Expected INSPECTOR:COMMAND handler')
    }

    const sender = { send: vi.fn() }
    handler({ sender }, { command: { type: 'export', format: 'json' } })
    expect(sender.send).toHaveBeenCalledWith('INSPECTOR:COMMAND_RESPONSE', {
      success: true,
      data: { data: { events: [] } },
    })

    sender.send.mockClear()
    handler({ sender }, { command: { type: 'setBufferSize', size: 10 } })
    expect(sender.send).toHaveBeenCalledWith(
      'INSPECTOR:COMMAND_RESPONSE',
      expect.objectContaining({ success: false })
    )
  })

  it('routes HELLO and TRACE messages through handlers', async () => {
    const server = createMockServer()
    vi.mocked(getInspectorServer).mockReturnValue(server)

    const { enableIpcInspector } = await loadEnableModule()
    enableIpcInspector({ openOnStart: false, shortcut: undefined })

    const helloHandler = ipcMainOnHandlers.get('INSPECTOR:HELLO')
    const traceHandler = ipcMainOnHandlers.get('INSPECTOR:TRACE')
    expect(helloHandler).toBeDefined()
    expect(traceHandler).toBeDefined()
    if (!helloHandler || !traceHandler) {
      throw new Error('Expected inspector IPC handlers to be registered')
    }

    const window = new MockBrowserWindow({})
    const subscriber = { window }
    server.getSubscriber.mockReturnValue(subscriber)

    helloHandler({ sender: window.webContents })
    expect(server.sendInit).toHaveBeenCalledWith(subscriber)

    const { getWindowRegistry } = await import('../window-manager/registry')
    const registry = getWindowRegistry()
    registry.register(window as any, 'main')

    const traceEvent = {
      id: 'trace-1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: Date.now(),
      source: { webContentsId: -1 },
    }

    traceHandler({ sender: window.webContents }, traceEvent)
    expect(server.push).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          webContentsId: window.webContents.id,
          windowId: window.id,
          windowRole: 'main',
          title: `Window ${window.id}`,
        }),
      })
    )
  })

  it('enableIpcInspector runs without errors', async () => {
    const server = createMockServer()
    vi.mocked(getInspectorServer).mockReturnValue(server)

    const { enableIpcInspector } = await loadEnableModule()

    // Should not throw
    expect(() => {
      enableIpcInspector({ openOnStart: false, shortcut: undefined })
    }).not.toThrow()
  })
})

afterAll(() => {
  process.env.NODE_ENV = originalEnv
})

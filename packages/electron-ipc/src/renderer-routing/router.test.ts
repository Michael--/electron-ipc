/**
 * Tests for RendererInvokeRouter
 */

import '../test-helpers/electron-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emitTrace } from '../inspector/trace'
import { wrapTracePayload } from '../inspector/trace-propagation'
import { extendElectronMock, ipcMainMock } from '../test-helpers/electron-mock'
import { getWindowRegistry, resetWindowRegistry } from '../window-manager/registry'
import { RendererInvokeRouter, resetRendererInvokeRouter } from './router'

vi.mock('node:crypto', () => ({
  randomUUID: () => 'request-1',
}))

vi.mock('../inspector/trace', () => ({
  emitTrace: vi.fn(),
  createTraceEnvelope: vi.fn(() => ({ traceId: 'trace', spanId: 'span', tsStart: 0 })),
  createPayloadPreview: vi.fn((payload: unknown) => payload),
}))

type MockWebContents = {
  id: number
  send: ReturnType<typeof vi.fn>
  once: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
}

type MockWindow = {
  id: number
  webContents: MockWebContents
  isDestroyed: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
}

const windowByWebContents = new Map<object, MockWindow>()

const createMockWindow = (id: number): MockWindow => {
  const listenerMap = new Map<string, (value?: unknown) => void>()
  const webContents: MockWebContents = {
    id: id * 10,
    send: vi.fn(),
    once: vi.fn((event: string, cb: (value?: unknown) => void) => {
      listenerMap.set(event, cb)
    }),
    off: vi.fn((event: string, cb: (value?: unknown) => void) => {
      const existing = listenerMap.get(event)
      if (existing === cb) {
        listenerMap.delete(event)
      }
    }),
  }

  const window: MockWindow = {
    id,
    webContents,
    isDestroyed: vi.fn(() => false),
    on: vi.fn(),
  }

  windowByWebContents.set(webContents, window)
  return window
}

const getRouteHandler = () => {
  const handler = ipcMainMock.handle.mock.calls.find(
    (call) => call[0] === '__RENDERER_ROUTE__'
  )?.[1]
  if (!handler) {
    throw new Error('Route handler not registered')
  }
  return handler as (event: unknown, envelope: unknown) => Promise<unknown>
}

const getResponseHandler = () => {
  const handler = ipcMainMock.on.mock.calls.find((call) => call[0] === '__RENDERER_RESPONSE__')?.[1]
  if (!handler) {
    throw new Error('Response handler not registered')
  }
  return handler as (event: unknown, response: unknown) => void
}

describe('RendererInvokeRouter', () => {
  let router: RendererInvokeRouter

  beforeEach(() => {
    windowByWebContents.clear()
    vi.clearAllMocks()
    resetWindowRegistry()
    extendElectronMock({
      BrowserWindow: {
        fromWebContents: vi.fn((webContents: object) => windowByWebContents.get(webContents)),
      },
    })
    router = new RendererInvokeRouter()
  })

  afterEach(() => {
    router.cleanup()
    resetRendererInvokeRouter()
    resetWindowRegistry()
  })

  it('should initialize without errors', () => {
    expect(router).toBeDefined()
  })

  it('should provide getStats() method', () => {
    const stats = router.getStats()
    expect(stats).toHaveProperty('pendingRequests')
    expect(stats).toHaveProperty('requests')
    expect(stats.pendingRequests).toBe(0)
    expect(stats.requests).toHaveLength(0)
  })

  it('should cleanup pending requests', () => {
    router.cleanup()
    const stats = router.getStats()
    expect(stats.pendingRequests).toBe(0)
  })

  it('routes requests to the target renderer and resolves responses', async () => {
    const registry = getWindowRegistry()
    const sourceWindow = createMockWindow(1)
    const targetWindow = createMockWindow(2)
    registry.register(sourceWindow as never, 'source')
    registry.register(targetWindow as never, 'target')

    const routeHandler = getRouteHandler()
    const responseHandler = getResponseHandler()

    const routePromise = routeHandler(
      { sender: sourceWindow.webContents },
      { targetRole: 'target', channel: 'Ping', request: { ping: true }, timeout: 1000 }
    )

    expect(targetWindow.webContents.send).toHaveBeenCalledWith('__RENDERER_HANDLER_Ping__', {
      requestId: 'request-1',
      request: { ping: true },
      sourceWindowId: 1,
      sourceRole: 'source',
    })

    responseHandler({ sender: targetWindow.webContents }, { requestId: 'request-1', response: 42 })
    await expect(routePromise).resolves.toBe(42)
    expect(router.getStats().pendingRequests).toBe(0)
  })

  it('rejects when no target window exists', async () => {
    const registry = getWindowRegistry()
    const sourceWindow = createMockWindow(1)
    registry.register(sourceWindow as never, 'source')

    const routeHandler = getRouteHandler()
    await expect(
      routeHandler(
        { sender: sourceWindow.webContents },
        { targetRole: 'missing', channel: 'Ping', request: { ping: true }, timeout: 500 }
      )
    ).rejects.toThrow("No window with role 'missing' found")
  })

  it('ignores responses from unexpected windows', async () => {
    const registry = getWindowRegistry()
    const sourceWindow = createMockWindow(1)
    const targetWindow = createMockWindow(2)
    registry.register(sourceWindow as never, 'source')
    registry.register(targetWindow as never, 'target')

    const routeHandler = getRouteHandler()
    const responseHandler = getResponseHandler()

    const routePromise = routeHandler(
      { sender: sourceWindow.webContents },
      { targetRole: 'target', channel: 'Ping', request: { ping: true }, timeout: 1000 }
    )

    const rejection = expect(routePromise).rejects.toThrow('Router cleanup: request cancelled')

    responseHandler({ sender: sourceWindow.webContents }, { requestId: 'request-1', response: 42 })
    expect(router.getStats().pendingRequests).toBe(1)

    router.cleanup()
    await rejection
  })

  it('times out pending requests and emits trace events', async () => {
    vi.useFakeTimers()
    const registry = getWindowRegistry()
    const sourceWindow = createMockWindow(1)
    const targetWindow = createMockWindow(2)
    registry.register(sourceWindow as never, 'source')
    registry.register(targetWindow as never, 'target')

    const routeHandler = getRouteHandler()
    const tracePayload = wrapTracePayload({ ping: true }, { traceId: 'trace-1', spanId: 'span-1' })

    const routePromise = routeHandler(
      { sender: sourceWindow.webContents },
      { targetRole: 'target', channel: 'Ping', request: tracePayload, timeout: 50 }
    )

    const rejection = expect(routePromise).rejects.toThrow(
      "Renderer invoke timeout after 100ms for channel 'Ping'"
    )

    await vi.runAllTimersAsync()

    await rejection
    expect(emitTrace).toHaveBeenCalled()
    expect(router.getStats().pendingRequests).toBe(0)
    vi.useRealTimers()
  })

  it('rejects when target window is destroyed', async () => {
    const registry = getWindowRegistry()
    const sourceWindow = createMockWindow(1)
    const targetWindow = createMockWindow(2)
    targetWindow.isDestroyed.mockReturnValueOnce(false).mockReturnValue(true)
    registry.register(sourceWindow as never, 'source')
    registry.register(targetWindow as never, 'target')

    const routeHandler = getRouteHandler()
    await expect(
      routeHandler(
        { sender: sourceWindow.webContents },
        { targetRole: 'target', channel: 'Ping', request: { ping: true }, timeout: 500 }
      )
    ).rejects.toThrow("Target window 'target' is destroyed")
  })

  it('rejects error responses and preserves error metadata', async () => {
    const registry = getWindowRegistry()
    const sourceWindow = createMockWindow(1)
    const targetWindow = createMockWindow(2)
    registry.register(sourceWindow as never, 'source')
    registry.register(targetWindow as never, 'target')

    const routeHandler = getRouteHandler()
    const responseHandler = getResponseHandler()

    const routePromise = routeHandler(
      { sender: sourceWindow.webContents },
      { targetRole: 'target', channel: 'Ping', request: { ping: true }, timeout: 1000 }
    )

    responseHandler(
      { sender: targetWindow.webContents },
      {
        requestId: 'request-1',
        error: { message: 'boom', name: 'BoomError', stack: 'stack' },
      }
    )

    await expect(routePromise).rejects.toMatchObject({
      message: 'boom',
      name: 'BoomError',
      stack: 'stack',
    })
  })
})

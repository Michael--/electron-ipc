import { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InspectorServer, getInspectorServer, resetInspectorServer } from './server'
import type { BroadcastTrace, InvokeTrace } from './types'

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

// Mock BrowserWindow
const createMockWindow = (id: number) => {
  const listeners: Record<string, Array<() => void>> = {}

  return {
    id,
    webContents: {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    },
    isDestroyed: vi.fn(() => false),
    once: vi.fn((event: string, callback: () => void) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(callback)
    }),
    _triggerEvent: (event: string) => {
      listeners[event]?.forEach((cb) => cb())
    },
  }
}

describe('InspectorServer', () => {
  let server: InspectorServer

  beforeEach(() => {
    resetInspectorServer()
    server = new InspectorServer({ maxEvents: 5 })
  })

  describe('constructor', () => {
    it('should create server with default options', () => {
      const defaultServer = new InspectorServer()
      const options = defaultServer.getOptions()

      expect(options.maxEvents).toBe(5000)
      expect(options.payloadMode).toBe('redacted')
      expect(options.enabled).toBe(process.env.NODE_ENV !== 'production')
    })

    it('should accept custom options', () => {
      const custom = new InspectorServer({
        maxEvents: 100,
        payloadMode: 'full',
      })

      const options = custom.getOptions()
      expect(options.maxEvents).toBe(100)
      expect(options.payloadMode).toBe('full')
    })
  })

  describe('push and snapshot', () => {
    it('should store events', () => {
      const event: InvokeTrace = {
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      }

      server.push(event)

      const snapshot = server.snapshot()
      expect(snapshot).toHaveLength(1)
      expect(snapshot[0]).toEqual(event)
    })

    it('should not store events when paused', () => {
      server.pause()

      const event: InvokeTrace = {
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      }

      server.push(event)

      expect(server.snapshot()).toHaveLength(0)
    })

    it('should track dropped events when buffer is full', () => {
      // Push 6 events (capacity is 5)
      for (let i = 0; i < 6; i++) {
        server.push({
          id: String(i),
          kind: 'invoke',
          channel: 'test',
          direction: 'renderer→main',
          status: 'ok',
          tsStart: Date.now(),
          source: { webContentsId: 1 },
        } as InvokeTrace)
      }

      const status = server.getStatus()
      expect(status.droppedCount).toBe(1)
      expect(status.eventCount).toBe(5)
    })
  })

  describe('pause and resume', () => {
    it('should pause event collection', () => {
      server.pause()

      const status = server.getStatus()
      expect(status.isTracing).toBe(false)
    })

    it('should resume event collection', () => {
      server.pause()
      server.resume()

      const status = server.getStatus()
      expect(status.isTracing).toBe(true)
    })
  })

  describe('clear', () => {
    it('should clear all events', () => {
      server.push({
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      } as InvokeTrace)

      server.clear()

      expect(server.snapshot()).toHaveLength(0)
      expect(server.getStatus().eventCount).toBe(0)
    })

    it('should reset dropped count', () => {
      // Fill buffer + 1
      for (let i = 0; i < 6; i++) {
        server.push({
          id: String(i),
          kind: 'invoke',
          channel: 'test',
          direction: 'renderer→main',
          status: 'ok',
          tsStart: Date.now(),
          source: { webContentsId: 1 },
        } as InvokeTrace)
      }

      server.clear()

      expect(server.getStatus().droppedCount).toBe(0)
    })
  })

  describe('setPayloadMode', () => {
    it('should change payload mode', () => {
      server.setPayloadMode('full')

      expect(server.getStatus().payloadMode).toBe('full')
    })

    it('should change from full to none', () => {
      server.setPayloadMode('full')
      server.setPayloadMode('none')

      expect(server.getStatus().payloadMode).toBe('none')
    })
  })

  describe('subscribe and broadcast', () => {
    it('should subscribe window and send init', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWindow = createMockWindow(1) as any

      server.push({
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      } as InvokeTrace)

      server.subscribe(mockWindow)
      // Mock BrowserWindow.fromWebContents to return the window
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(mockWindow)
      const subscriber = server.getSubscriber(mockWindow.webContents)
      if (subscriber) server.sendInit(subscriber)

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'INSPECTOR:INIT',
        expect.objectContaining({
          events: expect.arrayContaining([expect.objectContaining({ id: '1' })]),
          config: expect.any(Object),
        })
      )
    })

    it('should broadcast events to subscribers', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWindow = createMockWindow(1) as any
      server.subscribe(mockWindow)

      vi.clearAllMocks()

      const event: BroadcastTrace = {
        id: '2',
        kind: 'broadcast',
        channel: 'Ping',
        direction: 'main→renderer',
        status: 'ok',
        tsStart: Date.now(),
        target: { webContentsId: 2 },
      }

      server.push(event)

      // Should be batched - need to flush
      server.flush()

      // Events are sent as batch
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'INSPECTOR:EVENT_BATCH',
        expect.objectContaining({
          events: expect.arrayContaining([expect.objectContaining({ id: '2' })]),
        })
      )
    })

    it('should handle multiple subscribers', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const window1 = createMockWindow(1) as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const window2 = createMockWindow(2) as any

      server.subscribe(window1)
      server.subscribe(window2)

      vi.clearAllMocks()

      server.push({
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      } as InvokeTrace)

      // Flush to trigger broadcast
      server.flush()

      expect(window1.webContents.send).toHaveBeenCalled()
      expect(window2.webContents.send).toHaveBeenCalled()
    })

    it('should not subscribe destroyed windows', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWindow = createMockWindow(1) as any
      mockWindow.isDestroyed.mockReturnValue(true)

      server.subscribe(mockWindow)

      expect(server.getSubscriberCount()).toBe(0)
    })

    it('should auto-unsubscribe on window close', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWindow = createMockWindow(1) as any
      server.subscribe(mockWindow)

      expect(server.getSubscriberCount()).toBe(1)

      // Trigger 'closed' event
      mockWindow._triggerEvent('closed')

      expect(server.getSubscriberCount()).toBe(0)
    })

    it('should skip broadcasting to destroyed webContents', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWindow = createMockWindow(1) as any
      server.subscribe(mockWindow)

      // Mark as destroyed
      mockWindow.webContents.isDestroyed.mockReturnValue(true)

      vi.clearAllMocks()

      server.push({
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      } as InvokeTrace)

      // Flush to trigger broadcast which will remove destroyed window
      server.flush()

      // Should not send to destroyed window
      expect(mockWindow.webContents.send).not.toHaveBeenCalled()

      // Should be removed from subscribers after broadcast attempt
      expect(server.getSubscriberCount()).toBe(0)
    })
  })

  describe('unsubscribe', () => {
    it('should remove subscriber', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWindow = createMockWindow(1) as any
      server.subscribe(mockWindow)

      expect(server.getSubscriberCount()).toBe(1)

      server.unsubscribe(mockWindow)

      expect(server.getSubscriberCount()).toBe(0)
    })
  })

  describe('exportJson', () => {
    it('should export events as JSON', () => {
      server.push({
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      } as InvokeTrace)

      const json = server.exportJson()
      const data = JSON.parse(json)

      expect(data.version).toBe('1.0')
      expect(data.traceFormatVersion).toBe('1.1')
      expect(data.events).toHaveLength(1)
      expect(data.stats.totalEvents).toBe(1)
      expect(data.stats.capacity).toBe(5)
    })

    it('should include stats in export', () => {
      // Fill buffer
      for (let i = 0; i < 6; i++) {
        server.push({
          id: String(i),
          kind: 'invoke',
          channel: 'test',
          direction: 'renderer→main',
          status: 'ok',
          tsStart: Date.now(),
          source: { webContentsId: 1 },
        } as InvokeTrace)
      }

      const json = server.exportJson()
      const data = JSON.parse(json)

      expect(data.stats.droppedEvents).toBe(1)
    })
  })

  describe('getInspectorServer singleton', () => {
    beforeEach(() => {
      resetInspectorServer()
    })

    it('should return same instance', () => {
      const server1 = getInspectorServer()
      const server2 = getInspectorServer()

      expect(server1).toBe(server2)
    })

    it('should create new instance after reset', () => {
      const server1 = getInspectorServer()
      resetInspectorServer()
      const server2 = getInspectorServer()

      expect(server1).not.toBe(server2)
    })

    it('should accept options on first call', () => {
      const server = getInspectorServer({ maxEvents: 100 })

      expect(server.getOptions().maxEvents).toBe(100)
    })
  })
})

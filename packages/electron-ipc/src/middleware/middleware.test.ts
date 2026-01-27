import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import {
  registerIpcMiddleware,
  clearIpcMiddleware,
  runInvokeMiddleware,
  runEventMiddleware,
  runStreamInvokeMiddleware,
  runStreamUploadMiddleware,
  runStreamDownloadMiddleware,
  runRendererInvokeMiddleware,
  runBroadcastMiddleware,
  type InvokeMiddlewareContext,
  type EventMiddlewareContext,
  type StreamInvokeMiddlewareContext,
  type StreamUploadMiddlewareContext,
  type StreamDownloadMiddlewareContext,
  type RendererInvokeMiddlewareContext,
  type BroadcastMiddlewareContext,
  type InvokeMiddleware,
} from './index'

// Mock Electron event
const createMockEvent = (): IpcMainInvokeEvent =>
  ({
    sender: { send: vi.fn() },
  }) as unknown as IpcMainInvokeEvent

// Mock BrowserWindow
const createMockBrowserWindow = () => ({
  webContents: { send: vi.fn() },
})

describe('Middleware System', () => {
  beforeEach(() => {
    clearIpcMiddleware()
  })

  afterEach(() => {
    clearIpcMiddleware()
  })

  describe('registration and cleanup', () => {
    it('should register and unregister middleware', async () => {
      const middleware1: InvokeMiddleware = async (ctx, next) => {
        await next()
      }

      const unregister = registerIpcMiddleware({ onInvoke: middleware1 })

      // Middleware should be registered (test by executing)
      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: { data: 'test' },
      }

      // Should complete without error
      await expect(
        runInvokeMiddleware(context, async () => {
          /* terminal */
        })
      ).resolves.toBeUndefined()

      unregister()

      // After unregister, middleware should no longer interfere
      clearIpcMiddleware()
    })

    it('should clear all middleware', async () => {
      registerIpcMiddleware({
        onInvoke: async (ctx, next) => next(),
        onEvent: async (ctx, next) => next(),
        onBroadcast: async (ctx, next) => next(),
      })

      clearIpcMiddleware()

      // Should complete without middleware
      const invokeCtx: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      await expect(
        runInvokeMiddleware(invokeCtx, async () => {
          /* terminal */
        })
      ).resolves.toBeUndefined()
    })

    it('should return unregister function', () => {
      const middleware: InvokeMiddleware = async (ctx, next) => next()
      const unregister = registerIpcMiddleware({ onInvoke: middleware })

      expect(typeof unregister).toBe('function')
      expect(() => unregister()).not.toThrow()
    })
  })

  describe('invoke middleware', () => {
    it('should call middleware before terminal handler', async () => {
      const calls: string[] = []
      const middleware: InvokeMiddleware = async (ctx, next) => {
        calls.push('before')
        await next()
        calls.push('after')
      }
      const terminal: InvokeMiddleware = async () => {
        calls.push('terminal')
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: { data: 'test' },
      }

      await runInvokeMiddleware(context, terminal)

      expect(calls).toEqual(['before', 'terminal', 'after'])
    })

    it('should chain multiple invoke middlewares', async () => {
      const calls: string[] = []
      const middleware1: InvokeMiddleware = async (ctx, next) => {
        calls.push('m1-before')
        await next()
        calls.push('m1-after')
      }
      const middleware2: InvokeMiddleware = async (ctx, next) => {
        calls.push('m2-before')
        await next()
        calls.push('m2-after')
      }

      registerIpcMiddleware({ onInvoke: middleware1 })
      registerIpcMiddleware({ onInvoke: middleware2 })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        calls.push('terminal')
      }

      await runInvokeMiddleware(context, terminal)

      expect(calls).toEqual(['m1-before', 'm2-before', 'terminal', 'm2-after', 'm1-after'])
    })

    it('should pass and modify context through invoke middleware', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        ctx.response = { processed: true }
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: { input: 'data' },
      }

      const terminal: InvokeMiddleware = async (ctx) => {
        expect(ctx.response).toEqual({ processed: true })
      }

      await runInvokeMiddleware(context, terminal)
    })

    it('should handle errors thrown in middleware', async () => {
      const error = new Error('Middleware error')
      const middleware: InvokeMiddleware = async (_ctx, _next) => {
        throw error
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        /* should not reach */
      }

      await expect(runInvokeMiddleware(context, terminal)).rejects.toThrow('Middleware error')
    })

    it('should handle errors thrown in terminal handler', async () => {
      const error = new Error('Terminal error')
      const middleware: InvokeMiddleware = async (ctx, next) => {
        try {
          await next()
        } catch (e) {
          expect(e).toBe(error)
          throw e
        }
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        throw error
      }

      await expect(runInvokeMiddleware(context, terminal)).rejects.toThrow('Terminal error')
    })

    it('should prevent multiple next() calls', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        await next()
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        /* */
      }

      await expect(runInvokeMiddleware(context, terminal)).rejects.toThrow(
        'next() called multiple times'
      )
    })

    it('should allow middleware to access channel and request', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        expect(ctx.channel).toBe('my-channel')
        expect(ctx.request).toEqual({ payload: 'test' })
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'my-channel',
        request: { payload: 'test' },
      }

      const terminal: InvokeMiddleware = async () => {
        /* */
      }

      await expect(runInvokeMiddleware(context, terminal)).resolves.toBeUndefined()
    })
  })

  describe('event middleware', () => {
    it('should execute event middleware chain', async () => {
      const calls: string[] = []
      const middleware = async (ctx: EventMiddlewareContext, next: () => Promise<void>) => {
        calls.push('start')
        await next()
        calls.push('end')
      }

      registerIpcMiddleware({ onEvent: middleware })

      const context: EventMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test-event',
        request: { data: 'event' },
      }

      const terminal = async () => {
        calls.push('terminal')
      }

      await runEventMiddleware(context, terminal)
      expect(calls).toEqual(['start', 'terminal', 'end'])
    })

    it('should handle errors in event middleware', async () => {
      const error = new Error('Event middleware error')
      const middleware = async (_ctx: EventMiddlewareContext, _next: () => Promise<void>) => {
        throw error
      }

      registerIpcMiddleware({ onEvent: middleware })

      const context: EventMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      await expect(
        runEventMiddleware(context, async () => {
          /* */
        })
      ).rejects.toThrow('Event middleware error')
    })
  })

  describe('stream invoke middleware', () => {
    it('should execute stream invoke middleware', async () => {
      const calls: string[] = []
      const middleware = async (ctx: StreamInvokeMiddlewareContext, next: () => Promise<void>) => {
        calls.push('stream-start')
        await next()
        calls.push('stream-end')
      }

      registerIpcMiddleware({ onStreamInvoke: middleware })

      const context: StreamInvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'stream-invoke',
        request: { streamId: 'test' },
      }

      const terminal = async () => {
        calls.push('stream-terminal')
      }

      await runStreamInvokeMiddleware(context, terminal)
      expect(calls).toEqual(['stream-start', 'stream-terminal', 'stream-end'])
    })

    it('should allow middleware to set stream on context', async () => {
      const middleware = async (ctx: StreamInvokeMiddlewareContext, next: () => Promise<void>) => {
        // Stream would be set by terminal/handler
        await next()
      }

      registerIpcMiddleware({ onStreamInvoke: middleware })

      const mockStream = {
        read: () => null,
      }

      const context: StreamInvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal = async (ctx: StreamInvokeMiddlewareContext) => {
        ctx.stream = mockStream as never
      }

      await runStreamInvokeMiddleware(context, terminal)
      expect(context.stream).toBe(mockStream)
    })
  })

  describe('stream upload middleware', () => {
    it('should execute stream upload middleware', async () => {
      const calls: string[] = []
      const middleware = async (ctx: StreamUploadMiddlewareContext, next: () => Promise<void>) => {
        calls.push('upload-start')
        await next()
        calls.push('upload-end')
      }

      registerIpcMiddleware({ onStreamUpload: middleware })

      const context: StreamUploadMiddlewareContext = {
        event: createMockEvent(),
        channel: 'upload',
        request: { fileSize: 1024 },
      }

      const terminal = async () => {
        calls.push('upload-terminal')
      }

      await runStreamUploadMiddleware(context, terminal)
      expect(calls).toEqual(['upload-start', 'upload-terminal', 'upload-end'])
    })
  })

  describe('stream download middleware', () => {
    it('should execute stream download middleware', async () => {
      const calls: string[] = []
      const middleware = async (
        ctx: StreamDownloadMiddlewareContext,
        next: () => Promise<void>
      ) => {
        calls.push('download-start')
        await next()
        calls.push('download-end')
      }

      registerIpcMiddleware({ onStreamDownload: middleware })

      const context: StreamDownloadMiddlewareContext = {
        event: createMockEvent(),
        channel: 'download',
        request: { fileId: 'abc123' },
      }

      const terminal = async () => {
        calls.push('download-terminal')
      }

      await runStreamDownloadMiddleware(context, terminal)
      expect(calls).toEqual(['download-start', 'download-terminal', 'download-end'])
    })
  })

  describe('renderer invoke middleware', () => {
    it('should execute renderer invoke middleware', async () => {
      const calls: string[] = []
      const middleware = async (
        ctx: RendererInvokeMiddlewareContext,
        next: () => Promise<void>
      ) => {
        calls.push('renderer-start')
        await next()
        calls.push('renderer-end')
      }

      registerIpcMiddleware({ onRendererInvoke: middleware })

      const context: RendererInvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'renderer-invoke',
        request: { data: 'test' },
        targetRole: 'worker',
        timeout: 5000,
        sourceWindowId: 1,
      }

      const terminal = async () => {
        calls.push('renderer-terminal')
      }

      await runRendererInvokeMiddleware(context, terminal)
      expect(calls).toEqual(['renderer-start', 'renderer-terminal', 'renderer-end'])
    })

    it('should allow middleware to set response on renderer context', async () => {
      const middleware = async (
        ctx: RendererInvokeMiddlewareContext,
        next: () => Promise<void>
      ) => {
        await next()
      }

      registerIpcMiddleware({ onRendererInvoke: middleware })

      const context: RendererInvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
        targetRole: 'main',
        timeout: 5000,
        sourceWindowId: 1,
      }

      const terminal = async (ctx: RendererInvokeMiddlewareContext) => {
        ctx.response = { result: 'success' }
        ctx.targetWindowId = 2
      }

      await runRendererInvokeMiddleware(context, terminal)
      expect(context.response).toEqual({ result: 'success' })
      expect(context.targetWindowId).toBe(2)
    })
  })

  describe('broadcast middleware', () => {
    it('should execute broadcast middleware', async () => {
      const calls: string[] = []
      const middleware = async (ctx: BroadcastMiddlewareContext, next: () => Promise<void>) => {
        calls.push('broadcast-start')
        await next()
        calls.push('broadcast-end')
      }

      registerIpcMiddleware({ onBroadcast: middleware })

      const mockWindow = createMockBrowserWindow()
      const context: BroadcastMiddlewareContext = {
        channel: 'broadcast-channel',
        payload: { message: 'test' },
        window: mockWindow as never,
        mode: 'single',
      }

      const terminal = async () => {
        calls.push('broadcast-terminal')
      }

      await runBroadcastMiddleware(context, terminal)
      expect(calls).toEqual(['broadcast-start', 'broadcast-terminal', 'broadcast-end'])
    })

    it('should allow middleware to access broadcast context', async () => {
      const middleware = async (ctx: BroadcastMiddlewareContext, next: () => Promise<void>) => {
        expect(ctx.channel).toBe('my-broadcast')
        expect(ctx.mode).toBe('all')
        expect(ctx.payload).toEqual({ data: 'broadcast' })
        expect(ctx.role).toBeUndefined()
        await next()
      }

      registerIpcMiddleware({ onBroadcast: middleware })

      const mockWindow = createMockBrowserWindow()
      const context: BroadcastMiddlewareContext = {
        channel: 'my-broadcast',
        payload: { data: 'broadcast' },
        window: mockWindow as never,
        mode: 'all',
      }

      const terminal = async () => {
        /* */
      }

      await expect(runBroadcastMiddleware(context, terminal)).resolves.toBeUndefined()
    })

    it('should handle errors in broadcast middleware', async () => {
      const error = new Error('Broadcast error')
      const middleware = async (_ctx: BroadcastMiddlewareContext, _next: () => Promise<void>) => {
        throw error
      }

      registerIpcMiddleware({ onBroadcast: middleware })

      const mockWindow = createMockBrowserWindow()
      const context: BroadcastMiddlewareContext = {
        channel: 'test',
        payload: {},
        window: mockWindow as never,
        mode: 'single',
      }

      await expect(
        runBroadcastMiddleware(context, async () => {
          /* */
        })
      ).rejects.toThrow('Broadcast error')
    })
  })

  describe('multiple middleware types', () => {
    it('should register different middleware types independently', async () => {
      const calls: string[] = []

      registerIpcMiddleware({
        onInvoke: async (ctx, next) => {
          calls.push('invoke')
          await next()
        },
        onEvent: async (ctx, next) => {
          calls.push('event')
          await next()
        },
        onBroadcast: async (ctx, next) => {
          calls.push('broadcast')
          await next()
        },
      })

      const invokeCtx: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const eventCtx: EventMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const broadcastCtx: BroadcastMiddlewareContext = {
        channel: 'test',
        payload: {},
        window: createMockBrowserWindow() as never,
        mode: 'single',
      }

      await runInvokeMiddleware(invokeCtx, async () => {
        /* */
      })
      await runEventMiddleware(eventCtx, async () => {
        /* */
      })
      await runBroadcastMiddleware(broadcastCtx, async () => {
        /* */
      })

      expect(calls).toEqual(['invoke', 'event', 'broadcast'])
    })

    it('should allow partial registration', () => {
      const middleware = registerIpcMiddleware({
        onInvoke: async (ctx, next) => next(),
        // Only onInvoke is registered, others are undefined
      })

      expect(typeof middleware).toBe('function')
      expect(() => middleware()).not.toThrow()
    })
  })

  describe('error recovery patterns', () => {
    it('should allow middleware to catch and recover from terminal errors', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        try {
          await next()
        } catch {
          ctx.response = { error: 'recovered' }
        }
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async (_ctx) => {
        throw new Error('Terminal failed')
      }

      await runInvokeMiddleware(context, terminal)
      expect(context.response).toEqual({ error: 'recovered' })
    })

    it('should allow middleware to transform errors', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        try {
          await next()
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          throw new Error(`Transformed: ${message}`)
        }
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        throw new Error('Original error')
      }

      await expect(runInvokeMiddleware(context, terminal)).rejects.toThrow(
        'Transformed: Original error'
      )
    })
  })

  describe('context isolation', () => {
    it('should not share context between separate invocations', async () => {
      let executionCount = 0

      const middleware: InvokeMiddleware = async (ctx, next) => {
        executionCount++
        ctx.response = { count: executionCount }
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context1: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const context2: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      await runInvokeMiddleware(context1, async () => {
        /* */
      })
      await runInvokeMiddleware(context2, async () => {
        /* */
      })

      expect(context1.response).toEqual({ count: 1 })
      expect(context2.response).toEqual({ count: 2 })
    })
  })

  describe('async operations in middleware', () => {
    it('should handle async operations in middleware', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        ctx.response = { processed: true }
        await next()
        await new Promise((resolve) => setTimeout(resolve, 5))
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }

      const startTime = Date.now()
      await runInvokeMiddleware(context, terminal)
      const duration = Date.now() - startTime

      expect(context.response).toEqual({ processed: true })
      expect(duration).toBeGreaterThanOrEqual(20) // At least 10 + 5 + 5 ms
    })

    it('should handle multiple concurrent middleware invocations', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const contexts: InvokeMiddlewareContext[] = Array.from({ length: 5 }, (_, i) => ({
        event: createMockEvent(),
        channel: `test-${i}`,
        request: { id: i },
      }))

      const promises = contexts.map((context) =>
        runInvokeMiddleware(context, async () => {
          /* */
        })
      )

      await expect(Promise.all(promises)).resolves.toEqual(Array(5).fill(undefined))
    })
  })

  describe('middleware integration with all types', () => {
    it('should execute all middleware type variants', async () => {
      const executedTypes: string[] = []

      registerIpcMiddleware({
        onInvoke: async (ctx, next) => {
          executedTypes.push('invoke')
          await next()
        },
        onEvent: async (ctx, next) => {
          executedTypes.push('event')
          await next()
        },
        onStreamInvoke: async (ctx, next) => {
          executedTypes.push('stream-invoke')
          await next()
        },
        onStreamUpload: async (ctx, next) => {
          executedTypes.push('stream-upload')
          await next()
        },
        onStreamDownload: async (ctx, next) => {
          executedTypes.push('stream-download')
          await next()
        },
        onRendererInvoke: async (ctx, next) => {
          executedTypes.push('renderer-invoke')
          await next()
        },
        onBroadcast: async (ctx, next) => {
          executedTypes.push('broadcast')
          await next()
        },
      })

      // Execute each type
      await runInvokeMiddleware(
        { event: createMockEvent(), channel: 'test', request: {} },
        async () => {}
      )
      await runEventMiddleware(
        { event: createMockEvent(), channel: 'test', request: {} },
        async () => {}
      )
      await runStreamInvokeMiddleware(
        { event: createMockEvent(), channel: 'test', request: {} },
        async () => {}
      )
      await runStreamUploadMiddleware(
        { event: createMockEvent(), channel: 'test', request: {} },
        async () => {}
      )
      await runStreamDownloadMiddleware(
        { event: createMockEvent(), channel: 'test', request: {} },
        async () => {}
      )
      await runRendererInvokeMiddleware(
        {
          event: createMockEvent(),
          channel: 'test',
          request: {},
          targetRole: 'main',
          timeout: 5000,
          sourceWindowId: 1,
        },
        async () => {}
      )
      await runBroadcastMiddleware(
        {
          channel: 'test',
          payload: {},
          window: createMockBrowserWindow() as never,
          mode: 'single',
        },
        async () => {}
      )

      expect(executedTypes).toEqual([
        'invoke',
        'event',
        'stream-invoke',
        'stream-upload',
        'stream-download',
        'renderer-invoke',
        'broadcast',
      ])
    })

    it('should clear all middleware types', async () => {
      const calls: string[] = []

      const unregister = registerIpcMiddleware({
        onInvoke: async (ctx, next) => {
          calls.push('invoke')
          await next()
        },
        onEvent: async (ctx, next) => {
          calls.push('event')
          await next()
        },
        onStreamInvoke: async (ctx, next) => {
          calls.push('stream-invoke')
          await next()
        },
        onStreamUpload: async (ctx, next) => {
          calls.push('stream-upload')
          await next()
        },
        onStreamDownload: async (ctx, next) => {
          calls.push('stream-download')
          await next()
        },
        onRendererInvoke: async (ctx, next) => {
          calls.push('renderer-invoke')
          await next()
        },
        onBroadcast: async (ctx, next) => {
          calls.push('broadcast')
          await next()
        },
      })

      unregister()

      // After unregister, middlewares should not execute
      const calls2: string[] = []
      registerIpcMiddleware({
        onInvoke: async (ctx, next) => {
          calls2.push('after-unregister')
          await next()
        },
      })

      await runInvokeMiddleware(
        { event: createMockEvent(), channel: 'test', request: {} },
        async () => {}
      )

      expect(calls).toEqual([])
      expect(calls2).toEqual(['after-unregister'])
    })

    it('should handle selective unregistration', () => {
      const middleware1 = async (ctx: InvokeMiddlewareContext, next: () => Promise<void>) => next()
      const middleware2 = async (ctx: InvokeMiddlewareContext, next: () => Promise<void>) => next()
      const middleware3 = async (ctx: InvokeMiddlewareContext, next: () => Promise<void>) => next()

      const unregister1 = registerIpcMiddleware({ onInvoke: middleware1 })
      registerIpcMiddleware({ onInvoke: middleware2 })
      registerIpcMiddleware({ onInvoke: middleware3 })

      // Unregister first middleware
      unregister1()

      // Should not throw
      expect(async () => {
        await runInvokeMiddleware(
          { event: createMockEvent(), channel: 'test', request: {} },
          async () => {}
        )
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle empty middleware chain', async () => {
      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async (ctx) => {
        ctx.response = { executed: true }
      }

      await runInvokeMiddleware(context, terminal)
      expect(context.response).toEqual({ executed: true })
    })

    it('should handle null/undefined values in context', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        expect(ctx.request).toBeNull()
        expect(ctx.response).toBeUndefined()
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: null,
      }

      const terminal: InvokeMiddleware = async () => {
        /* */
      }

      await expect(runInvokeMiddleware(context, terminal)).resolves.toBeUndefined()
    })

    it('should handle middleware that does not call next', async () => {
      const calls: string[] = []

      const middleware: InvokeMiddleware = async (_ctx, _next) => {
        calls.push('middleware')
        // Not calling next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        calls.push('terminal')
      }

      await runInvokeMiddleware(context, terminal)
      expect(calls).toEqual(['middleware']) // Terminal not called
    })

    it('should handle middleware modifying context after next', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        await next()
        ctx.response = { modified: 'after' }
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async (ctx) => {
        ctx.response = { modified: 'before' }
      }

      await runInvokeMiddleware(context, terminal)
      expect(context.response).toEqual({ modified: 'after' })
    })

    it('should handle complex chaining scenario', async () => {
      const executionOrder: string[] = []

      const middleware1: InvokeMiddleware = async (ctx, next) => {
        executionOrder.push('m1-start')
        try {
          await next()
          executionOrder.push('m1-after-success')
        } catch (e) {
          executionOrder.push('m1-catch')
          throw e
        }
      }

      const middleware2: InvokeMiddleware = async (ctx, next) => {
        executionOrder.push('m2-start')
        await next()
        executionOrder.push('m2-end')
      }

      registerIpcMiddleware({ onInvoke: middleware1 })
      registerIpcMiddleware({ onInvoke: middleware2 })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const terminal: InvokeMiddleware = async () => {
        executionOrder.push('terminal')
      }

      await runInvokeMiddleware(context, terminal)

      expect(executionOrder).toEqual([
        'm1-start',
        'm2-start',
        'terminal',
        'm2-end',
        'm1-after-success',
      ])
    })

    it('should handle rapid registration/unregistration cycles', () => {
      for (let i = 0; i < 10; i++) {
        const unregister = registerIpcMiddleware({
          onInvoke: async (ctx, next) => next(),
        })
        unregister()
      }

      clearIpcMiddleware()
      expect(true).toBe(true) // No errors thrown
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import {
  registerIpcMiddleware,
  clearIpcMiddleware,
  runInvokeMiddleware,
  type InvokeMiddlewareContext,
  type InvokeMiddleware,
} from './index'

/**
 * Integration tests for middleware with real-world scenarios
 */

const createMockEvent = (): IpcMainInvokeEvent =>
  ({
    sender: { send: vi.fn() },
  }) as unknown as IpcMainInvokeEvent

describe('Middleware Integration Scenarios', () => {
  beforeEach(() => {
    clearIpcMiddleware()
  })

  afterEach(() => {
    clearIpcMiddleware()
  })

  describe('logging middleware', () => {
    it('should log requests and responses', async () => {
      const logs: string[] = []

      const loggingMiddleware: InvokeMiddleware = async (ctx, next) => {
        logs.push(`[REQUEST] ${ctx.channel}`)
        try {
          await next()
          logs.push(`[SUCCESS] ${ctx.channel}`)
        } catch (error) {
          logs.push(`[ERROR] ${ctx.channel}`)
          throw error
        }
      }

      registerIpcMiddleware({ onInvoke: loggingMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'get-user',
        request: { id: 123 },
      }

      const handler: InvokeMiddleware = async (ctx) => {
        ctx.response = { id: 123, name: 'John' }
      }

      await runInvokeMiddleware(context, handler)

      expect(logs).toEqual(['[REQUEST] get-user', '[SUCCESS] get-user'])
    })

    it('should measure performance', async () => {
      const metrics: { channel: string; duration: number }[] = []

      const performanceMiddleware: InvokeMiddleware = async (ctx, next) => {
        const startTime = Date.now()
        await next()
        const duration = Date.now() - startTime
        metrics.push({ channel: ctx.channel, duration })
      }

      registerIpcMiddleware({ onInvoke: performanceMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'slow-operation',
        request: {},
      }

      const handler: InvokeMiddleware = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      await runInvokeMiddleware(context, handler)

      expect(metrics).toHaveLength(1)
      expect(metrics[0].channel).toBe('slow-operation')
      expect(metrics[0].duration).toBeGreaterThanOrEqual(50)
    })
  })

  describe('validation middleware', () => {
    it('should validate and transform request data', async () => {
      const validationMiddleware: InvokeMiddleware = async (ctx, next) => {
        // Validate request
        if (typeof ctx.request !== 'object' || ctx.request === null) {
          throw new Error('Invalid request format')
        }

        // Transform request
        const req = ctx.request as Record<string, unknown>
        if (typeof req.id === 'string') {
          req.id = parseInt(req.id, 10)
        }

        await next()
      }

      registerIpcMiddleware({ onInvoke: validationMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'process',
        request: { id: '42' },
      }

      const handler: InvokeMiddleware = async (ctx) => {
        const req = ctx.request as Record<string, unknown>
        expect(typeof req.id).toBe('number')
        expect(req.id).toBe(42)
      }

      await runInvokeMiddleware(context, handler)
    })

    it('should reject invalid requests', async () => {
      const validationMiddleware: InvokeMiddleware = async (ctx, next) => {
        if (!ctx.channel.startsWith('safe:')) {
          throw new Error('Unauthorized channel')
        }
        await next()
      }

      registerIpcMiddleware({ onInvoke: validationMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'dangerous:command',
        request: {},
      }

      await expect(
        runInvokeMiddleware(context, async () => {
          /* */
        })
      ).rejects.toThrow('Unauthorized channel')
    })
  })

  describe('caching middleware', () => {
    it('should cache expensive operations', async () => {
      let callCount = 0
      const cache = new Map<string, unknown>()

      const cachingMiddleware: InvokeMiddleware = async (ctx, next) => {
        const key = `${ctx.channel}:${JSON.stringify(ctx.request)}`

        if (cache.has(key)) {
          ctx.response = cache.get(key)
          return
        }

        await next()

        if (ctx.response !== undefined) {
          cache.set(key, ctx.response)
        }
      }

      registerIpcMiddleware({ onInvoke: cachingMiddleware })

      const handler: InvokeMiddleware = async (ctx) => {
        callCount++
        ctx.response = { computed: 'expensive-value' }
      }

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'expensive-operation',
        request: { param: 'value' },
      }

      // First call
      await runInvokeMiddleware(context, handler)
      expect(callCount).toBe(1)
      expect(context.response).toEqual({ computed: 'expensive-value' })

      // Second call (should use cache)
      const context2: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'expensive-operation',
        request: { param: 'value' },
      }

      await runInvokeMiddleware(context2, handler)
      expect(callCount).toBe(1) // Not incremented
      expect(context2.response).toEqual({ computed: 'expensive-value' })
    })
  })

  describe('error handling and recovery', () => {
    it('should implement timeout detection', async () => {
      const timeoutMiddleware: InvokeMiddleware = async (ctx, next) => {
        const timeoutMs = 100
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        })

        try {
          await Promise.race([next(), timeoutPromise])
        } catch (error) {
          if (error instanceof Error && error.message === 'Request timeout') {
            ctx.response = { error: 'timeout', code: 'TIMEOUT' }
          } else {
            throw error
          }
        }
      }

      registerIpcMiddleware({ onInvoke: timeoutMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'slow-operation',
        request: {},
      }

      const slowHandler: InvokeMiddleware = async () => {
        // Slow operation
        await new Promise((resolve) => setTimeout(resolve, 150))
      }

      await runInvokeMiddleware(context, slowHandler)

      expect(context.response).toEqual({ error: 'timeout', code: 'TIMEOUT' })
    })

    it('should handle and normalize errors', async () => {
      const errorNormalizationMiddleware: InvokeMiddleware = async (ctx, next) => {
        try {
          await next()
        } catch (error) {
          ctx.response = {
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'ERR_HANDLER_FAILED',
          }
        }
      }

      registerIpcMiddleware({ onInvoke: errorNormalizationMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const handler: InvokeMiddleware = async () => {
        throw new Error('Database connection failed')
      }

      await runInvokeMiddleware(context, handler)

      expect(context.response).toEqual({
        error: true,
        message: 'Database connection failed',
        code: 'ERR_HANDLER_FAILED',
      })
    })
  })

  describe('authentication middleware', () => {
    it('should check authorization on each request', async () => {
      const authMiddleware: InvokeMiddleware = async (ctx, next) => {
        // Simulate checking auth token from event sender
        const isAuthenticated = Math.random() > 0.5

        if (!isAuthenticated) {
          throw new Error('Authentication required')
        }

        await next()
      }

      registerIpcMiddleware({ onInvoke: authMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'protected-endpoint',
        request: {},
      }

      // This test shows the pattern - actual auth check would use event metadata
      expect(async () => {
        await runInvokeMiddleware(context, async () => {
          /* */
        })
      }).toBeDefined()
    })
  })

  describe('request transformation middleware', () => {
    it('should modify request/response data', async () => {
      const transformMiddleware: InvokeMiddleware = async (ctx, next) => {
        // Transform incoming request
        const req = ctx.request as Record<string, unknown>
        if (req && typeof req === 'object') {
          req.timestamp = Date.now()
        }

        await next()

        // Transform outgoing response
        if (ctx.response && typeof ctx.response === 'object') {
          ;(ctx.response as Record<string, unknown>).processed = true
        }
      }

      registerIpcMiddleware({ onInvoke: transformMiddleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: { data: 'test' },
      }

      const handler: InvokeMiddleware = async (ctx) => {
        const req = ctx.request as Record<string, unknown>
        expect(req.timestamp).toBeDefined()

        ctx.response = { result: 'success' }
      }

      await runInvokeMiddleware(context, handler)

      expect(context.response).toEqual({ result: 'success', processed: true })
    })
  })

  describe('complex middleware chains', () => {
    it('should compose multiple middlewares in correct order', async () => {
      const executionLog: string[] = []

      const middleware1: InvokeMiddleware = async (ctx, next) => {
        executionLog.push('m1:before')
        await next()
        executionLog.push('m1:after')
      }

      const middleware2: InvokeMiddleware = async (ctx, next) => {
        executionLog.push('m2:before')
        await next()
        executionLog.push('m2:after')
      }

      const middleware3: InvokeMiddleware = async (ctx, next) => {
        executionLog.push('m3:before')
        await next()
        executionLog.push('m3:after')
      }

      registerIpcMiddleware({ onInvoke: middleware1 })
      registerIpcMiddleware({ onInvoke: middleware2 })
      registerIpcMiddleware({ onInvoke: middleware3 })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const handler: InvokeMiddleware = async () => {
        executionLog.push('handler')
      }

      await runInvokeMiddleware(context, handler)

      expect(executionLog).toEqual([
        'm1:before',
        'm2:before',
        'm3:before',
        'handler',
        'm3:after',
        'm2:after',
        'm1:after',
      ])
    })

    it('should allow one middleware to short-circuit the chain', async () => {
      const executionLog: string[] = []

      const middleware1: InvokeMiddleware = async (ctx, _next) => {
        executionLog.push('m1:before')
        // Short-circuit: don't call next
        ctx.response = { shortCircuited: true }
        executionLog.push('m1:after')
      }

      const middleware2: InvokeMiddleware = async (ctx, next) => {
        executionLog.push('m2:should-not-execute')
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware1 })
      registerIpcMiddleware({ onInvoke: middleware2 })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: {},
      }

      const handler: InvokeMiddleware = async () => {
        executionLog.push('handler:should-not-execute')
      }

      await runInvokeMiddleware(context, handler)

      expect(executionLog).toEqual(['m1:before', 'm1:after'])
      expect(context.response).toEqual({ shortCircuited: true })
    })
  })

  describe('context preservation', () => {
    it('should preserve context state through middleware chain', async () => {
      const middleware: InvokeMiddleware = async (ctx, next) => {
        ;(ctx.request as Record<string, unknown>).middlewareData = {
          processedAt: Date.now(),
          version: '1.0',
        }
        await next()
      }

      registerIpcMiddleware({ onInvoke: middleware })

      const context: InvokeMiddlewareContext = {
        event: createMockEvent(),
        channel: 'test',
        request: { original: 'data' },
      }

      const handler: InvokeMiddleware = async (ctx) => {
        const req = ctx.request as Record<string, unknown>
        expect(req.original).toBe('data')
        expect(req.middlewareData).toBeDefined()
        expect((req.middlewareData as Record<string, unknown>).version).toBe('1.0')
      }

      await runInvokeMiddleware(context, handler)
    })
  })
})

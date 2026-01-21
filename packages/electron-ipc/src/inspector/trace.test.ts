import { beforeEach, describe, expect, it } from 'vitest'
import {
  createPayloadPreview,
  createTraceContext,
  createTraceEnvelope,
  emitTrace,
  estimatePayloadBytes,
  generateTraceId,
  isTracingEnabled,
  serializeError,
  setTraceSink,
  shouldTrace,
} from './trace'
import type { InvokeTrace, TraceEvent } from './types'

describe('Trace System', () => {
  beforeEach(() => {
    // Reset trace sink before each test
    setTraceSink(null)
  })

  describe('setTraceSink / isTracingEnabled', () => {
    it('should be disabled by default', () => {
      expect(isTracingEnabled()).toBe(false)
    })

    it('should enable tracing when sink is set', () => {
      setTraceSink(() => {})
      expect(isTracingEnabled()).toBe(true)
    })

    it('should disable tracing when sink is set to null', () => {
      setTraceSink(() => {})
      setTraceSink(null)
      expect(isTracingEnabled()).toBe(false)
    })
  })

  describe('emitTrace', () => {
    it('should not call sink when tracing is disabled', () => {
      let called = false
      setTraceSink(null)

      emitTrace({
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      } as InvokeTrace)

      expect(called).toBe(false)
    })

    it('should call sink when tracing is enabled', () => {
      let capturedEvent: TraceEvent | null = null
      setTraceSink((event) => {
        capturedEvent = event
      })

      const testEvent: InvokeTrace = {
        id: '1',
        kind: 'invoke',
        channel: 'test',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: Date.now(),
        source: { webContentsId: 1 },
      }

      emitTrace(testEvent)

      expect(capturedEvent).toEqual(testEvent)
    })

    it('should not throw if sink throws', () => {
      setTraceSink(() => {
        throw new Error('Sink error')
      })

      expect(() => {
        emitTrace({
          id: '1',
          kind: 'invoke',
          channel: 'test',
          direction: 'renderer→main',
          status: 'ok',
          tsStart: Date.now(),
          source: { webContentsId: 1 },
        } as InvokeTrace)
      }).not.toThrow()
    })
  })

  describe('shouldTrace', () => {
    beforeEach(() => {
      setTraceSink(() => {})
    })

    it('should return false when tracing is disabled', () => {
      setTraceSink(null)
      expect(shouldTrace('test')).toBe(false)
    })

    it('should return false for INSPECTOR channels', () => {
      expect(shouldTrace('INSPECTOR:HELLO')).toBe(false)
      expect(shouldTrace('INSPECTOR:INIT')).toBe(false)
      expect(shouldTrace('INSPECTOR:EVENT')).toBe(false)
    })

    it('should return false for inspector window role', () => {
      expect(shouldTrace('test', 'inspector')).toBe(false)
    })

    it('should return true for normal channels', () => {
      expect(shouldTrace('AddNumbers')).toBe(true)
      expect(shouldTrace('Ping')).toBe(true)
    })

    it('should return true for main window role', () => {
      expect(shouldTrace('test', 'main')).toBe(true)
    })
  })

  describe('generateTraceId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateTraceId()
      const id2 = generateTraceId()

      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
    })

    it('should include timestamp', () => {
      const id = generateTraceId()
      const timestamp = parseInt(id.split('-')[0])

      expect(timestamp).toBeGreaterThan(Date.now() - 1000)
      expect(timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('createTraceContext', () => {
    it('creates a root context with matching trace and span IDs', () => {
      const context = createTraceContext()
      expect(context.traceId).toBe(context.spanId)
      expect(context.parentSpanId).toBeUndefined()
    })

    it('creates a child context with shared trace ID', () => {
      const parent = createTraceContext()
      const child = createTraceContext(parent)
      expect(child.traceId).toBe(parent.traceId)
      expect(child.parentSpanId).toBe(parent.spanId)
      expect(child.spanId).not.toBe(parent.spanId)
    })
  })

  describe('createTraceEnvelope', () => {
    it('attaches timestamps to a context', () => {
      const context = createTraceContext()
      const envelope = createTraceEnvelope(context, 100, 200)
      expect(envelope.traceId).toBe(context.traceId)
      expect(envelope.spanId).toBe(context.spanId)
      expect(envelope.tsStart).toBe(100)
      expect(envelope.tsEnd).toBe(200)
    })
  })

  describe('estimatePayloadBytes', () => {
    it('should handle null and undefined', () => {
      expect(estimatePayloadBytes(null)).toBe(0)
      expect(estimatePayloadBytes(undefined)).toBe(0)
    })

    it('should estimate primitives', () => {
      expect(estimatePayloadBytes(42)).toBe(8)
      expect(estimatePayloadBytes(true)).toBe(8)
      expect(estimatePayloadBytes(false)).toBe(8)
    })

    it('should measure strings correctly', () => {
      expect(estimatePayloadBytes('hello')).toBe(5)
      expect(estimatePayloadBytes('Hello 世界')).toBeGreaterThan(8) // UTF-8 encoding
    })

    it('should measure ArrayBuffer', () => {
      const buffer = new ArrayBuffer(100)
      expect(estimatePayloadBytes(buffer)).toBe(100)
    })

    it('should measure TypedArrays', () => {
      const uint8 = new Uint8Array(50)
      expect(estimatePayloadBytes(uint8)).toBe(50)
    })

    it('should estimate small arrays', () => {
      const arr = [1, 2, 3]
      expect(estimatePayloadBytes(arr)).toBeGreaterThan(0)
    })

    it('should estimate large arrays with sampling', () => {
      const arr = new Array(1000).fill(42)
      const size = estimatePayloadBytes(arr)
      expect(size).toBeGreaterThan(0)
    })

    it('should estimate small objects', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const size = estimatePayloadBytes(obj)
      expect(size).toBeGreaterThan(0)
    })

    it('should handle large objects with sampling', () => {
      const obj: Record<string, number> = {}
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = i
      }
      const size = estimatePayloadBytes(obj)
      expect(size).toBeGreaterThan(0)
    })

    it('should not hang on circular references', () => {
      const obj: Record<string, unknown> = { a: 1 }
      obj.self = obj

      expect(() => {
        estimatePayloadBytes(obj)
      }).not.toThrow()
    })
  })

  describe('createPayloadPreview', () => {
    it('should return none mode when requested', () => {
      const preview = createPayloadPreview({ test: 'data' }, 'none')
      expect(preview.mode).toBe('none')
      expect(preview.bytes).toBeUndefined()
      expect(preview.data).toBeUndefined()
    })

    it('should return redacted mode with summary', () => {
      const preview = createPayloadPreview({ a: 1, b: 2 }, 'redacted')
      expect(preview.mode).toBe('redacted')
      expect(preview.bytes).toBeGreaterThan(0)
      expect(preview.summary).toBeDefined()
      expect(preview.data).toBeUndefined()
    })

    it('should return full mode with data for small payloads', () => {
      const data = { test: 'data' }
      const preview = createPayloadPreview(data, 'full', 10_000)
      expect(preview.mode).toBe('full')
      expect(preview.bytes).toBeGreaterThan(0)
      expect(preview.data).toEqual(data)
    })

    it('should truncate large payloads in full mode', () => {
      const largeData = 'x'.repeat(20_000)
      const preview = createPayloadPreview(largeData, 'full', 10_000)
      expect(preview.mode).toBe('full')
      expect(preview.summary).toContain('truncated')
      expect(preview.data).toBeUndefined()
    })

    it('should generate meaningful summaries', () => {
      expect(createPayloadPreview('hello', 'redacted').summary).toContain('"hello"')
      expect(createPayloadPreview(42, 'redacted').summary).toContain('42')
      expect(createPayloadPreview([1, 2, 3], 'redacted').summary).toContain('Array')
      expect(createPayloadPreview({ a: 1 }, 'redacted').summary).toContain('a')
    })
  })

  describe('serializeError', () => {
    it('should serialize Error objects', () => {
      const error = new Error('Test error')
      const serialized = serializeError(error)

      expect(serialized.name).toBe('Error')
      expect(serialized.message).toBe('Test error')
      expect(serialized.stack).toBeDefined()
    })

    it('should include error code if present', () => {
      const error = new Error('Test error') as NodeJS.ErrnoException
      error.code = 'ENOENT'

      const serialized = serializeError(error)
      expect(serialized.code).toBe('ENOENT')
    })

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error')
      const serialized = serializeError(error)

      expect(serialized.name).toBe('CustomError')
      expect(serialized.message).toBe('Custom error')
    })

    it('should handle non-Error values', () => {
      expect(serializeError('string error').message).toBe('string error')
      expect(serializeError(42).message).toBe('42')
      expect(serializeError(null).message).toBe('null')
    })
  })
})

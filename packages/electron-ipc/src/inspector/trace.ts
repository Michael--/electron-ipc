import type { PayloadMode, PayloadPreview, TraceContext, TraceEnvelope, TraceEvent } from './types'

/**
 * Trace sink function type
 * Called whenever a trace event is emitted
 */
export type TraceSink = (event: TraceEvent) => void

/**
 * Global trace sink
 */
let globalTraceSink: TraceSink | null = null

/**
 * Tracing enabled state
 */
let tracingEnabled = false

/**
 * Current payload mode
 */
let currentPayloadMode: PayloadMode = 'redacted'

/**
 * Sets the global trace sink
 *
 * @param sink - Function to receive trace events, or null to disable
 */
export function setTraceSink(sink: TraceSink | null): void {
  globalTraceSink = sink
  tracingEnabled = sink !== null
}

/**
 * Sets the current payload mode
 *
 * @param mode - Payload mode to use for new traces
 */
export function setPayloadMode(mode: PayloadMode): void {
  currentPayloadMode = mode
}

/**
 * Gets the current payload mode
 *
 * @returns Current payload mode
 */
export function getPayloadMode(): PayloadMode {
  return currentPayloadMode
}

/**
 * Emits a trace event to the registered sink
 *
 * @param event - Trace event to emit
 */
export function emitTrace(event: TraceEvent): void {
  if (!tracingEnabled || !globalTraceSink) {
    return
  }

  try {
    globalTraceSink(event)
  } catch (error) {
    // Fail silently to avoid breaking app
    console.error('[electron-ipc] Trace sink error:', error)
  }
}

/**
 * Checks if tracing is currently enabled
 */
export function isTracingEnabled(): boolean {
  return tracingEnabled
}

/**
 * Checks if a channel should be traced
 *
 * @param channel - IPC channel name
 * @param windowRole - Optional window role
 */
export function shouldTrace(channel: string, windowRole?: string): boolean {
  // Never trace if tracing is disabled
  if (!tracingEnabled) {
    return false
  }

  // Never trace Inspector IPC (prevent circular tracing)
  if (channel.startsWith('INSPECTOR:')) {
    return false
  }

  // Don't trace events from Inspector windows
  if (windowRole === 'inspector') {
    return false
  }

  return true
}

/**
 * Generates a unique trace ID
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Generates a unique span ID
 */
export function generateSpanId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Creates a trace context for correlation
 *
 * @param parent - Optional parent trace context
 */
export function createTraceContext(parent?: TraceContext): TraceContext {
  if (parent) {
    return {
      traceId: parent.traceId,
      spanId: generateSpanId(),
      parentSpanId: parent.spanId,
    }
  }

  const traceId = generateTraceId()
  return {
    traceId,
    spanId: traceId,
  }
}

/**
 * Creates a trace envelope with timestamps
 *
 * @param context - Trace context for this span
 * @param tsStart - Start timestamp
 * @param tsEnd - Optional end timestamp
 */
export function createTraceEnvelope(
  context: TraceContext,
  tsStart: number,
  tsEnd?: number
): TraceEnvelope {
  if (tsEnd === undefined) {
    return { ...context, tsStart }
  }
  return { ...context, tsStart, tsEnd }
}

/**
 * Estimates the size of a payload in bytes
 *
 * Uses sampling and shortcuts to avoid performance impact on large objects
 *
 * @param value - Value to estimate
 * @param _maxIterations - Maximum number of properties to sample (default: 1000, currently unused)
 */
export function estimatePayloadBytes(value: unknown, _maxIterations = 1000): number {
  // Handle primitives and special cases
  if (value === null || value === undefined) {
    return 0
  }

  // ArrayBuffer / TypedArray
  if (value instanceof ArrayBuffer) {
    return value.byteLength
  }
  if (ArrayBuffer.isView(value)) {
    return value.byteLength
  }

  // String
  if (typeof value === 'string') {
    // Use cached TextEncoder
    return textEncoder.encode(value).byteLength
  }

  // Primitives
  if (typeof value === 'number' || typeof value === 'boolean') {
    return 8
  }

  // Objects and Arrays - use sampling
  if (typeof value === 'object') {
    try {
      // Quick check: if object is small, stringify it
      if (Array.isArray(value)) {
        if (value.length === 0) return 2 // "[]"
        if (value.length <= 10) {
          return JSON.stringify(value).length
        }
        // Estimate: sample first 10 items
        return value.length * 8
      }

      // Regular object
      const keys = Object.keys(value)
      if (keys.length === 0) return 2 // "{}"
      if (keys.length <= 10) {
        return JSON.stringify(value).length
      }

      // Large object: sample first 10 keys and estimate
      const sample = keys.slice(0, 10).reduce((sum, key) => {
        const propValue = (value as Record<string, unknown>)[key]
        return sum + key.length + estimatePayloadBytes(propValue, 10)
      }, 0)

      // Extrapolate
      return (sample / 10) * keys.length
    } catch {
      // Fallback: try partial stringify
      try {
        const jsonStr = JSON.stringify(value)
        return jsonStr.length > 1000 ? 1000 : jsonStr.length
      } catch {
        return 0
      }
    }
  }

  return 0
}

// Cached TextEncoder instance
const textEncoder = new TextEncoder()

/**
 * Creates a payload preview
 *
 * @param value - Payload value
 * @param mode - Preview mode
 * @param maxBytes - Maximum bytes for preview
 */
export function createPayloadPreview(
  value: unknown,
  mode: PayloadMode = 'redacted',
  maxBytes = 10_000
): PayloadPreview {
  if (mode === 'none') {
    return { mode: 'none' }
  }

  const bytes = estimatePayloadBytes(value)

  if (mode === 'redacted') {
    const summary = generatePayloadSummary(value)
    return { mode: 'redacted', bytes, summary }
  }

  // mode === 'full'
  if (bytes <= maxBytes) {
    return { mode: 'full', bytes, data: value }
  }

  // Truncate large payloads
  const summary = generatePayloadSummary(value)
  return {
    mode: 'full',
    bytes,
    summary: `${summary} (truncated, too large for preview)`,
  }
}

/**
 * Generates a human-readable summary of a payload
 *
 * @param value - Value to summarize
 */
function generatePayloadSummary(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  if (typeof value === 'string') {
    return value.length > 50 ? `string(${value.length} chars)` : `"${value}"`
  }

  if (typeof value === 'number') return `number: ${value}`
  if (typeof value === 'boolean') return `boolean: ${value}`

  if (ArrayBuffer.isView(value)) {
    return `${value.constructor.name}(${value.byteLength} bytes)`
  }

  if (value instanceof ArrayBuffer) {
    return `ArrayBuffer(${value.byteLength} bytes)`
  }

  if (Array.isArray(value)) {
    return `Array(${value.length} items)`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    const summary = keys.slice(0, 5).join(', ')
    const more = keys.length > 5 ? `, ...${keys.length - 5} more` : ''
    return `{${summary}${more}}`
  }

  return typeof value
}

/**
 * Serializes an error for tracing
 *
 * @param error - Error to serialize
 */
export function serializeError(error: unknown): {
  name: string
  message: string
  stack?: string
  code?: string
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as NodeJS.ErrnoException).code,
    }
  }

  return {
    name: 'Error',
    message: String(error),
  }
}

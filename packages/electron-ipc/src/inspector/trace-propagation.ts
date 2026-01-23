import { AsyncLocalStorage } from 'node:async_hooks'
import type { TraceContext } from './types'

// Re-export TraceContext for external use
export type { TraceContext }

const TRACE_CONTEXT_KEY = '__ipcTrace'
const TRACE_DATA_KEY = '__ipcData'

export type TraceEnvelopePayload<T> = {
  __ipcTrace: TraceContext
  __ipcData: T
}

const traceStore = new AsyncLocalStorage<TraceContext>()

function isTraceContext(value: unknown): value is TraceContext {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.traceId === 'string' &&
    typeof record.spanId === 'string' &&
    (record.parentSpanId === undefined || typeof record.parentSpanId === 'string')
  )
}

export function isTraceEnvelopePayload(value: unknown): value is TraceEnvelopePayload<unknown> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (!(TRACE_CONTEXT_KEY in record) || !(TRACE_DATA_KEY in record)) return false
  return isTraceContext(record[TRACE_CONTEXT_KEY])
}

export function wrapTracePayload<T>(payload: T, trace?: TraceContext): T | TraceEnvelopePayload<T> {
  if (!trace) return payload
  if (isTraceEnvelopePayload(payload)) return payload
  return {
    [TRACE_CONTEXT_KEY]: trace,
    [TRACE_DATA_KEY]: payload,
  } as TraceEnvelopePayload<T>
}

export function unwrapTracePayload<T>(input: T | TraceEnvelopePayload<T>): {
  payload: T
  trace?: TraceContext
} {
  if (isTraceEnvelopePayload(input)) {
    return {
      payload: input.__ipcData,
      trace: input.__ipcTrace,
    }
  }
  return { payload: input as T }
}

export function runWithTraceContext<T>(trace: TraceContext | undefined, fn: () => T): T {
  if (!trace) return fn()
  return traceStore.run(trace, fn)
}

export function getCurrentTraceContext(): TraceContext | undefined {
  return traceStore.getStore()
}

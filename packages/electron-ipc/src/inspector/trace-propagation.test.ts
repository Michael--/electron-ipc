import { describe, expect, it } from 'vitest'
import {
  getCurrentTraceContext,
  runWithTraceContext,
  unwrapTracePayload,
  wrapTracePayload,
} from './trace-propagation'

describe('trace-propagation', () => {
  it('wraps and unwraps payloads with trace context', () => {
    const trace = { traceId: 'trace-1', spanId: 'span-1' }
    const payload = { value: 42 }

    const wrapped = wrapTracePayload(payload, trace)
    const unwrapped = unwrapTracePayload(wrapped)

    expect(unwrapped.payload).toEqual(payload)
    expect(unwrapped.trace).toEqual(trace)
  })

  it('leaves payload unchanged when no trace is provided', () => {
    const payload = { ok: true }

    const wrapped = wrapTracePayload(payload, undefined)
    const unwrapped = unwrapTracePayload(wrapped)

    expect(wrapped).toBe(payload)
    expect(unwrapped.payload).toEqual(payload)
    expect(unwrapped.trace).toBeUndefined()
  })

  it('scopes trace context to the async call chain', async () => {
    const trace = { traceId: 'trace-2', spanId: 'span-2', parentSpanId: 'parent' }
    let inside: unknown

    await runWithTraceContext(trace, async () => {
      await Promise.resolve()
      inside = getCurrentTraceContext()
    })

    expect(inside).toEqual(trace)
    expect(getCurrentTraceContext()).toBeUndefined()
  })
})

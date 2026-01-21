import { describe, expect, it } from 'vitest'
import type { EventTrace, InvokeTrace, TraceEvent } from './types'
import { computeMetrics } from './metrics'

describe('computeMetrics', () => {
  it('counts completed invokes and computes percentiles', () => {
    const baseInvoke: InvokeTrace = {
      id: 'invoke-1',
      kind: 'invoke',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 10,
      channel: 'Ping',
      source: { webContentsId: 1 },
      request: { mode: 'full', bytes: 10, data: { ok: true } },
    }

    const startEvent: InvokeTrace = { ...baseInvoke }
    const endEvent: InvokeTrace = {
      ...baseInvoke,
      tsEnd: 30,
      durationMs: 20,
      response: { mode: 'full', bytes: 5, data: { ok: true } },
    }

    const rows = computeMetrics([startEvent, endEvent])
    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(1)
    expect(rows[0].errorCount).toBe(0)
    expect(rows[0].bytes).toBe(15)
    expect(rows[0].p50).toBe(20)
  })

  it('calculates error rate for event traces', () => {
    const okEvent: EventTrace = {
      id: 'event-1',
      kind: 'event',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 1,
      channel: 'Notify',
      source: { webContentsId: 2 },
      payload: { mode: 'redacted', bytes: 3, summary: '{}' },
    }
    const errorEvent: EventTrace = {
      ...okEvent,
      id: 'event-2',
      status: 'error',
      payload: { mode: 'redacted', bytes: 7, summary: '{}' },
    }

    const rows = computeMetrics([okEvent, errorEvent])
    expect(rows[0].count).toBe(2)
    expect(rows[0].errorCount).toBe(1)
    expect(rows[0].errorRate).toBeCloseTo(0.5)
    expect(rows[0].bytes).toBe(10)
  })

  it('computes throughput for stream chunks', () => {
    const chunk1 = {
      id: 'stream-1',
      kind: 'streamInvoke',
      direction: 'renderer→main',
      status: 'streaming',
      tsStart: 1000,
      channel: 'StreamData',
      streamId: 'stream-1',
      streamType: 'invoke',
      chunkCount: 1,
      totalBytes: 0,
      source: { webContentsId: 3 },
      stream: { mode: 'full', bytes: 100, data: 'a' },
    } as TraceEvent

    const chunk2 = {
      ...chunk1,
      tsStart: 2000,
      stream: { mode: 'full', bytes: 300, data: 'b' },
    } as TraceEvent

    const endEvent = {
      ...chunk1,
      status: 'ok',
      tsStart: 2100,
      tsEnd: 2200,
      durationMs: 100,
      stream: undefined,
    } as TraceEvent

    const rows = computeMetrics([chunk1, chunk2, endEvent])
    expect(rows[0].bytes).toBe(400)
    expect(rows[0].count).toBe(1)
    expect(rows[0].throughputBps).toBe(400)
  })
})

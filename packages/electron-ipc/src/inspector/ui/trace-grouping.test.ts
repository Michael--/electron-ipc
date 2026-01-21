import { describe, expect, it } from 'vitest'
import type { TraceEvent } from '../types'
import { buildRenderRows } from './trace-grouping'

describe('trace grouping', () => {
  it('groups stream lifecycle events into a single span', () => {
    const startEvent = {
      id: 'span-1',
      kind: 'streamInvoke',
      channel: 'StreamData',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 100,
      trace: { traceId: 'trace-1', spanId: 'span-1' },
      source: { webContentsId: 1 },
      streamId: 'stream-1',
      streamType: 'invoke',
      chunkCount: 0,
      totalBytes: 0,
    } as TraceEvent

    const endEvent = {
      ...startEvent,
      tsEnd: 200,
      durationMs: 100,
    } as TraceEvent

    const { renderRows } = buildRenderRows([startEvent, endEvent], () => true, 'all')
    const spanRows = renderRows.filter((row) => row.type === 'span')

    expect(spanRows).toHaveLength(1)
    const spanEvent = spanRows[0].event
    expect(spanEvent.tsStart).toBe(100)
    expect(spanEvent.tsEnd).toBe(200)
    expect(spanEvent.durationMs).toBe(100)
  })

  it('applies parent/child depth ordering for nested spans', () => {
    const parentEvent = {
      id: 'span-parent',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 100,
      trace: { traceId: 'trace-2', spanId: 'span-parent' },
      source: { webContentsId: 1 },
    } as TraceEvent

    const childEvent = {
      id: 'span-child',
      kind: 'invoke',
      channel: 'Nested',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 110,
      trace: { traceId: 'trace-2', spanId: 'span-child', parentSpanId: 'span-parent' },
      source: { webContentsId: 1 },
    } as TraceEvent

    const { renderRows } = buildRenderRows([parentEvent, childEvent], () => true, 'all')
    const spanRows = renderRows.filter((row) => row.type === 'span')

    expect(spanRows).toHaveLength(2)
    const parentRow = spanRows.find((row) => row.event.channel === 'Ping')
    const childRow = spanRows.find((row) => row.event.channel === 'Nested')

    expect(parentRow?.depth).toBe(0)
    expect(childRow?.depth).toBe(1)
  })
})

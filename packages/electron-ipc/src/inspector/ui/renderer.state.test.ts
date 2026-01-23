/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TraceEvent } from '../types'
import { elements } from './renderer.dom'
import { appendEventBatch, detectGap, passesFilter, state, trimToUiLimit } from './renderer.state'

describe('inspector ui renderer state', () => {
  beforeEach(() => {
    state.allEvents = []
    state.renderRows = []
    state.searchQuery = ''
    state.kindFilter = ''
    state.statusFilter = ''
    state.renderRowsDirty = false
    state.uiMaxEvents = 2
    state.lastSeqNumber = 0
    state.detectedGaps = 0

    elements.gapCount = document.createElement('div')
    elements.gapCount.style.display = 'none'
    elements.gapCount.textContent = ''
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters events based on search and status', () => {
    const event: TraceEvent = {
      id: '1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      source: { webContentsId: 1 },
    }

    state.searchQuery = 'ping'
    expect(passesFilter(event)).toBe(true)

    state.searchQuery = 'missing'
    expect(passesFilter(event)).toBe(false)

    state.searchQuery = ''
    state.kindFilter = 'event'
    expect(passesFilter(event)).toBe(false)

    state.kindFilter = ''
    state.statusFilter = 'error'
    expect(passesFilter(event)).toBe(false)
  })

  it('trims events to the configured UI limit', () => {
    state.allEvents = [
      { id: '1' } as TraceEvent,
      { id: '2' } as TraceEvent,
      { id: '3' } as TraceEvent,
    ]

    expect(trimToUiLimit()).toBe(true)
    expect(state.allEvents).toHaveLength(2)
    expect(state.renderRowsDirty).toBe(true)
  })

  it('tracks gaps when sequence numbers skip', () => {
    detectGap(1)
    expect(state.detectedGaps).toBe(0)

    detectGap(3)
    expect(state.detectedGaps).toBe(1)
    expect(elements.gapCount.style.display).toBe('inline-block')
    expect(elements.gapCount.textContent).toBe('⚠ 1 gaps')
  })

  it('appends event batches and enforces size limits', () => {
    const batch: TraceEvent[] = [
      {
        id: '1',
        kind: 'event',
        channel: 'Ping',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: 0,
        source: { webContentsId: 1 },
        seq: 1,
      },
      {
        id: '2',
        kind: 'event',
        channel: 'Ping',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: 0,
        source: { webContentsId: 1 },
        seq: 2,
      },
      {
        id: '3',
        kind: 'event',
        channel: 'Ping',
        direction: 'renderer→main',
        status: 'ok',
        tsStart: 0,
        source: { webContentsId: 1 },
        seq: 3,
      },
    ]

    expect(appendEventBatch(batch)).toBe(true)
    expect(state.allEvents).toHaveLength(2)
    expect(state.renderRowsDirty).toBe(true)
  })
})

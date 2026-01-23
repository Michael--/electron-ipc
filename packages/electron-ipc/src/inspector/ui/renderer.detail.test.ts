/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest'
import type { TraceEvent } from '../types'
import type { TraceRow } from './trace-grouping'
import { elements } from './renderer.dom'
import { closeDetailPanel, showDetailPanel, showTraceDetailPanel } from './renderer.detail'
import { state } from './renderer.state'

describe('inspector ui renderer detail', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    elements.body = document.body
    elements.detailPanel = document.createElement('div')
    elements.detailContent = document.createElement('div')
    elements.pinDetailBtn = document.createElement('button')

    document.body.appendChild(elements.detailPanel)
    document.body.appendChild(elements.detailContent)
    document.body.appendChild(elements.pinDetailBtn)

    state.selectedRowKey = 'span:1'
    state.isDetailPinned = true
  })

  it('renders invoke detail panels with trace metadata and payloads', () => {
    const event: TraceEvent = {
      id: 'evt-1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'error',
      tsStart: 1000,
      tsEnd: 1100,
      durationMs: 100,
      source: { webContentsId: 1, windowRole: 'main' },
      trace: {
        traceId: 'trace-1',
        spanId: 'span-1',
        parentSpanId: 'parent-1',
        tsStart: 1000,
        tsEnd: 1100,
      },
      request: {
        mode: 'full',
        bytes: 12,
        summary: 'request',
        data: { html: '<tag>' },
      },
      response: {
        mode: 'redacted',
        bytes: 4,
        summary: 'response',
      },
      error: { name: 'BoomError', message: 'boom' },
    }

    showDetailPanel(event)

    expect(elements.detailPanel.classList.contains('visible')).toBe(true)
    expect(elements.body.classList.contains('detail-open')).toBe(true)
    expect(elements.detailContent.innerHTML).toContain('Trace ID')
    expect(elements.detailContent.innerHTML).toContain('Parent Span')
    expect(elements.detailContent.innerHTML).toContain('Request')
    expect(elements.detailContent.innerHTML).toContain('Response')
    expect(elements.detailContent.innerHTML).toContain('Error')
    expect(elements.detailContent.innerHTML).toContain('&lt;tag&gt;')
  })

  it('renders payload sections for broadcast events', () => {
    const event: TraceEvent = {
      id: 'evt-2',
      kind: 'broadcast',
      channel: 'Update',
      direction: 'main→renderer',
      status: 'ok',
      tsStart: 2000,
      target: { webContentsId: 2 },
      payload: {
        mode: 'full',
        bytes: 10,
        summary: 'payload',
        data: { ok: true },
      },
    }

    showDetailPanel(event)

    expect(elements.detailContent.innerHTML).toContain('Payload')
    expect(elements.detailContent.innerHTML).toContain('payload')
  })

  it('renders trace summary panels', () => {
    const traceRow: TraceRow = {
      type: 'trace',
      traceId: 'trace-2',
      tsStart: 3000,
      tsEnd: 3200,
      durationMs: 200,
      status: 'ok',
      spanCount: 3,
      errorCount: 1,
      incompleteCount: 0,
    }

    showTraceDetailPanel(traceRow)

    expect(elements.detailPanel.classList.contains('visible')).toBe(true)
    expect(elements.detailContent.innerHTML).toContain('trace-2')
    expect(elements.detailContent.innerHTML).toContain('3')
  })

  it('closes the detail panel and clears selection', () => {
    const rowA = document.createElement('tr')
    const rowB = document.createElement('tr')
    rowA.classList.add('selected')
    rowB.classList.add('selected')
    document.body.appendChild(rowA)
    document.body.appendChild(rowB)

    elements.detailPanel.classList.add('visible')
    elements.body.classList.add('detail-open')

    closeDetailPanel()

    expect(elements.detailPanel.classList.contains('visible')).toBe(false)
    expect(elements.body.classList.contains('detail-open')).toBe(false)
    expect(state.selectedRowKey).toBeNull()
    expect(state.isDetailPinned).toBe(false)
    expect(rowA.classList.contains('selected')).toBe(false)
    expect(rowB.classList.contains('selected')).toBe(false)
    expect(elements.pinDetailBtn.textContent).toBe('Pin')
  })
})

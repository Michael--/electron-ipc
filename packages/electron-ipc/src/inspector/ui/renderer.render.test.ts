/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TraceEvent } from '../types'
import type { RenderRow, SpanRow, TraceRow } from './trace-grouping'
import { elements } from './renderer.dom'
import { state } from './renderer.state'

const showDetailPanel = vi.fn()
const showTraceDetailPanel = vi.fn()

vi.mock('./renderer.detail', () => ({
  showDetailPanel: (...args: unknown[]) => showDetailPanel(...args),
  showTraceDetailPanel: (...args: unknown[]) => showTraceDetailPanel(...args),
}))

const isNearBottom = vi.fn(() => true)
const scrollToBottom = vi.fn()

vi.mock('./renderer.utils', async () => {
  const actual = await vi.importActual<typeof import('./renderer.utils')>('./renderer.utils')
  return {
    ...actual,
    isNearBottom: (...args: Parameters<typeof isNearBottom>) => isNearBottom(...args),
    scrollToBottom: (...args: Parameters<typeof scrollToBottom>) => scrollToBottom(...args),
  }
})

const renderModule = await import('./renderer.render')
const stateModule = await import('./renderer.state')
const { calculateVisibleRange, handleScroll, renderEvents, /*renderNow,*/ scheduleRender } =
  renderModule

describe('inspector ui renderer render', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    elements.main = document.createElement('div')
    elements.eventsTable = document.createElement('table')
    elements.eventsBody = document.createElement('tbody')
    elements.eventsTable.appendChild(elements.eventsBody)
    elements.emptyState = document.createElement('div')

    document.body.appendChild(elements.main)
    document.body.appendChild(elements.eventsTable)
    document.body.appendChild(elements.emptyState)

    state.renderRows = []
    state.renderRowsDirty = false
    state.selectedRowKey = null
    state.autoScrollEnabled = true
    state.virtualScrollContainer = null
    state.lastScrollTop = 0
    state.pendingRender = false
    state.renderTimeout = null

    showDetailPanel.mockReset()
    showTraceDetailPanel.mockReset()
    isNearBottom.mockClear()
    scrollToBottom.mockClear()
  })

  it('renders empty state when there are no rows', () => {
    renderEvents()

    expect(elements.emptyState.style.display).toBe('flex')
    expect(elements.eventsTable.style.display).toBe('none')
  })

  it('renders trace and span rows and handles selection', () => {
    const traceRow: TraceRow = {
      type: 'trace',
      traceId: 'trace-1',
      tsStart: 1,
      status: 'ok',
      spanCount: 2,
      errorCount: 0,
      incompleteCount: 0,
    }

    const event: TraceEvent = {
      id: 'evt-1',
      kind: 'event',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 5,
      source: { webContentsId: 1 },
    }

    const spanRow: SpanRow = {
      type: 'span',
      event,
      depth: 1,
      isIncomplete: false,
      traceId: 'trace-1',
      spanId: 'span-1',
    }

    state.renderRows = [traceRow, spanRow]
    state.selectedRowKey = 'span:span-1'

    renderEvents()

    expect(elements.emptyState.style.display).toBe('none')
    expect(elements.eventsTable.style.display).toBe('table')
    expect(elements.eventsBody.children.length).toBe(2)
    expect(elements.eventsBody.querySelectorAll('tr.selected').length).toBe(1)

    const traceElement = elements.eventsBody.querySelector('tr.trace-row') as HTMLTableRowElement
    const spanElement = elements.eventsBody.querySelector('tr.span-row') as HTMLTableRowElement

    traceElement.click()
    spanElement.click()

    expect(showTraceDetailPanel).toHaveBeenCalledWith(traceRow)
    expect(showDetailPanel).toHaveBeenCalledWith(event)
  })

  it('rebuilds render rows when marked dirty', () => {
    const rebuildSpy = vi.spyOn(stateModule, 'rebuildRenderRows')
    state.renderRowsDirty = true

    renderEvents()

    expect(rebuildSpy).toHaveBeenCalled()
  })

  it('schedules a debounced render', async () => {
    vi.useFakeTimers()
    elements.emptyState.style.display = 'none'
    elements.eventsTable.style.display = 'table'
    state.renderRows = []

    scheduleRender()
    scheduleRender()

    expect(state.pendingRender).toBe(true)

    await vi.runAllTimersAsync()

    expect(elements.emptyState.style.display).toBe('flex')
    expect(elements.eventsTable.style.display).toBe('none')
    vi.useRealTimers()
  })

  it('calculates visible ranges for virtual scroll', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTop', { value: 320 })
    Object.defineProperty(container, 'clientHeight', { value: 320 })
    state.virtualScrollContainer = container
    state.renderRows = new Array(100).fill(null).map(
      () =>
        ({
          type: 'trace',
          traceId: 't',
          tsStart: 0,
          status: 'ok',
          spanCount: 1,
          errorCount: 0,
          incompleteCount: 0,
        }) as RenderRow
    )

    const range = calculateVisibleRange()

    expect(range.start).toBe(0)
    expect(range.end).toBe(30)
  })

  it('renders on scroll when delta exceeds item height', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTop', { value: 100, writable: true })
    state.virtualScrollContainer = container
    state.lastScrollTop = 0
    elements.emptyState.style.display = 'none'
    elements.eventsTable.style.display = 'table'
    state.renderRows = []

    handleScroll()

    expect(elements.emptyState.style.display).toBe('flex')
    expect(elements.eventsTable.style.display).toBe('none')
  })

  it('auto-scrolls when near the bottom', () => {
    const event: TraceEvent = {
      id: 'evt-2',
      kind: 'event',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 5,
      source: { webContentsId: 1 },
    }

    state.renderRows = [
      {
        type: 'span',
        event,
        depth: 0,
        isIncomplete: false,
        traceId: 'trace-2',
        spanId: 'span-2',
      },
    ]

    renderEvents()

    expect(isNearBottom).toHaveBeenCalled()
    expect(scrollToBottom).toHaveBeenCalledWith(elements.main)
  })
})

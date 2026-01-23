import type { TraceEvent } from '../types'
import type { RenderRow, TraceRowFilter } from './trace-grouping'
import { buildRenderRows } from './trace-grouping'
import { elements } from './renderer.dom'

export const constants = {
  RENDER_DEBOUNCE_MS: 100,
  VIRTUAL_SCROLL_ITEM_HEIGHT: 32,
  VIRTUAL_SCROLL_OVERSCAN: 10,
}

export const state = {
  allEvents: [] as TraceEvent[],
  renderRows: [] as RenderRow[],
  selectedRowKey: null as string | null,
  isPaused: false,
  searchQuery: '',
  kindFilter: '',
  statusFilter: '',
  isDetailPinned: false,
  autoScrollEnabled: true,
  traceEnabled: true,
  renderTimeout: null as ReturnType<typeof setTimeout> | null,
  pendingRender: false,
  renderRowsDirty: true,
  traceRowFilter: 'errors' as TraceRowFilter,
  virtualScrollContainer: null as HTMLElement | null,
  lastScrollTop: 0,
  statsStartTime: Date.now(),
  statsEventCount: 0,
  serverBufferSize: 5000,
  uiMaxEvents: 10000,
  lastSeqNumber: 0,
  detectedGaps: 0,
}

export function passesFilter(event: TraceEvent): boolean {
  if (state.searchQuery && !event.channel.toLowerCase().includes(state.searchQuery)) {
    return false
  }

  if (state.kindFilter && event.kind !== state.kindFilter) {
    return false
  }

  if (state.statusFilter && event.status !== state.statusFilter) {
    return false
  }

  return true
}

export function rebuildRenderRows() {
  const result = buildRenderRows(state.allEvents, passesFilter, state.traceRowFilter)
  state.renderRows = result.renderRows
  state.renderRowsDirty = false
}

export function trimToUiLimit(): boolean {
  let changed = false
  while (state.allEvents.length > state.uiMaxEvents) {
    state.allEvents.shift()
    changed = true
  }
  if (changed) {
    state.renderRowsDirty = true
  }
  return changed
}

export function appendEvent(event: TraceEvent): boolean {
  if (event.seq) detectGap(event.seq)
  state.allEvents.push(event)
  state.renderRowsDirty = true

  trimToUiLimit()
  return true
}

export function appendEventBatch(events: TraceEvent[]): boolean {
  let changed = false
  for (const event of events) {
    if (event.seq) detectGap(event.seq)
    state.allEvents.push(event)
    changed = true
  }

  if (changed) {
    state.renderRowsDirty = true
  }

  if (trimToUiLimit()) {
    changed = true
  }

  return changed
}

export function detectGap(seq: number) {
  if (!seq) return

  if (state.lastSeqNumber > 0 && seq > state.lastSeqNumber + 1) {
    const gap = seq - state.lastSeqNumber - 1
    state.detectedGaps += gap
    console.warn(
      `[Inspector] Gap detected: missing ${gap} events (${state.lastSeqNumber + 1} to ${seq - 1})`
    )

    elements.gapCount.style.display = 'inline-block'
    elements.gapCount.textContent = `⚠ ${state.detectedGaps} gaps`
  }

  state.lastSeqNumber = Math.max(state.lastSeqNumber, seq)
}

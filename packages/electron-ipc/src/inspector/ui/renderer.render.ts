import type { RenderRow, SpanRow, TraceRow } from './trace-grouping'
import { elements } from './renderer.dom'
import { constants, rebuildRenderRows, state } from './renderer.state'
import { showDetailPanel, showTraceDetailPanel } from './renderer.detail'
import {
  formatBytes,
  formatKind,
  formatTime,
  getDisplayDirection,
  getEventBytes,
  getEventRole,
  isNearBottom,
  scrollToBottom,
} from './renderer.utils'

export function renderNow() {
  if (state.renderTimeout) {
    clearTimeout(state.renderTimeout)
    state.renderTimeout = null
  }
  state.pendingRender = false
  renderEvents()
}

export function scheduleRender() {
  if (state.pendingRender) {
    return
  }

  state.pendingRender = true

  if (state.renderTimeout) {
    clearTimeout(state.renderTimeout)
  }

  state.renderTimeout = setTimeout(() => {
    state.renderTimeout = null
    state.pendingRender = false
    renderEvents()
  }, constants.RENDER_DEBOUNCE_MS)
}

export function renderEvents() {
  if (state.renderRowsDirty) {
    rebuildRenderRows()
  }

  const shouldStick = state.autoScrollEnabled && elements.main && isNearBottom(elements.main, 24)

  if (state.renderRows.length === 0) {
    elements.emptyState.style.display = 'flex'
    elements.eventsTable.style.display = 'none'
    return
  }

  elements.emptyState.style.display = 'none'
  elements.eventsTable.style.display = 'table'

  const visibleRange = calculateVisibleRange()

  elements.eventsBody.innerHTML = ''

  if (visibleRange.start > 0) {
    const spacer = document.createElement('tr')
    spacer.style.height = `${visibleRange.start * constants.VIRTUAL_SCROLL_ITEM_HEIGHT}px`
    spacer.className = 'virtual-spacer'
    elements.eventsBody.appendChild(spacer)
  }

  for (let i = visibleRange.start; i < visibleRange.end; i++) {
    const rowData = state.renderRows[i]
    if (!rowData) continue
    const row = createRenderRow(rowData, i)
    if (state.selectedRowKey && getRowKey(rowData) === state.selectedRowKey) {
      row.classList.add('selected')
    }
    elements.eventsBody.appendChild(row)
  }

  if (visibleRange.end < state.renderRows.length) {
    const spacer = document.createElement('tr')
    spacer.style.height = `${(state.renderRows.length - visibleRange.end) * constants.VIRTUAL_SCROLL_ITEM_HEIGHT}px`
    spacer.className = 'virtual-spacer'
    elements.eventsBody.appendChild(spacer)
  }

  if (shouldStick) {
    scrollToBottom(elements.main)
  }
}

export function calculateVisibleRange(): { start: number; end: number } {
  if (!state.virtualScrollContainer) {
    return { start: 0, end: state.renderRows.length }
  }

  const scrollTop = state.virtualScrollContainer.scrollTop
  const containerHeight = state.virtualScrollContainer.clientHeight

  const start = Math.max(
    0,
    Math.floor(scrollTop / constants.VIRTUAL_SCROLL_ITEM_HEIGHT) - constants.VIRTUAL_SCROLL_OVERSCAN
  )
  const visibleCount = Math.ceil(containerHeight / constants.VIRTUAL_SCROLL_ITEM_HEIGHT)
  const end = Math.min(
    state.renderRows.length,
    start + visibleCount + constants.VIRTUAL_SCROLL_OVERSCAN * 2
  )

  return { start, end }
}

export function handleScroll() {
  if (!state.virtualScrollContainer) return

  const currentScrollTop = state.virtualScrollContainer.scrollTop
  const delta = Math.abs(currentScrollTop - state.lastScrollTop)

  if (delta > constants.VIRTUAL_SCROLL_ITEM_HEIGHT) {
    state.lastScrollTop = currentScrollTop
    renderNow()
  }
}

function getRowKey(row: RenderRow): string {
  return row.type === 'trace' ? `trace:${row.traceId}` : `span:${row.spanId}`
}

function createRenderRow(row: RenderRow, index: number): HTMLTableRowElement {
  return row.type === 'trace' ? createTraceRow(row, index) : createEventRow(row, index)
}

function createTraceRow(rowData: TraceRow, index: number): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.dataset.index = String(index)
  row.classList.add('trace-row')
  if (rowData.incompleteCount > 0) {
    row.classList.add('row-incomplete')
  }

  const seqCell = document.createElement('td')
  seqCell.textContent = '-'
  seqCell.style.fontFamily = 'monospace'
  seqCell.style.fontSize = '11px'
  seqCell.style.color = '#858585'
  row.appendChild(seqCell)

  const timeCell = document.createElement('td')
  timeCell.textContent = formatTime(rowData.tsStart)
  row.appendChild(timeCell)

  const typeCell = document.createElement('td')
  const kindBadge = document.createElement('span')
  kindBadge.className = 'kind-badge kind-trace'
  kindBadge.textContent = 'Trace'
  typeCell.appendChild(kindBadge)
  row.appendChild(typeCell)

  const channelCell = document.createElement('td')
  const traceIdLabel = document.createElement('span')
  traceIdLabel.className = 'trace-id'
  traceIdLabel.textContent = rowData.traceId
  channelCell.appendChild(traceIdLabel)

  const metaParts = [`${rowData.spanCount} spans`]
  if (rowData.errorCount > 0) {
    metaParts.push(`${rowData.errorCount} errors`)
  }
  if (rowData.incompleteCount > 0) {
    metaParts.push(`${rowData.incompleteCount} open`)
  }
  const traceMeta = document.createElement('span')
  traceMeta.className = 'trace-meta'
  traceMeta.textContent = ` ${metaParts.join(' | ')}`
  channelCell.appendChild(traceMeta)
  channelCell.classList.add('cell-truncate')
  row.appendChild(channelCell)

  const directionCell = document.createElement('td')
  directionCell.textContent = '-'
  row.appendChild(directionCell)

  const roleCell = document.createElement('td')
  roleCell.textContent = '-'
  row.appendChild(roleCell)

  const durationCell = document.createElement('td')
  if (rowData.durationMs !== undefined) {
    durationCell.textContent = `${rowData.durationMs.toFixed(2)}ms`
  } else {
    durationCell.textContent = '-'
  }
  row.appendChild(durationCell)

  const sizeCell = document.createElement('td')
  sizeCell.textContent = '-'
  row.appendChild(sizeCell)

  const statusCell = document.createElement('td')
  statusCell.className = `status-badge-cell status-${rowData.status}`
  statusCell.textContent = rowData.status.toUpperCase()
  row.appendChild(statusCell)

  row.addEventListener('click', () => {
    const rowKey = getRowKey(rowData)
    if (state.isDetailPinned && state.selectedRowKey && state.selectedRowKey !== rowKey) {
      return
    }
    state.selectedRowKey = rowKey
    showTraceDetailPanel(rowData)
    document.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'))
    row.classList.add('selected')
  })

  return row
}

function createEventRow(rowData: SpanRow, index: number): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.dataset.index = String(index)
  row.classList.add('span-row')
  if (rowData.isIncomplete) {
    row.classList.add('row-incomplete')
  }

  const event = rowData.event

  const seqCell = document.createElement('td')
  seqCell.textContent = String(event.seq || '-')
  seqCell.style.fontFamily = 'monospace'
  seqCell.style.fontSize = '11px'
  seqCell.style.color = '#858585'
  row.appendChild(seqCell)

  const timeCell = document.createElement('td')
  timeCell.textContent = formatTime(event.tsStart)
  row.appendChild(timeCell)

  const typeCell = document.createElement('td')
  const kindBadge = document.createElement('span')
  const kindClass = event.kind.startsWith('stream') ? 'stream' : event.kind.toLowerCase()
  kindBadge.className = `kind-badge kind-${kindClass}`
  kindBadge.textContent = formatKind(event.kind)
  typeCell.appendChild(kindBadge)
  row.appendChild(typeCell)

  const channelCell = document.createElement('td')
  channelCell.textContent = event.channel
  channelCell.title = event.channel
  channelCell.classList.add('cell-truncate')
  const basePadding = 12
  channelCell.style.paddingLeft = `${basePadding + rowData.depth * 12}px`
  row.appendChild(channelCell)

  const directionCell = document.createElement('td')
  directionCell.textContent = getDisplayDirection(event)
  row.appendChild(directionCell)

  const roleCell = document.createElement('td')
  const role = getEventRole(event)
  roleCell.textContent = role ?? '-'
  if (role) {
    roleCell.title = role
  }
  row.appendChild(roleCell)

  const durationCell = document.createElement('td')
  if (event.durationMs !== undefined) {
    durationCell.textContent = `${event.durationMs.toFixed(2)}ms`
  } else {
    durationCell.textContent = '-'
  }
  row.appendChild(durationCell)

  const sizeCell = document.createElement('td')
  const bytes = getEventBytes(event)
  sizeCell.textContent = bytes ? formatBytes(bytes) : '-'
  row.appendChild(sizeCell)

  const statusCell = document.createElement('td')
  statusCell.className = `status-badge-cell status-${event.status}`
  statusCell.textContent = event.status.toUpperCase()
  row.appendChild(statusCell)

  row.addEventListener('click', () => {
    const rowKey = getRowKey(rowData)
    if (state.isDetailPinned && state.selectedRowKey && state.selectedRowKey !== rowKey) {
      return
    }
    state.selectedRowKey = rowKey
    showDetailPanel(event)
    document.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'))
    row.classList.add('selected')
  })

  return row
}

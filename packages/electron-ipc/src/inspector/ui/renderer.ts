/* eslint-disable no-console */
/// <reference lib="dom" />

/**
 * Inspector UI Renderer
 *
 * Main logic for the inspector UI
 */

import type { TraceEvent } from '../types'
import type { InspectorAPI } from './preload'
import { computeMetrics } from '../metrics'
import { buildRenderRows } from './trace-grouping'
import type { RenderRow, SpanRow, TraceRow, TraceRowFilter } from './trace-grouping'

// Extend Window interface for TypeScript
declare global {
  interface Window {
    inspectorAPI: InspectorAPI
  }
}

// State
let allEvents: TraceEvent[] = []
let renderRows: RenderRow[] = []

let selectedRowKey: string | null = null
let isPaused = false
let searchQuery = ''
let kindFilter = ''
let statusFilter = ''
let isDetailPinned = false
let autoScrollEnabled = true

// Render debouncing
let renderTimeout: ReturnType<typeof setTimeout> | null = null
const RENDER_DEBOUNCE_MS = 100
let pendingRender = false
let renderRowsDirty = true
let traceRowFilter: TraceRowFilter = 'errors'

// Virtual scrolling state
const VIRTUAL_SCROLL_ITEM_HEIGHT = 32 // Height of one table row in pixels
const VIRTUAL_SCROLL_OVERSCAN = 10 // Extra rows to render above/below viewport
let virtualScrollContainer: HTMLElement | null = null
let lastScrollTop = 0

// DOM Elements - will be initialized in init()
let elements: {
  body: HTMLElement
  main: HTMLElement
  statusBadge: HTMLElement
  statusText: HTMLElement
  pauseBtn: HTMLButtonElement
  clearBtn: HTMLButtonElement
  exportBtn: HTMLButtonElement
  payloadModeSelect: HTMLSelectElement
  searchInput: HTMLInputElement
  kindFilter: HTMLSelectElement
  statusFilter: HTMLSelectElement
  traceRowFilter: HTMLSelectElement
  autoScrollBtn: HTMLButtonElement
  eventCount: HTMLElement
  droppedCount: HTMLElement
  gapCount: HTMLElement
  eventsPerSec: HTMLElement
  emptyState: HTMLElement
  eventsTable: HTMLTableElement
  eventsBody: HTMLTableSectionElement
  detailPanel: HTMLElement
  detailContent: HTMLElement
  closeDetailBtn: HTMLButtonElement
  pinDetailBtn: HTMLButtonElement
  serverBufferInput: HTMLInputElement
  applyServerBufferBtn: HTMLButtonElement
  uiBufferInput: HTMLInputElement
  applyUiBufferBtn: HTMLButtonElement
  showStatsBtn: HTMLButtonElement
  statsPanel: HTMLElement
  statsContent: HTMLElement
  closeStatsBtn: HTMLButtonElement
}

// Statistics tracking
let statsStartTime = Date.now()
let statsEventCount = 0
let serverBufferSize = 5000 // Server-side RingBuffer capacity
let uiMaxEvents = 10000 // UI-side max events to display
let lastSeqNumber = 0
let detectedGaps = 0

/**
 * Initialize inspector UI
 */
function init() {
  // WORKAROUND: document.body is null even though BODY node exists in childNodes
  // This appears to be an Electron/Chromium context issue
  // Access body directly from childNodes
  let bodyNode: HTMLElement | null = null
  if (document.documentElement) {
    for (let i = 0; i < document.documentElement.childNodes.length; i++) {
      const node = document.documentElement.childNodes[i]
      if (node.nodeName === 'BODY') {
        bodyNode = node as HTMLElement
        break
      }
    }
  }

  if (!bodyNode) {
    console.error('[Inspector UI] BODY node not found!')
    return
  }

  // Initialize DOM elements using bodyNode.querySelector
  elements = {
    body: bodyNode,
    main: bodyNode.querySelector('main') as HTMLElement,
    statusBadge: bodyNode.querySelector('#statusBadge') as HTMLElement,
    statusText: bodyNode.querySelector('#statusText') as HTMLElement,
    pauseBtn: bodyNode.querySelector('#pauseBtn') as HTMLButtonElement,
    clearBtn: bodyNode.querySelector('#clearBtn') as HTMLButtonElement,
    exportBtn: bodyNode.querySelector('#exportBtn') as HTMLButtonElement,
    payloadModeSelect: bodyNode.querySelector('#payloadModeSelect') as HTMLSelectElement,
    searchInput: bodyNode.querySelector('#searchInput') as HTMLInputElement,
    kindFilter: bodyNode.querySelector('#kindFilter') as HTMLSelectElement,
    statusFilter: bodyNode.querySelector('#statusFilter') as HTMLSelectElement,
    traceRowFilter: bodyNode.querySelector('#traceRowFilter') as HTMLSelectElement,
    autoScrollBtn: bodyNode.querySelector('#autoScrollBtn') as HTMLButtonElement,
    eventCount: bodyNode.querySelector('#eventCount') as HTMLElement,
    droppedCount: bodyNode.querySelector('#droppedCount') as HTMLElement,
    gapCount: bodyNode.querySelector('#gapCount') as HTMLElement,
    eventsPerSec: bodyNode.querySelector('#eventsPerSec') as HTMLElement,
    emptyState: bodyNode.querySelector('#emptyState') as HTMLElement,
    eventsTable: bodyNode.querySelector('#eventsTable') as HTMLTableElement,
    eventsBody: bodyNode.querySelector('#eventsBody') as HTMLTableSectionElement,
    detailPanel: bodyNode.querySelector('#detailPanel') as HTMLElement,
    detailContent: bodyNode.querySelector('#detailContent') as HTMLElement,
    closeDetailBtn: bodyNode.querySelector('#closeDetailBtn') as HTMLButtonElement,
    pinDetailBtn: bodyNode.querySelector('#pinDetailBtn') as HTMLButtonElement,
    serverBufferInput: bodyNode.querySelector('#serverBufferInput') as HTMLInputElement,
    applyServerBufferBtn: bodyNode.querySelector('#applyServerBufferBtn') as HTMLButtonElement,
    uiBufferInput: bodyNode.querySelector('#uiBufferInput') as HTMLInputElement,
    applyUiBufferBtn: bodyNode.querySelector('#applyUiBufferBtn') as HTMLButtonElement,
    showStatsBtn: bodyNode.querySelector('#showStatsBtn') as HTMLButtonElement,
    statsPanel: bodyNode.querySelector('#statsPanel') as HTMLElement,
    statsContent: bodyNode.querySelector('#statsContent') as HTMLElement,
    closeStatsBtn: bodyNode.querySelector('#closeStatsBtn') as HTMLButtonElement,
  }

  // Set initial buffer size values
  elements.serverBufferInput.value = String(serverBufferSize)
  elements.uiBufferInput.value = String(uiMaxEvents)
  traceRowFilter = elements.traceRowFilter.value as TraceRowFilter

  // Initialize virtual scrolling
  virtualScrollContainer = elements.main

  // Setup scroll listener for virtual scrolling
  if (virtualScrollContainer) {
    virtualScrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  }

  // Start statistics update interval
  setInterval(updateStatistics, 1000)

  // Start status polling from server (buffer size, dropped count, etc.)
  setInterval(pollServerStatus, 2000)
  pollServerStatus() // Initial poll

  // Check if API is available
  if (!window.inspectorAPI) {
    console.error('[Inspector UI] window.inspectorAPI is not available!')
    return
  }

  // Send HELLO to main process
  window.inspectorAPI.hello()

  // Setup event listeners
  setupEventListeners()
  updatePinButton()
  updateAutoScrollButton()

  // Listen for init message
  window.inspectorAPI.onInit((payload) => {
    allEvents = payload.events || []
    // Trim if over UI limit
    if (allEvents.length > uiMaxEvents) {
      allEvents = allEvents.slice(-uiMaxEvents)
    }
    applyFilters()
    updateStats(allEvents.length)
  })

  // Listen for live events (single)
  window.inspectorAPI.onEvent((payload) => {
    if (!isPaused) {
      const shouldRender = appendEvent(payload.event)
      statsEventCount++
      if (shouldRender) {
        scheduleRender()
      }
      updateStats(allEvents.length)
    }
  })

  // Listen for event batches
  window.inspectorAPI.onEventBatch?.((payload) => {
    if (!isPaused && payload.events && payload.events.length > 0) {
      const shouldRender = appendEventBatch(payload.events)
      statsEventCount += payload.events.length
      if (shouldRender) {
        scheduleRender()
      }
      updateStats(allEvents.length)
    }
  })

  // Listen for status updates
  window.inspectorAPI.onStatus((payload) => {
    updateStatus(payload.isTracing, payload.eventCount, payload.droppedCount, payload.payloadMode)
  })

  // Listen for command responses
  window.inspectorAPI.onCommandResponse((payload) => {
    if (!payload.success) {
      console.error('Command failed:', payload.error)
      alert(`Command failed: ${payload.error}`)
    } else if (payload.data && typeof payload.data === 'object' && 'data' in payload.data) {
      // Export command
      downloadJSON(payload.data.data as string)
    }
  })
}

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
  // Pause/Resume button
  elements.pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused
    if (isPaused) {
      window.inspectorAPI.sendCommand({ type: 'pause' })
      elements.pauseBtn.textContent = 'Resume'
      elements.statusBadge.classList.remove('active')
      elements.statusBadge.classList.add('paused')
      elements.statusText.textContent = 'Paused'
    } else {
      window.inspectorAPI.sendCommand({ type: 'resume' })
      elements.pauseBtn.textContent = 'Pause'
      elements.statusBadge.classList.remove('paused')
      elements.statusBadge.classList.add('active')
      elements.statusText.textContent = 'Active'
    }
  })

  // Clear button
  elements.clearBtn.addEventListener('click', () => {
    if (confirm('Clear all events?')) {
      window.inspectorAPI.sendCommand({ type: 'clear' })
      allEvents = []
      statsEventCount = 0
      statsStartTime = Date.now()
      lastSeqNumber = 0
      detectedGaps = 0
      elements.gapCount.style.display = 'none'
      elements.gapCount.textContent = ''
      applyFilters()
      renderNow() // Immediate render after clear
      updateStats(0)
    }
  })

  // Export button
  elements.exportBtn.addEventListener('click', () => {
    window.inspectorAPI.sendCommand({ type: 'export', format: 'json' })
  })

  // Payload mode selector
  elements.payloadModeSelect.addEventListener('change', (e) => {
    const mode = (e.target as HTMLSelectElement).value as 'none' | 'redacted' | 'full'
    window.inspectorAPI.sendCommand({ type: 'setPayloadMode', mode })
  })

  // Search input
  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
    applyFilters()
  })

  // Kind filter
  elements.kindFilter.addEventListener('change', (e) => {
    kindFilter = (e.target as HTMLSelectElement).value
    applyFilters()
  })

  // Status filter
  elements.statusFilter.addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value
    applyFilters()
  })

  // Trace row filter
  elements.traceRowFilter.addEventListener('change', (e) => {
    traceRowFilter = (e.target as HTMLSelectElement).value as TraceRowFilter
    renderRowsDirty = true
    scheduleRender()
  })

  // Close detail panel
  elements.closeDetailBtn.addEventListener('click', () => {
    closeDetailPanel()
  })

  // Server buffer size apply button
  elements.applyServerBufferBtn.addEventListener('click', () => {
    const newSize = normalizeBufferSize(elements.serverBufferInput, serverBufferSize)
    if (newSize !== null && newSize !== serverBufferSize) {
      window.inspectorAPI.sendCommand({ type: 'setBufferSize', size: newSize })
      serverBufferSize = newSize
      console.log(`[Inspector] Server buffer size set to ${newSize}`)
    }
  })

  // UI max events apply button
  elements.applyUiBufferBtn.addEventListener('click', () => {
    const newSize = normalizeBufferSize(elements.uiBufferInput, uiMaxEvents)
    if (newSize !== null && newSize !== uiMaxEvents) {
      uiMaxEvents = newSize
      const shouldRender = trimToUiLimit()
      if (shouldRender) {
        renderNow()
      }
      updateStats(allEvents.length)
      updateStatistics()
      console.log(`[Inspector UI] Max events set to ${newSize}`)
    }
  })

  // Show/hide statistics panel
  elements.showStatsBtn.addEventListener('click', () => {
    const isVisible = elements.statsPanel.style.display !== 'none'
    elements.statsPanel.style.display = isVisible ? 'none' : 'flex'
    if (!isVisible) {
      updateStatsPanel()
    }
  })

  elements.closeStatsBtn.addEventListener('click', () => {
    elements.statsPanel.style.display = 'none'
  })

  elements.pinDetailBtn.addEventListener('click', () => {
    isDetailPinned = !isDetailPinned
    updatePinButton()
  })

  elements.autoScrollBtn.addEventListener('click', () => {
    autoScrollEnabled = !autoScrollEnabled
    updateAutoScrollButton()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.detailPanel.classList.contains('visible')) {
      closeDetailPanel()
    }
  })
}

/**
 * Apply filters to events
 */
function applyFilters() {
  renderRowsDirty = true
  scheduleRender()
}

function passesFilter(event: TraceEvent): boolean {
  // Search filter
  if (searchQuery && !event.channel.toLowerCase().includes(searchQuery)) {
    return false
  }

  // Kind filter
  if (kindFilter && event.kind !== kindFilter) {
    return false
  }

  // Status filter
  if (statusFilter && event.status !== statusFilter) {
    return false
  }

  return true
}

function rebuildRenderRows() {
  const result = buildRenderRows(allEvents, passesFilter, traceRowFilter)
  renderRows = result.renderRows
  renderRowsDirty = false
}

function trimToUiLimit(): boolean {
  let changed = false
  while (allEvents.length > uiMaxEvents) {
    allEvents.shift()
    changed = true
  }
  if (changed) {
    renderRowsDirty = true
  }
  return changed
}

function appendEvent(event: TraceEvent): boolean {
  if (event.seq) detectGap(event.seq)
  allEvents.push(event)
  renderRowsDirty = true

  trimToUiLimit()
  return true
}

function appendEventBatch(events: TraceEvent[]): boolean {
  let changed = false
  for (const event of events) {
    if (event.seq) detectGap(event.seq)
    allEvents.push(event)
    changed = true
  }

  if (changed) {
    renderRowsDirty = true
  }

  if (trimToUiLimit()) {
    changed = true
  }

  return changed
}

/**
 * Schedules a render with debouncing
 */
function scheduleRender() {
  if (pendingRender) {
    return // Already scheduled
  }

  pendingRender = true

  if (renderTimeout) {
    clearTimeout(renderTimeout)
  }

  renderTimeout = setTimeout(() => {
    renderTimeout = null
    pendingRender = false
    renderEvents()
  }, RENDER_DEBOUNCE_MS)
}

/**
 * Immediately renders without debouncing
 */
function renderNow() {
  if (renderTimeout) {
    clearTimeout(renderTimeout)
    renderTimeout = null
  }
  pendingRender = false
  renderEvents()
}

/**
 * Render events table
 */
function renderEvents() {
  if (renderRowsDirty) {
    rebuildRenderRows()
  }

  const shouldStick = autoScrollEnabled && elements.main && isNearBottom(elements.main, 24)

  if (renderRows.length === 0) {
    elements.emptyState.style.display = 'flex'
    elements.eventsTable.style.display = 'none'
    return
  }

  elements.emptyState.style.display = 'none'
  elements.eventsTable.style.display = 'table'

  // Virtual scrolling: calculate visible range
  const visibleRange = calculateVisibleRange()

  // Clear existing rows
  elements.eventsBody.innerHTML = ''

  // Create virtual spacer at the top
  if (visibleRange.start > 0) {
    const spacer = document.createElement('tr')
    spacer.style.height = `${visibleRange.start * VIRTUAL_SCROLL_ITEM_HEIGHT}px`
    spacer.className = 'virtual-spacer'
    elements.eventsBody.appendChild(spacer)
  }

  // Render only visible events (oldest first)
  for (let i = visibleRange.start; i < visibleRange.end; i++) {
    const rowData = renderRows[i]
    if (!rowData) continue
    const row = createRenderRow(rowData, i)
    if (selectedRowKey && getRowKey(rowData) === selectedRowKey) {
      row.classList.add('selected')
    }
    elements.eventsBody.appendChild(row)
  }

  // Create virtual spacer at the bottom
  if (visibleRange.end < renderRows.length) {
    const spacer = document.createElement('tr')
    spacer.style.height = `${(renderRows.length - visibleRange.end) * VIRTUAL_SCROLL_ITEM_HEIGHT}px`
    spacer.className = 'virtual-spacer'
    elements.eventsBody.appendChild(spacer)
  }

  if (shouldStick) {
    scrollToBottom(elements.main)
  }
}

/**
 * Calculate visible range for virtual scrolling
 */
function calculateVisibleRange(): { start: number; end: number } {
  if (!virtualScrollContainer) {
    return { start: 0, end: renderRows.length }
  }

  const scrollTop = virtualScrollContainer.scrollTop
  const containerHeight = virtualScrollContainer.clientHeight

  const start = Math.max(
    0,
    Math.floor(scrollTop / VIRTUAL_SCROLL_ITEM_HEIGHT) - VIRTUAL_SCROLL_OVERSCAN
  )
  const visibleCount = Math.ceil(containerHeight / VIRTUAL_SCROLL_ITEM_HEIGHT)
  const end = Math.min(renderRows.length, start + visibleCount + VIRTUAL_SCROLL_OVERSCAN * 2)

  return { start, end }
}

/**
 * Handle scroll event for virtual scrolling
 */
function handleScroll() {
  if (!virtualScrollContainer) return

  const currentScrollTop = virtualScrollContainer.scrollTop
  const delta = Math.abs(currentScrollTop - lastScrollTop)

  // Only re-render if scrolled more than one row height
  if (delta > VIRTUAL_SCROLL_ITEM_HEIGHT) {
    lastScrollTop = currentScrollTop
    renderNow()
  }
}

function getRowKey(row: RenderRow): string {
  return row.type === 'trace' ? `trace:${row.traceId}` : `span:${row.spanId}`
}

function createRenderRow(row: RenderRow, index: number): HTMLTableRowElement {
  return row.type === 'trace' ? createTraceRow(row, index) : createEventRow(row, index)
}

/**
 * Create a table row for a trace group
 */
function createTraceRow(rowData: TraceRow, index: number): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.dataset.index = String(index)
  row.classList.add('trace-row')
  if (rowData.incompleteCount > 0) {
    row.classList.add('row-incomplete')
  }

  // Sequence number
  const seqCell = document.createElement('td')
  seqCell.textContent = '-'
  seqCell.style.fontFamily = 'monospace'
  seqCell.style.fontSize = '11px'
  seqCell.style.color = '#858585'
  row.appendChild(seqCell)

  // Time (trace start)
  const timeCell = document.createElement('td')
  timeCell.textContent = formatTime(rowData.tsStart)
  row.appendChild(timeCell)

  // Type
  const typeCell = document.createElement('td')
  const kindBadge = document.createElement('span')
  kindBadge.className = 'kind-badge kind-trace'
  kindBadge.textContent = 'Trace'
  typeCell.appendChild(kindBadge)
  row.appendChild(typeCell)

  // Channel (trace id + meta)
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

  // Direction
  const directionCell = document.createElement('td')
  directionCell.textContent = '-'
  row.appendChild(directionCell)

  // Role
  const roleCell = document.createElement('td')
  roleCell.textContent = '-'
  row.appendChild(roleCell)

  // Duration
  const durationCell = document.createElement('td')
  if (rowData.durationMs !== undefined) {
    durationCell.textContent = `${rowData.durationMs.toFixed(2)}ms`
  } else {
    durationCell.textContent = '-'
  }
  row.appendChild(durationCell)

  // Size
  const sizeCell = document.createElement('td')
  sizeCell.textContent = '-'
  row.appendChild(sizeCell)

  // Status
  const statusCell = document.createElement('td')
  statusCell.className = `status-badge-cell status-${rowData.status}`
  statusCell.textContent = rowData.status.toUpperCase()
  row.appendChild(statusCell)

  // Click handler
  row.addEventListener('click', () => {
    const rowKey = getRowKey(rowData)
    if (isDetailPinned && selectedRowKey && selectedRowKey !== rowKey) {
      return
    }
    selectedRowKey = rowKey
    showTraceDetailPanel(rowData)
    document.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'))
    row.classList.add('selected')
  })

  return row
}

/**
 * Create a table row for a span
 */
function createEventRow(rowData: SpanRow, index: number): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.dataset.index = String(index)
  row.classList.add('span-row')
  if (rowData.isIncomplete) {
    row.classList.add('row-incomplete')
  }

  const event = rowData.event

  // Sequence number
  const seqCell = document.createElement('td')
  seqCell.textContent = String(event.seq || '-')
  seqCell.style.fontFamily = 'monospace'
  seqCell.style.fontSize = '11px'
  seqCell.style.color = '#858585'
  row.appendChild(seqCell)

  // Time
  const timeCell = document.createElement('td')
  timeCell.textContent = formatTime(event.tsStart)
  row.appendChild(timeCell)

  // Type
  const typeCell = document.createElement('td')
  const kindBadge = document.createElement('span')
  const kindClass = event.kind.startsWith('stream') ? 'stream' : event.kind.toLowerCase()
  kindBadge.className = `kind-badge kind-${kindClass}`
  kindBadge.textContent = formatKind(event.kind)
  typeCell.appendChild(kindBadge)
  row.appendChild(typeCell)

  // Channel
  const channelCell = document.createElement('td')
  channelCell.textContent = event.channel
  channelCell.title = event.channel
  channelCell.classList.add('cell-truncate')
  const basePadding = 12
  channelCell.style.paddingLeft = `${basePadding + rowData.depth * 12}px`
  row.appendChild(channelCell)

  // Direction
  const directionCell = document.createElement('td')
  directionCell.textContent = getDisplayDirection(event)
  row.appendChild(directionCell)

  // Role
  const roleCell = document.createElement('td')
  const role = getEventRole(event)
  roleCell.textContent = role ?? '-'
  if (role) {
    roleCell.title = role
  }
  row.appendChild(roleCell)

  // Duration
  const durationCell = document.createElement('td')
  if (event.durationMs !== undefined) {
    durationCell.textContent = `${event.durationMs.toFixed(2)}ms`
  } else {
    durationCell.textContent = '-'
  }
  row.appendChild(durationCell)

  // Size
  const sizeCell = document.createElement('td')
  const bytes = getEventBytes(event)
  sizeCell.textContent = bytes ? formatBytes(bytes) : '-'
  row.appendChild(sizeCell)

  // Status
  const statusCell = document.createElement('td')
  statusCell.className = `status-badge-cell status-${event.status}`
  statusCell.textContent = event.status.toUpperCase()
  row.appendChild(statusCell)

  // Click handler
  row.addEventListener('click', () => {
    const rowKey = getRowKey(rowData)
    if (isDetailPinned && selectedRowKey && selectedRowKey !== rowKey) {
      return
    }
    selectedRowKey = rowKey
    showDetailPanel(event)
    document.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'))
    row.classList.add('selected')
  })

  return row
}

/**
 * Show detail panel for an event
 */
function showDetailPanel(event: TraceEvent) {
  openDetailPanel()

  const safeId = escapeHtml(event.id)
  const safeKind = escapeHtml(formatKind(event.kind))
  const safeChannel = escapeHtml(event.channel)
  const safeDirection = escapeHtml(getDisplayDirection(event))
  const safeStatus = escapeHtml(event.status.toUpperCase())

  let html = `
    <div class="detail-section">
      <h3>General</h3>
      <div class="detail-row">
        <div class="detail-label">ID:</div>
        <div class="detail-value">${safeId}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Type:</div>
        <div class="detail-value">${safeKind}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Channel:</div>
        <div class="detail-value">${safeChannel}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Direction:</div>
        <div class="detail-value">${safeDirection}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status:</div>
        <div class="detail-value status-${event.status}">${safeStatus}</div>
      </div>
    </div>
  `

  if (event.trace) {
    const safeTraceId = escapeHtml(event.trace.traceId)
    const safeSpanId = escapeHtml(event.trace.spanId)
    const safeParentSpanId = event.trace.parentSpanId ? escapeHtml(event.trace.parentSpanId) : null

    html += `
      <div class="detail-section">
        <h3>Trace</h3>
        <div class="detail-row">
          <div class="detail-label">Trace ID:</div>
          <div class="detail-value">${safeTraceId}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Span ID:</div>
          <div class="detail-value">${safeSpanId}</div>
        </div>
        ${
          safeParentSpanId
            ? `<div class="detail-row">
          <div class="detail-label">Parent Span:</div>
          <div class="detail-value">${safeParentSpanId}</div>
        </div>`
            : ''
        }
      </div>
    `
  }

  html += `

    <div class="detail-section">
      <h3>Timing</h3>
      <div class="detail-row">
        <div class="detail-label">Started:</div>
        <div class="detail-value">${new Date(event.tsStart).toLocaleTimeString()}.${String(event.tsStart % 1000).padStart(3, '0')}</div>
      </div>
      ${
        event.tsEnd
          ? `<div class="detail-row">
        <div class="detail-label">Ended:</div>
        <div class="detail-value">${new Date(event.tsEnd).toLocaleTimeString()}.${String(event.tsEnd % 1000).padStart(3, '0')}</div>
      </div>`
          : ''
      }
      ${
        event.durationMs !== undefined
          ? `<div class="detail-row">
        <div class="detail-label">Duration:</div>
        <div class="detail-value">${event.durationMs.toFixed(2)}ms</div>
      </div>`
          : ''
      }
    </div>
  `

  if ('source' in event && event.source) {
    html += formatEndpointSection('Source', event.source)
  }

  if ('target' in event && event.target) {
    html += formatEndpointSection('Target', event.target)
  }

  // Add type-specific sections
  if (event.kind === 'invoke' && 'request' in event) {
    if (event.request) {
      html += formatPayloadSection('Request', event.request)
    }

    if ('response' in event && event.response) {
      html += formatPayloadSection('Response', event.response)
    }

    if ('error' in event && event.error) {
      const safeError = escapeHtml(JSON.stringify(event.error, null, 2))
      html += `
        <div class="detail-section">
          <h3>Error</h3>
          <pre><code>${safeError}</code></pre>
        </div>
      `
    }
  }

  if (
    (event.kind === 'event' || event.kind === 'broadcast') &&
    'payload' in event &&
    event.payload
  ) {
    html += formatPayloadSection('Payload', event.payload)
  }

  elements.detailContent.innerHTML = html
}

/**
 * Show detail panel for a trace group
 */
function showTraceDetailPanel(traceRow: TraceRow) {
  openDetailPanel()

  const safeTraceId = escapeHtml(traceRow.traceId)
  const safeStatus = escapeHtml(traceRow.status.toUpperCase())
  const duration = traceRow.durationMs !== undefined ? `${traceRow.durationMs.toFixed(2)}ms` : '-'

  let html = `
    <div class="detail-section">
      <h3>Trace</h3>
      <div class="detail-row">
        <div class="detail-label">Trace ID:</div>
        <div class="detail-value">${safeTraceId}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status:</div>
        <div class="detail-value status-${traceRow.status}">${safeStatus}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Spans:</div>
        <div class="detail-value">${traceRow.spanCount}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Errors:</div>
        <div class="detail-value">${traceRow.errorCount}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Open spans:</div>
        <div class="detail-value">${traceRow.incompleteCount}</div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Timing</h3>
      <div class="detail-row">
        <div class="detail-label">Started:</div>
        <div class="detail-value">${new Date(traceRow.tsStart).toLocaleTimeString()}.${String(traceRow.tsStart % 1000).padStart(3, '0')}</div>
      </div>
      ${
        traceRow.tsEnd
          ? `<div class="detail-row">
        <div class="detail-label">Ended:</div>
        <div class="detail-value">${new Date(traceRow.tsEnd).toLocaleTimeString()}.${String(traceRow.tsEnd % 1000).padStart(3, '0')}</div>
      </div>`
          : ''
      }
      <div class="detail-row">
        <div class="detail-label">End-to-end:</div>
        <div class="detail-value">${duration}</div>
      </div>
    </div>
  `

  elements.detailContent.innerHTML = html
}

function openDetailPanel() {
  elements.detailPanel.classList.add('visible')
  elements.body.classList.add('detail-open')
}

function closeDetailPanel() {
  elements.detailPanel.classList.remove('visible')
  elements.body.classList.remove('detail-open')
  selectedRowKey = null
  isDetailPinned = false
  updatePinButton()
  // Remove selection highlight
  document.querySelectorAll('tr.selected').forEach((row) => {
    row.classList.remove('selected')
  })
}

/**
 * Format endpoint section for source/target details
 */
function formatEndpointSection(
  title: string,
  endpoint: { webContentsId?: number; windowId?: number; windowRole?: string }
): string {
  let html = `<div class="detail-section"><h3>${title}</h3>`

  if (endpoint.webContentsId !== undefined) {
    html += `<div class="detail-row"><div class="detail-label">WebContents ID:</div><div class="detail-value">${endpoint.webContentsId}</div></div>`
  }

  if (endpoint.windowId !== undefined) {
    html += `<div class="detail-row"><div class="detail-label">Window ID:</div><div class="detail-value">${endpoint.windowId}</div></div>`
  }

  if (endpoint.windowRole) {
    const safeRole = escapeHtml(endpoint.windowRole)
    html += `<div class="detail-row"><div class="detail-label">Window Role:</div><div class="detail-value">${safeRole}</div></div>`
  }

  html += `</div>`
  return html
}

/**
 * Format payload section for detail panel
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPayloadSection(title: string, payload: any): string {
  let html = `<div class="detail-section"><h3>${title}</h3>`

  if (payload.bytes !== undefined) {
    html += `<div class="detail-row"><div class="detail-label">Size:</div><div class="detail-value">${formatBytes(payload.bytes)}</div></div>`
  }

  if (payload.mode) {
    const safeMode = escapeHtml(String(payload.mode))
    html += `<div class="detail-row"><div class="detail-label">Mode:</div><div class="detail-value">${safeMode}</div></div>`
  }

  if (payload.summary) {
    html += `<div class="detail-row"><div class="detail-label">Summary:</div><div class="detail-value">${escapeHtml(payload.summary)}</div></div>`
  }

  if (payload.data !== undefined) {
    const safeData = escapeHtml(JSON.stringify(payload.data, null, 2))
    html += `<pre><code>${safeData}</code></pre>`
  }

  html += `</div>`
  return html
}

/**
 * Update stats display
 */
function updateStats(eventCount: number, _droppedCount?: number) {
  elements.eventCount.textContent = `${eventCount} event${eventCount !== 1 ? 's' : ''}`

  // Show detected gaps (events that never reached UI)
  if (detectedGaps > 0) {
    elements.droppedCount.textContent = `(${detectedGaps} gaps)`
    elements.droppedCount.style.color = '#f48771'
  } else {
    elements.droppedCount.textContent = ''
  }
}

/**
 * Update status display
 */
/**
 * Update status display
 */
function updateStatus(
  isTracing: boolean,
  _eventCount: number,
  _droppedCount?: number,
  payloadMode?: 'none' | 'redacted' | 'full'
) {
  if (!isTracing && !isPaused) {
    elements.statusBadge.classList.remove('active')
    elements.statusBadge.classList.add('paused')
    elements.statusText.textContent = 'Paused'
    elements.pauseBtn.textContent = 'Resume'
    isPaused = true
  } else if (isTracing && isPaused) {
    elements.statusBadge.classList.remove('paused')
    elements.statusBadge.classList.add('active')
    elements.statusText.textContent = 'Active'
    elements.pauseBtn.textContent = 'Pause'
    isPaused = false
  }

  // Note: We ignore droppedCount from server - only show UI gaps
  updateStats(allEvents.length)

  // Update payload mode selector
  if (payloadMode && elements.payloadModeSelect.value !== payloadMode) {
    elements.payloadModeSelect.value = payloadMode
  }
}

/**
 * Format timestamp
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.toLocaleTimeString()}.${String(timestamp % 1000).padStart(3, '0')}`
}

/**
 * Format trace kind
 */
function formatKind(kind: string): string {
  switch (kind) {
    case 'invoke':
      return 'Invoke'
    case 'event':
      return 'Event'
    case 'broadcast':
      return 'Broadcast'
    case 'streamInvoke':
      return 'Stream Invoke'
    case 'streamUpload':
      return 'Stream Upload'
    case 'streamDownload':
      return 'Stream Download'
    default:
      return kind
  }
}

function getDisplayDirection(event: TraceEvent): string {
  if (event.kind !== 'invoke') {
    return event.direction
  }

  const isComplete = Boolean(event.tsEnd || event.response || event.status === 'error')
  return isComplete ? 'renderer→main→renderer' : 'renderer→main'
}

function updatePinButton() {
  elements.pinDetailBtn.textContent = isDetailPinned ? 'Pinned' : 'Pin'
  elements.pinDetailBtn.classList.toggle('toggle-active', isDetailPinned)
}

function updateAutoScrollButton() {
  elements.autoScrollBtn.textContent = autoScrollEnabled ? 'Auto-scroll: On' : 'Auto-scroll: Off'
  elements.autoScrollBtn.classList.toggle('toggle-active', autoScrollEnabled)
}

/**
 * Poll server status (buffer size, event count)
 */
async function pollServerStatus() {
  try {
    const status = await window.inspectorAPI.getStatus()
    if (status) {
      // Update server buffer size if changed
      if (typeof status.bufferCapacity === 'number' && status.bufferCapacity !== serverBufferSize) {
        serverBufferSize = status.bufferCapacity
        elements.serverBufferInput.value = String(serverBufferSize)
      }

      // Note: We don't show status.droppedCount from server
      // Only show gaps detected in UI (detectedGaps) via updateStats()
    }
  } catch {
    // Ignore errors - server might not support getStatus yet
  }
}

/**
 * Detect sequence number gaps
 */
function detectGap(seq: number) {
  if (!seq) return

  if (lastSeqNumber > 0 && seq > lastSeqNumber + 1) {
    const gap = seq - lastSeqNumber - 1
    detectedGaps += gap
    console.warn(
      `[Inspector] Gap detected: missing ${gap} events (${lastSeqNumber + 1} to ${seq - 1})`
    )

    // Show gap indicator
    elements.gapCount.style.display = 'inline-block'
    elements.gapCount.textContent = `⚠ ${detectedGaps} gaps`
  }

  lastSeqNumber = Math.max(lastSeqNumber, seq)
}

/**
 * Update statistics display
 */
function updateStatistics() {
  const now = Date.now()
  const elapsed = (now - statsStartTime) / 1000 // seconds

  // Calculate events/second
  const eventsPerSec = elapsed > 0 ? Math.round(statsEventCount / elapsed) : 0
  elements.eventsPerSec.textContent = `${eventsPerSec}/s`

  // Color-code events/sec
  elements.eventsPerSec.classList.remove('warning', 'danger')
  if (eventsPerSec > 500) {
    elements.eventsPerSec.classList.add('danger')
  } else if (eventsPerSec > 200) {
    elements.eventsPerSec.classList.add('warning')
  }

  // Update stats panel if visible
  if (elements.statsPanel.style.display !== 'none') {
    updateStatsPanel()
  }
}

/**
 * Update statistics panel with channel breakdown
 */
function updateStatsPanel() {
  const filteredEvents = allEvents.filter(passesFilter)
  const metrics = computeMetrics(filteredEvents)
  if (metrics.length === 0) {
    elements.statsContent.innerHTML =
      '<p style="color: #888; text-align: center; padding: 20px">No data for current filters</p>'
    return
  }

  let html = `
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Channel</th>
          <th>Kind</th>
          <th>Count</th>
          <th>Errors</th>
          <th>Error %</th>
          <th>p50</th>
          <th>p95</th>
          <th>Bytes</th>
          <th>Throughput</th>
        </tr>
      </thead>
      <tbody>
  `

  for (const metric of metrics) {
    const safeChannel = escapeHtml(metric.channel)
    const safeKind = escapeHtml(formatKind(metric.kind))
    const errorRate = formatPercent(metric.errorRate)
    const p50 = formatDuration(metric.p50)
    const p95 = formatDuration(metric.p95)
    const bytes = metric.bytes > 0 ? formatBytes(metric.bytes) : '-'
    const throughput =
      metric.throughputBps !== undefined ? `${formatBytes(metric.throughputBps)}/s` : '-'

    html += `
      <tr class="${metric.errorCount > 0 ? 'metric-row-error' : ''}">
        <td class="metric-channel">${safeChannel}</td>
        <td>${safeKind}</td>
        <td class="metric-number">${metric.count}</td>
        <td class="metric-number">${metric.errorCount}</td>
        <td class="metric-number">${errorRate}</td>
        <td class="metric-number">${p50}</td>
        <td class="metric-number">${p95}</td>
        <td class="metric-number">${bytes}</td>
        <td class="metric-number">${throughput}</td>
      </tr>
    `
  }

  html += '</tbody></table>'
  elements.statsContent.innerHTML = html
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDuration(value?: number): string {
  if (value === undefined) return '-'
  return `${value.toFixed(2)}ms`
}

function isNearBottom(element: HTMLElement, threshold: number): boolean {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - threshold
}

function scrollToBottom(element: HTMLElement) {
  element.scrollTop = element.scrollHeight
}

/**
 * Resolve role label for the main list
 */
function getEventRole(event: TraceEvent): string | undefined {
  if (event.direction === 'renderer→main' && 'source' in event) {
    return event.source?.windowRole
  }
  if (event.direction === 'main→renderer' && 'target' in event) {
    return event.target?.windowRole
  }
  if ('source' in event && event.source?.windowRole) {
    return event.source.windowRole
  }
  if ('target' in event && event.target?.windowRole) {
    return event.target.windowRole
  }
  return undefined
}

/**
 * Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Get total bytes for an event
 */
function getEventBytes(event: TraceEvent): number | undefined {
  if (event.kind === 'invoke' && 'request' in event) {
    const reqBytes = event.request?.bytes || 0
    const resBytes = event.response?.bytes || 0
    return reqBytes + resBytes
  }

  if ('payload' in event && event.payload) {
    return event.payload.bytes
  }

  // Stream events
  if (event.kind === 'streamInvoke' && 'stream' in event) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (event.stream as any)?.bytes || 0
  }

  if ((event.kind === 'streamUpload' || event.kind === 'streamDownload') && 'data' in event) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (event.data as any)?.bytes || 0
  }

  return undefined
}

/**
 * Download JSON export
 */
function downloadJSON(data: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ipc-trace-${Date.now()}.json`
  const body = elements.body || document.body || document.documentElement
  if (!body) return
  body.appendChild(a)
  a.click()
  body.removeChild(a)
  URL.revokeObjectURL(url)
}

function normalizeBufferSize(input: HTMLInputElement, fallback: number): number | null {
  const parsed = Number.parseInt(input.value, 10)
  if (Number.isNaN(parsed)) {
    input.value = String(fallback)
    return null
  }
  const clamped = Math.min(100000, Math.max(100, parsed))
  input.value = String(clamped)
  return clamped
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Initialize when DOM is ready
if (document.readyState === 'complete') {
  init()
} else {
  window.addEventListener('load', init)
}

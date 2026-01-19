/// <reference lib="dom" />

/**
 * Inspector UI Renderer
 *
 * Main logic for the inspector UI
 */

import type { TraceEvent } from '../types'
import type { InspectorAPI } from './preload'

// Extend Window interface for TypeScript
declare global {
  interface Window {
    inspectorAPI: InspectorAPI
  }
}

// State
let allEvents: TraceEvent[] = []
let filteredEvents: TraceEvent[] = []
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let selectedEvent: TraceEvent | null = null
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

// Virtual scrolling state
const VIRTUAL_SCROLL_ITEM_HEIGHT = 32 // Height of one table row in pixels
const VIRTUAL_SCROLL_OVERSCAN = 10 // Extra rows to render above/below viewport
let virtualScrollContainer: HTMLElement | null = null
let virtualScrollViewport: HTMLElement | null = null
let lastScrollTop = 0

// DOM Elements - will be initialized in init()
let elements: {
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
  autoScrollBtn: HTMLButtonElement
  eventCount: HTMLElement
  droppedCount: HTMLElement
  gapCount: HTMLElement
  bufferUsage: HTMLElement
  eventsPerSec: HTMLElement
  emptyState: HTMLElement
  eventsTable: HTMLTableElement
  eventsBody: HTMLTableSectionElement
  detailPanel: HTMLElement
  detailContent: HTMLElement
  closeDetailBtn: HTMLButtonElement
  pinDetailBtn: HTMLButtonElement
  bufferSizeInput: HTMLInputElement
  applyBufferBtn: HTMLButtonElement
  showStatsBtn: HTMLButtonElement
  statsPanel: HTMLElement
  statsContent: HTMLElement
  closeStatsBtn: HTMLButtonElement
}

// Statistics tracking
let statsStartTime = Date.now()
let statsEventCount = 0
let maxBufferSize = 5000
let statsInterval: ReturnType<typeof setInterval> | null = null
let statusPollInterval: ReturnType<typeof setInterval> | null = null
let lastSeqNumber = 0
let detectedGaps = 0

// Channel statistics
interface ChannelStats {
  count: number
  errors: number
  totalDuration: number
}
const channelStats = new Map<string, ChannelStats>()

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
    autoScrollBtn: bodyNode.querySelector('#autoScrollBtn') as HTMLButtonElement,
    eventCount: bodyNode.querySelector('#eventCount') as HTMLElement,
    droppedCount: bodyNode.querySelector('#droppedCount') as HTMLElement,
    gapCount: bodyNode.querySelector('#gapCount') as HTMLElement,
    bufferUsage: bodyNode.querySelector('#bufferUsage') as HTMLElement,
    eventsPerSec: bodyNode.querySelector('#eventsPerSec') as HTMLElement,
    emptyState: bodyNode.querySelector('#emptyState') as HTMLElement,
    eventsTable: bodyNode.querySelector('#eventsTable') as HTMLTableElement,
    eventsBody: bodyNode.querySelector('#eventsBody') as HTMLTableSectionElement,
    detailPanel: bodyNode.querySelector('#detailPanel') as HTMLElement,
    detailContent: bodyNode.querySelector('#detailContent') as HTMLElement,
    closeDetailBtn: bodyNode.querySelector('#closeDetailBtn') as HTMLButtonElement,
    pinDetailBtn: bodyNode.querySelector('#pinDetailBtn') as HTMLButtonElement,
    bufferSizeInput: bodyNode.querySelector('#bufferSizeInput') as HTMLInputElement,
    applyBufferBtn: bodyNode.querySelector('#applyBufferBtn') as HTMLButtonElement,
    showStatsBtn: bodyNode.querySelector('#showStatsBtn') as HTMLButtonElement,
    statsPanel: bodyNode.querySelector('#statsPanel') as HTMLElement,
    statsContent: bodyNode.querySelector('#statsContent') as HTMLElement,
    closeStatsBtn: bodyNode.querySelector('#closeStatsBtn') as HTMLButtonElement,
  }

  // Set initial buffer size value
  elements.bufferSizeInput.value = String(maxBufferSize)

  // Initialize virtual scrolling
  virtualScrollContainer = elements.main
  virtualScrollViewport = elements.eventsBody.parentElement as HTMLElement // table wrapper

  // Setup scroll listener for virtual scrolling
  if (virtualScrollContainer) {
    virtualScrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  }

  // Start statistics update interval
  statsInterval = setInterval(updateStatistics, 1000)

  // Start status polling from server (buffer size, dropped count, etc.)
  statusPollInterval = setInterval(pollServerStatus, 2000)
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
    applyFilters()
    updateStats(payload.events?.length || 0)
  })

  // Listen for live events (single)
  window.inspectorAPI.onEvent((payload) => {
    if (!isPaused) {
      if (payload.event.seq) detectGap(payload.event.seq)
      trackChannelStats(payload.event)
      allEvents.push(payload.event)
      statsEventCount++
      applyFilters()
      updateStats(allEvents.length)
    }
  })

  // Listen for event batches
  window.inspectorAPI.onEventBatch?.((payload) => {
    if (!isPaused && payload.events && payload.events.length > 0) {
      payload.events.forEach((event) => {
        if (event.seq) detectGap(event.seq)
        trackChannelStats(event)
      })
      allEvents.push(...payload.events)
      statsEventCount += payload.events.length
      applyFilters()
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
      channelStats.clear()
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

  // Close detail panel
  elements.closeDetailBtn.addEventListener('click', () => {
    closeDetailPanel()
  })

  // Buffer size apply button
  elements.applyBufferBtn.addEventListener('click', () => {
    const newSize = parseInt(elements.bufferSizeInput.value)
    if (newSize >= 100 && newSize <= 100000) {
      window.inspectorAPI.sendCommand({ type: 'setBufferSize', size: newSize })
      maxBufferSize = newSize
      console.log(`[Inspector] Buffer size set to ${newSize}`)
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
  filteredEvents = allEvents.filter((event) => {
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
  })

  scheduleRender()
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
  const shouldStick = autoScrollEnabled && elements.main && isNearBottom(elements.main, 24)

  if (filteredEvents.length === 0) {
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

  // Render only visible events (most recent first)
  const events = [...filteredEvents].reverse()
  const visibleEvents = events.slice(visibleRange.start, visibleRange.end)

  visibleEvents.forEach((event, idx) => {
    const actualIndex = visibleRange.start + idx
    const row = createEventRow(event, actualIndex)
    if (selectedEvent && event.id === selectedEvent.id) {
      row.classList.add('selected')
    }
    elements.eventsBody.appendChild(row)
  })

  // Create virtual spacer at the bottom
  if (visibleRange.end < events.length) {
    const spacer = document.createElement('tr')
    spacer.style.height = `${(events.length - visibleRange.end) * VIRTUAL_SCROLL_ITEM_HEIGHT}px`
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
    return { start: 0, end: filteredEvents.length }
  }

  const scrollTop = virtualScrollContainer.scrollTop
  const containerHeight = virtualScrollContainer.clientHeight

  const start = Math.max(
    0,
    Math.floor(scrollTop / VIRTUAL_SCROLL_ITEM_HEIGHT) - VIRTUAL_SCROLL_OVERSCAN
  )
  const visibleCount = Math.ceil(containerHeight / VIRTUAL_SCROLL_ITEM_HEIGHT)
  const end = Math.min(filteredEvents.length, start + visibleCount + VIRTUAL_SCROLL_OVERSCAN * 2)

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

/**
 * Create a table row for an event
 */
function createEventRow(event: TraceEvent, index: number): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.dataset.index = String(index)

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
  row.appendChild(channelCell)

  // Direction
  const directionCell = document.createElement('td')
  directionCell.textContent = event.direction
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
    if (isDetailPinned && selectedEvent && selectedEvent.id !== event.id) {
      return
    }
    selectedEvent = event
    showDetailPanel(event)
    // Highlight selected row
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

  let html = `
    <div class="detail-section">
      <h3>General</h3>
      <div class="detail-row">
        <div class="detail-label">ID:</div>
        <div class="detail-value">${event.id}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Type:</div>
        <div class="detail-value">${formatKind(event.kind)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Channel:</div>
        <div class="detail-value">${event.channel}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Direction:</div>
        <div class="detail-value">${event.direction}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status:</div>
        <div class="detail-value status-${event.status}">${event.status.toUpperCase()}</div>
      </div>
    </div>

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
      html += `
        <div class="detail-section">
          <h3>Error</h3>
          <pre><code>${JSON.stringify(event.error, null, 2)}</code></pre>
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

function openDetailPanel() {
  elements.detailPanel.classList.add('visible')
  document.body.classList.add('detail-open')
}

function closeDetailPanel() {
  elements.detailPanel.classList.remove('visible')
  document.body.classList.remove('detail-open')
  selectedEvent = null
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
    html += `<div class="detail-row"><div class="detail-label">Window Role:</div><div class="detail-value">${endpoint.windowRole}</div></div>`
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
    html += `<div class="detail-row"><div class="detail-label">Mode:</div><div class="detail-value">${payload.mode}</div></div>`
  }

  if (payload.summary) {
    html += `<div class="detail-row"><div class="detail-label">Summary:</div><div class="detail-value">${escapeHtml(payload.summary)}</div></div>`
  }

  if (payload.data) {
    html += `<pre><code>${JSON.stringify(payload.data, null, 2)}</code></pre>`
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
  eventCount: number,
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
  updateStats(eventCount)

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

function updatePinButton() {
  elements.pinDetailBtn.textContent = isDetailPinned ? 'Pinned' : 'Pin'
  elements.pinDetailBtn.classList.toggle('toggle-active', isDetailPinned)
}

function updateAutoScrollButton() {
  elements.autoScrollBtn.textContent = autoScrollEnabled ? 'Auto-scroll: On' : 'Auto-scroll: Off'
  elements.autoScrollBtn.classList.toggle('toggle-active', autoScrollEnabled)
}

/**
 * Poll server status (buffer size, dropped events)
 */
async function pollServerStatus() {
  try {
    const status = await window.inspectorAPI.getStatus()
    if (status) {
      // Update buffer size if changed
      if (status.bufferCapacity && status.bufferCapacity !== maxBufferSize) {
        maxBufferSize = status.bufferCapacity
      }
      // Note: We don't show status.droppedCount from server
      // Only show gaps detected in UI (detectedGaps) via updateStats()
    }
  } catch (error) {
    // Ignore errors - server might not support getStatus yet
  }
}

/**
 * Track channel statistics
 */
function trackChannelStats(event: TraceEvent) {
  const stats = channelStats.get(event.channel) || { count: 0, errors: 0, totalDuration: 0 }
  stats.count++
  if (event.status === 'error') stats.errors++
  if (event.durationMs) stats.totalDuration += event.durationMs
  channelStats.set(event.channel, stats)
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

  // Update buffer usage
  const currentCount = allEvents.length
  const usage = maxBufferSize > 0 ? (currentCount / maxBufferSize) * 100 : 0
  elements.bufferUsage.textContent = `${currentCount}/${maxBufferSize}`

  // Color-code buffer usage with early warning
  elements.bufferUsage.classList.remove('warning', 'danger')
  if (usage > 90) {
    elements.bufferUsage.classList.add('danger')
    elements.bufferUsage.title = 'Buffer critical! Consider increasing size or enabling filters'
  } else if (usage > 80) {
    elements.bufferUsage.classList.add('warning')
    elements.bufferUsage.title = 'Buffer filling up - take action soon'
  } else {
    elements.bufferUsage.title = 'Buffer usage'
  }

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
  if (channelStats.size === 0) {
    elements.statsContent.innerHTML =
      '<p style="color: #888; text-align: center; padding: 20px">No data yet</p>'
    return
  }

  // Sort channels by count
  const sortedChannels = Array.from(channelStats.entries()).sort((a, b) => b[1].count - a[1].count)

  let html = ''
  for (const [channel, stats] of sortedChannels) {
    const avgDuration = stats.count > 0 ? (stats.totalDuration / stats.count).toFixed(2) : '0'
    const errorRate = stats.count > 0 ? ((stats.errors / stats.count) * 100).toFixed(1) : '0'
    const hasErrors = stats.errors > 0

    html += `
      <div class="channel-stat ${hasErrors ? 'has-errors' : ''}">
        <div class="channel-name">${channel}</div>
        <div class="channel-metrics">
          <span class="channel-metric">📊 ${stats.count} calls</span>
          ${stats.errors > 0 ? `<span class="channel-metric" style="color: #f48771">❌ ${stats.errors} errors (${errorRate}%)</span>` : ''}
          ${stats.totalDuration > 0 ? `<span class="channel-metric">⏱ ${avgDuration}ms avg</span>` : ''}
        </div>
      </div>
    `
  }

  elements.statsContent.innerHTML = html
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
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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

import { computeMetrics } from '../metrics'
import { elements } from './renderer.dom'
import { passesFilter, state } from './renderer.state'
import { updateTraceToggleButton } from './renderer.controls'
import {
  escapeHtml,
  formatBytes,
  formatDuration,
  formatKind,
  formatPercent,
} from './renderer.utils'

export function updateStats(eventCount: number) {
  elements.eventCount.textContent = `${eventCount} event${eventCount !== 1 ? 's' : ''}`

  if (state.detectedGaps > 0) {
    elements.droppedCount.textContent = `(${state.detectedGaps} gaps)`
    elements.droppedCount.style.color = '#f48771'
  } else {
    elements.droppedCount.textContent = ''
  }
}

export function updateStatus(
  isTracing: boolean,
  _eventCount: number,
  _droppedCount?: number,
  payloadMode?: 'none' | 'redacted' | 'full',
  traceEnabledFromServer?: boolean
) {
  if (typeof traceEnabledFromServer === 'boolean') {
    state.traceEnabled = traceEnabledFromServer
    updateTraceToggleButton()
  }

  elements.pauseBtn.disabled = !state.traceEnabled

  if (!state.traceEnabled) {
    elements.statusBadge.classList.remove('active', 'paused')
    elements.statusBadge.classList.add('disabled')
    elements.statusText.textContent = 'Trace Off'
  } else {
    elements.statusBadge.classList.remove('disabled')
    if (isTracing) {
      elements.statusBadge.classList.remove('paused')
      elements.statusBadge.classList.add('active')
      elements.statusText.textContent = 'Active'
      elements.pauseBtn.textContent = 'Pause'
      state.isPaused = false
    } else {
      elements.statusBadge.classList.remove('active')
      elements.statusBadge.classList.add('paused')
      elements.statusText.textContent = 'Paused'
      elements.pauseBtn.textContent = 'Resume'
      state.isPaused = true
    }
  }

  updateStats(state.allEvents.length)

  if (payloadMode && elements.payloadModeSelect.value !== payloadMode) {
    elements.payloadModeSelect.value = payloadMode
  }
}

export function updateStatistics() {
  const now = Date.now()
  const elapsed = (now - state.statsStartTime) / 1000

  const eventsPerSec = elapsed > 0 ? Math.round(state.statsEventCount / elapsed) : 0
  elements.eventsPerSec.textContent = `${eventsPerSec}/s`

  elements.eventsPerSec.classList.remove('warning', 'danger')
  if (eventsPerSec > 500) {
    elements.eventsPerSec.classList.add('danger')
  } else if (eventsPerSec > 200) {
    elements.eventsPerSec.classList.add('warning')
  }

  if (elements.statsPanel.style.display !== 'none') {
    updateStatsPanel()
  }
}

export function updateStatsPanel() {
  const filteredEvents = state.allEvents.filter(passesFilter)
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

export async function pollServerStatus() {
  try {
    const status = await window.inspectorAPI.getStatus()
    if (status) {
      updateStatus(
        status.isTracing,
        status.eventCount,
        status.droppedCount,
        status.payloadMode,
        status.traceEnabled
      )

      if (
        typeof status.bufferCapacity === 'number' &&
        status.bufferCapacity !== state.serverBufferSize
      ) {
        state.serverBufferSize = status.bufferCapacity
        elements.serverBufferInput.value = String(state.serverBufferSize)
      }
    }
  } catch {
    // Ignore errors - server might not support getStatus yet
  }
}

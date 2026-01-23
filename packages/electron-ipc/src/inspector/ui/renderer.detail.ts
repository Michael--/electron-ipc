/* eslint-disable @typescript-eslint/no-explicit-any */

import type { TraceEvent } from '../types'
import type { TraceRow } from './trace-grouping'
import { elements } from './renderer.dom'
import { state } from './renderer.state'
import { updatePinButton } from './renderer.controls'
import { escapeHtml, formatBytes, formatKind, getDisplayDirection } from './renderer.utils'

export function showDetailPanel(event: TraceEvent) {
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

export function showTraceDetailPanel(traceRow: TraceRow) {
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

export function openDetailPanel() {
  elements.detailPanel.classList.add('visible')
  elements.body.classList.add('detail-open')
}

export function closeDetailPanel() {
  elements.detailPanel.classList.remove('visible')
  elements.body.classList.remove('detail-open')
  state.selectedRowKey = null
  state.isDetailPinned = false
  updatePinButton()
  document.querySelectorAll('tr.selected').forEach((row) => {
    row.classList.remove('selected')
  })
}

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

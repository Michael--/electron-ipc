import type { TraceEvent } from '../types'
import { elements } from './renderer.dom'

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.toLocaleTimeString()}.${String(timestamp % 1000).padStart(3, '0')}`
}

export function formatKind(kind: string): string {
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

export function getDisplayDirection(event: TraceEvent): string {
  if (event.kind !== 'invoke') {
    return event.direction
  }

  const isComplete = Boolean(event.tsEnd || event.response || event.status === 'error')
  return isComplete ? 'renderer→main→renderer' : 'renderer→main'
}

export function getEventRole(event: TraceEvent): string | undefined {
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function getEventBytes(event: TraceEvent): number | undefined {
  if (event.kind === 'invoke' && 'request' in event) {
    const reqBytes = event.request?.bytes || 0
    const resBytes = event.response?.bytes || 0
    return reqBytes + resBytes
  }

  if ('payload' in event && event.payload) {
    return event.payload.bytes
  }

  if (event.kind === 'streamInvoke' && 'stream' in event) {
    return (event.stream as { bytes?: number } | undefined)?.bytes || 0
  }

  if ((event.kind === 'streamUpload' || event.kind === 'streamDownload') && 'data' in event) {
    return (event.data as { bytes?: number } | undefined)?.bytes || 0
  }

  return undefined
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatDuration(value?: number): string {
  if (value === undefined) return '-'
  return `${value.toFixed(2)}ms`
}

export function isNearBottom(element: HTMLElement, threshold: number): boolean {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - threshold
}

export function scrollToBottom(element: HTMLElement) {
  element.scrollTop = element.scrollHeight
}

export function downloadJSON(data: string) {
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

export function normalizeBufferSize(input: HTMLInputElement, fallback: number): number | null {
  const parsed = Number.parseInt(input.value, 10)
  if (Number.isNaN(parsed)) {
    input.value = String(fallback)
    return null
  }
  const clamped = Math.min(100000, Math.max(100, parsed))
  input.value = String(clamped)
  return clamped
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

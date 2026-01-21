import type { PayloadPreview, TraceEvent, TraceKind } from './types'

export interface MetricsRow {
  channel: string
  kind: TraceKind
  count: number
  errorCount: number
  errorRate: number
  p50?: number
  p95?: number
  bytes: number
  throughputBps?: number
}

interface MetricsBucket {
  channel: string
  kind: TraceKind
  count: number
  errorCount: number
  durations: number[]
  bytes: number
  streamBytes: number
  streamStart?: number
  streamEnd?: number
}

const STREAM_KINDS: TraceKind[] = ['streamInvoke', 'streamUpload', 'streamDownload']

function isStreamKind(kind: TraceKind): boolean {
  return STREAM_KINDS.includes(kind)
}

function isInvokeComplete(event: TraceEvent): boolean {
  if (event.kind !== 'invoke') return false
  if (event.tsEnd !== undefined) return true
  if ('response' in event && event.response) return true
  return event.status === 'error'
}

function isStreamCompletion(event: TraceEvent): boolean {
  if (!isStreamKind(event.kind)) return false
  const status = (event as { status?: string }).status
  return status !== 'streaming'
}

function getDurationMs(event: TraceEvent): number | undefined {
  if (typeof event.durationMs === 'number') return event.durationMs
  if (typeof event.tsEnd === 'number') return event.tsEnd - event.tsStart
  return undefined
}

function getPayloadBytes(preview?: PayloadPreview): number {
  return typeof preview?.bytes === 'number' ? preview.bytes : 0
}

function getStreamChunkBytes(event: TraceEvent): number {
  if (event.kind === 'streamInvoke' && 'stream' in event) {
    return getPayloadBytes((event as { stream?: PayloadPreview }).stream)
  }
  if ((event.kind === 'streamUpload' || event.kind === 'streamDownload') && 'data' in event) {
    return getPayloadBytes((event as { data?: PayloadPreview }).data)
  }
  return 0
}

function getEventBytes(event: TraceEvent): number {
  if (event.kind === 'invoke') {
    return getPayloadBytes(event.request) + getPayloadBytes(event.response)
  }

  if ('payload' in event) {
    return getPayloadBytes(event.payload)
  }

  if (event.kind === 'streamInvoke') {
    return (
      getPayloadBytes((event as { request?: PayloadPreview }).request) + getStreamChunkBytes(event)
    )
  }

  if (event.kind === 'streamUpload') {
    return (
      getPayloadBytes((event as { request?: PayloadPreview }).request) + getStreamChunkBytes(event)
    )
  }

  if (event.kind === 'streamDownload') {
    return getStreamChunkBytes(event)
  }

  return 0
}

function percentile(values: number[], p: number): number | undefined {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil(p * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

export function computeMetrics(events: TraceEvent[]): MetricsRow[] {
  const buckets = new Map<string, MetricsBucket>()

  for (const event of events) {
    const key = `${event.channel}:${event.kind}`
    const bucket = buckets.get(key) ?? {
      channel: event.channel,
      kind: event.kind,
      count: 0,
      errorCount: 0,
      durations: [],
      bytes: 0,
      streamBytes: 0,
    }

    const isCountable =
      event.kind === 'invoke'
        ? isInvokeComplete(event)
        : isStreamKind(event.kind)
          ? isStreamCompletion(event)
          : true

    if (isCountable) {
      bucket.count += 1
      if (event.status === 'error') {
        bucket.errorCount += 1
      }
      const duration = getDurationMs(event)
      if (typeof duration === 'number') {
        bucket.durations.push(duration)
      }
      if (event.kind !== 'invoke' || isInvokeComplete(event)) {
        bucket.bytes += getEventBytes(event)
      }
    } else if (isStreamKind(event.kind)) {
      bucket.bytes += getEventBytes(event)
    }

    if (isStreamKind(event.kind)) {
      const streamBytes = getStreamChunkBytes(event)
      if (streamBytes > 0) {
        bucket.streamBytes += streamBytes
        bucket.streamStart = Math.min(bucket.streamStart ?? event.tsStart, event.tsStart)
        bucket.streamEnd = Math.max(bucket.streamEnd ?? event.tsStart, event.tsStart)
      }
    }

    buckets.set(key, bucket)
  }

  const rows = Array.from(buckets.values()).map((bucket) => {
    const errorRate = bucket.count > 0 ? bucket.errorCount / bucket.count : 0
    const p50 = percentile(bucket.durations, 0.5)
    const p95 = percentile(bucket.durations, 0.95)
    let throughputBps: number | undefined
    if (
      isStreamKind(bucket.kind) &&
      bucket.streamBytes > 0 &&
      bucket.streamStart !== undefined &&
      bucket.streamEnd !== undefined &&
      bucket.streamEnd > bucket.streamStart
    ) {
      const durationSec = (bucket.streamEnd - bucket.streamStart) / 1000
      throughputBps = Math.round(bucket.streamBytes / durationSec)
    }

    return {
      channel: bucket.channel,
      kind: bucket.kind,
      count: bucket.count,
      errorCount: bucket.errorCount,
      errorRate,
      p50,
      p95,
      bytes: bucket.bytes,
      throughputBps,
    }
  })

  rows.sort((a, b) => b.count - a.count || a.channel.localeCompare(b.channel))
  return rows
}

import type { InvokeTrace, TraceEvent, TraceStatus } from '../types'

export type TraceRowFilter = 'all' | 'errors' | 'hidden'

export type TraceRow = {
  type: 'trace'
  traceId: string
  tsStart: number
  tsEnd?: number
  durationMs?: number
  status: TraceStatus
  spanCount: number
  errorCount: number
  incompleteCount: number
}

export type SpanRow = {
  type: 'span'
  event: TraceEvent
  depth: number
  isIncomplete: boolean
  traceId: string
  spanId: string
}

export type RenderRow = TraceRow | SpanRow

type SpanAggregate = {
  traceId: string
  spanId: string
  parentSpanId?: string
  events: TraceEvent[]
  tsStart: number
  tsEnd?: number
}

type SpanNode = {
  event: TraceEvent
  traceId: string
  spanId: string
  parentSpanId?: string
  tsStart: number
  tsEnd?: number
}

export function buildRenderRows(
  events: TraceEvent[],
  passesFilter: (event: TraceEvent) => boolean,
  traceRowFilter: TraceRowFilter
): { filteredEvents: TraceEvent[]; renderRows: RenderRow[] } {
  const spanSummaries = buildSpanSummaries(events)
  const filteredEvents = spanSummaries.filter((event) => passesFilter(event))
  const renderRows = applyTraceRowFilter(buildTraceRows(filteredEvents), traceRowFilter)
  return { filteredEvents, renderRows }
}

function buildSpanSummaries(events: TraceEvent[]): TraceEvent[] {
  const spanMap = new Map<string, SpanAggregate>()

  for (const event of events) {
    const traceId = event.trace?.traceId ?? event.id
    const spanId = event.trace?.spanId ?? event.id
    const parentSpanId = event.trace?.parentSpanId
    const key = `${traceId}:${spanId}`

    let span = spanMap.get(key)
    if (!span) {
      span = {
        traceId,
        spanId,
        parentSpanId,
        events: [],
        tsStart: event.tsStart,
      }
      spanMap.set(key, span)
    }

    if (!span.parentSpanId && parentSpanId) {
      span.parentSpanId = parentSpanId
    }

    span.events.push(event)
    span.tsStart = Math.min(span.tsStart, event.tsStart)
    if (event.tsEnd !== undefined) {
      span.tsEnd = span.tsEnd === undefined ? event.tsEnd : Math.max(span.tsEnd, event.tsEnd)
    }
  }

  const summaries: TraceEvent[] = []
  for (const span of spanMap.values()) {
    summaries.push(buildSpanSummary(span))
  }

  summaries.sort((a, b) => a.tsStart - b.tsStart)
  return summaries
}

function buildSpanSummary(span: SpanAggregate): TraceEvent {
  const ordered = [...span.events].sort((a, b) => a.tsStart - b.tsStart)
  const base = ordered[0]
  const status = getAggregateStatus(span.events)

  const summary: TraceEvent = {
    ...base,
    id: span.spanId,
    tsStart: span.tsStart,
    tsEnd: span.tsEnd,
    durationMs: span.tsEnd !== undefined ? span.tsEnd - span.tsStart : undefined,
    status,
    trace: buildTraceEnvelope(span, base.trace),
  }

  if (summary.kind === 'invoke') {
    const invokeEvents = span.events.filter(
      (event): event is InvokeTrace => event.kind === 'invoke'
    )
    const request = invokeEvents.find((event) => event.request)?.request
    const response = invokeEvents.find((event) => event.response)?.response
    const error = invokeEvents.find((event) => event.error)?.error

    if (request) {
      ;(summary as InvokeTrace).request = request
    }
    if (response) {
      ;(summary as InvokeTrace).response = response
    }
    if (error) {
      ;(summary as InvokeTrace).error = error
      summary.status = 'error'
    }
  }

  return summary
}

function buildTraceEnvelope(
  span: SpanAggregate,
  envelope?: TraceEvent['trace']
): TraceEvent['trace'] {
  if (envelope) {
    const next: NonNullable<TraceEvent['trace']> = {
      ...envelope,
      tsStart: span.tsStart,
      tsEnd: span.tsEnd,
    }
    if (span.tsEnd === undefined) {
      delete next.tsEnd
    }
    return next
  }

  const next: NonNullable<TraceEvent['trace']> = {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    tsStart: span.tsStart,
  }
  if (span.tsEnd !== undefined) {
    next.tsEnd = span.tsEnd
  }
  return next
}

function getAggregateStatus(events: TraceEvent[]): TraceStatus {
  if (events.some((event) => event.status === 'error')) return 'error'
  if (events.some((event) => event.status === 'timeout')) return 'timeout'
  if (events.some((event) => event.status === 'cancelled')) return 'cancelled'
  return 'ok'
}

function buildTraceRows(spans: TraceEvent[]): RenderRow[] {
  const rows: RenderRow[] = []
  const traces = new Map<string, SpanNode[]>()

  for (const event of spans) {
    const traceId = event.trace?.traceId ?? event.id
    const spanId = event.trace?.spanId ?? event.id
    const parentSpanId = event.trace?.parentSpanId

    const node: SpanNode = {
      event,
      traceId,
      spanId,
      parentSpanId,
      tsStart: event.tsStart,
      tsEnd: event.tsEnd,
    }

    const list = traces.get(traceId)
    if (list) {
      list.push(node)
    } else {
      traces.set(traceId, [node])
    }
  }

  const traceEntries = Array.from(traces.entries()).map(([traceId, nodes]) => {
    const traceStart = Math.min(...nodes.map((node) => node.tsStart))
    const traceEnd = nodes.reduce<number | undefined>((max, node) => {
      if (node.tsEnd === undefined) return max
      if (max === undefined) return node.tsEnd
      return Math.max(max, node.tsEnd)
    }, undefined)
    const status = getAggregateStatus(nodes.map((node) => node.event))
    const errorCount = nodes.filter((node) => node.event.status === 'error').length
    const incompleteCount = nodes.filter((node) => node.tsEnd === undefined).length

    return {
      traceId,
      nodes,
      traceStart,
      traceEnd,
      status,
      errorCount,
      incompleteCount,
    }
  })

  traceEntries.sort((a, b) => a.traceStart - b.traceStart)

  for (const trace of traceEntries) {
    rows.push({
      type: 'trace',
      traceId: trace.traceId,
      tsStart: trace.traceStart,
      tsEnd: trace.traceEnd,
      durationMs: trace.traceEnd !== undefined ? trace.traceEnd - trace.traceStart : undefined,
      status: trace.status,
      spanCount: trace.nodes.length,
      errorCount: trace.errorCount,
      incompleteCount: trace.incompleteCount,
    })

    const nodeMap = new Map<string, SpanNode>()
    for (const node of trace.nodes) {
      nodeMap.set(node.spanId, node)
    }

    const children = new Map<string, SpanNode[]>()
    const roots: SpanNode[] = []
    for (const node of trace.nodes) {
      if (node.parentSpanId && nodeMap.has(node.parentSpanId)) {
        const list = children.get(node.parentSpanId)
        if (list) {
          list.push(node)
        } else {
          children.set(node.parentSpanId, [node])
        }
      } else {
        roots.push(node)
      }
    }

    roots.sort((a, b) => a.tsStart - b.tsStart)
    for (const node of roots) {
      appendSpanRows(rows, node, children, 0)
    }
  }

  return rows
}

function appendSpanRows(
  rows: RenderRow[],
  node: SpanNode,
  children: Map<string, SpanNode[]>,
  depth: number
) {
  rows.push({
    type: 'span',
    event: node.event,
    depth,
    isIncomplete: node.tsEnd === undefined,
    traceId: node.traceId,
    spanId: node.spanId,
  })

  const childNodes = children.get(node.spanId)
  if (!childNodes) return

  childNodes.sort((a, b) => a.tsStart - b.tsStart)
  for (const child of childNodes) {
    appendSpanRows(rows, child, children, depth + 1)
  }
}

function applyTraceRowFilter(rows: RenderRow[], filter: TraceRowFilter): RenderRow[] {
  if (filter === 'all') return rows

  return rows.filter((row) => {
    if (row.type !== 'trace') return true
    if (filter === 'hidden') return false
    return row.errorCount > 0 || row.incompleteCount > 0
  })
}

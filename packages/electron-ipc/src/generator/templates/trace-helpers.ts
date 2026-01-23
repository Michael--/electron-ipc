/**
 * Trace helper template included in generated IPC API files.
 */
export const traceHelpers = `
// ============================================================================
// Inline Trace Helpers (for Inspector)
// ============================================================================

type TraceContext = { traceId: string, spanId: string, parentSpanId?: string }
type TraceOptions = { trace?: TraceContext }
type TraceEnvelopePayload<T> = { __ipcTrace: TraceContext, __ipcData: T }

const TRACE_CONTEXT_KEY = '__ipcTrace'
const TRACE_DATA_KEY = '__ipcData'

function isTraceEnvelopePayload(value: any): value is TraceEnvelopePayload<any> {
  if (!value || typeof value !== 'object') return false
  const record = value as { [key: string]: any }
  if (!(TRACE_CONTEXT_KEY in record) || !(TRACE_DATA_KEY in record)) return false
  const trace = record[TRACE_CONTEXT_KEY]
  return (
    trace &&
    typeof trace === 'object' &&
    typeof trace.traceId === 'string' &&
    typeof trace.spanId === 'string' &&
    (trace.parentSpanId === undefined || typeof trace.parentSpanId === 'string')
  )
}

function wrapTracePayload<T>(payload: T, trace?: TraceContext): T | TraceEnvelopePayload<T> {
  if (!trace) return payload
  if (isTraceEnvelopePayload(payload)) return payload
  return { [TRACE_CONTEXT_KEY]: trace, [TRACE_DATA_KEY]: payload } as TraceEnvelopePayload<T>
}

function unwrapTracePayload<T>(
  input: T | TraceEnvelopePayload<T>
): { payload: T, trace?: TraceContext } {
  if (isTraceEnvelopePayload(input)) {
    return { payload: input.__ipcData, trace: input.__ipcTrace }
  }
  return { payload: input as T }
}

let tracingEnabled = true

/** Checks if tracing should be enabled for this channel */
function shouldTraceChannel(channel: string): boolean {
  if (!tracingEnabled) return false
  // Never trace Inspector IPC (prevent circular tracing)
  if (channel.startsWith('INSPECTOR:')) return false
  return true
}

/** Generates a unique trace ID */
function generateTraceId(): string {
  return \`\${Date.now().toString(36)}-\${Math.random().toString(36).slice(2, 8)}\`
}

/** Generates a unique span ID */
function generateSpanId(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** Creates a trace context for correlation */
function createTraceContext(parent?: TraceContext): TraceContext {
  if (parent) {
    return { traceId: parent.traceId, spanId: generateSpanId(), parentSpanId: parent.spanId }
  }

  const traceId = generateTraceId()
  return { traceId, spanId: traceId }
}

/** Creates a trace envelope with timestamps */
function createTraceEnvelope(
  context: TraceContext,
  tsStart: number,
  tsEnd?: number
): { traceId: string, spanId: string, parentSpanId?: string, tsStart: number, tsEnd?: number } {
  if (tsEnd === undefined) return { ...context, tsStart }
  return { ...context, tsStart, tsEnd }
}

/** Calculates byte size of JSON-serializable data */
function calculateBytes(data: any): number {
  try {
    return new Blob([JSON.stringify(data)]).size
  } catch {
    return 0
  }
}

/** Gets current payload mode from main process */
let cachedPayloadMode: 'none' | 'redacted' | 'full' = 'redacted'
// Silently try to get initial mode from main process (Inspector may not be enabled)
ipcRenderer.invoke('INSPECTOR:GET_PAYLOAD_MODE')
  .then((mode) => {
    if (mode) cachedPayloadMode = mode
  })
  .catch(() => {
    // Inspector not enabled - silently ignore
  })

// Silently try to get initial tracing state from main process
ipcRenderer.invoke('INSPECTOR:GET_STATUS')
  .then((status) => {
    if (status && typeof status.traceEnabled === 'boolean') {
      tracingEnabled = status.traceEnabled
    }
  })
  .catch(() => {
    // Inspector not enabled - silently ignore
  })

/** Creates a payload preview based on current mode */
function createPayloadPreview(data: any): { mode: 'none' | 'redacted' | 'full', bytes?: number, summary?: string, data?: any } {
  const bytes = calculateBytes(data)

  // Mode: none - no payload data at all
  if (cachedPayloadMode === 'none') {
    return { mode: 'none', bytes }
  }

  // Mode: full - include complete data
  if (cachedPayloadMode === 'full') {
    return { mode: 'full', bytes, data }
  }

  // Mode: redacted (default) - preview only
  let summary = ''
  try {
    const json = JSON.stringify(data)
    // Preview: first 100 chars
    summary = json.length > 100 ? json.slice(0, 100) + '...' : json
  } catch {
    summary = '[Non-serializable data]'
  }

  return { mode: 'redacted', bytes, summary }
}

/** Updates cached payload mode from main process */
ipcRenderer.on('INSPECTOR:PAYLOAD_MODE_CHANGED', (_event: any, mode: 'none' | 'redacted' | 'full') => {
  cachedPayloadMode = mode
})

/** Updates cached tracing state from main process */
ipcRenderer.on('INSPECTOR:TRACE_ENABLED_CHANGED', (_event: any, enabled: boolean) => {
  tracingEnabled = Boolean(enabled)
})

/** Traces an invoke IPC call */
async function traceInvoke<TRequest, TResponse>(
  channel: string,
  request: TRequest,
  invoke: (channel: string, request: TRequest) => Promise<TResponse>,
  parentTrace?: TraceContext
): Promise<TResponse> {
  if (!shouldTraceChannel(channel)) {
    return invoke(channel, request)
  }

  const traceContext = createTraceContext(parentTrace)
  const tsStart = Date.now()
  const requestWithTrace = wrapTracePayload(request, traceContext)

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'invoke',
      channel,
      direction: 'renderer→main',
      status: 'ok',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      source: { webContentsId: -1 },
      request: createPayloadPreview(request)
    })
  } catch {}

  try {
    const response = await invoke(channel, requestWithTrace as any)
    const tsEnd = Date.now()

    try {
      ipcRenderer.send('INSPECTOR:TRACE', {
        id: traceContext.spanId,
        kind: 'invoke',
        channel,
        direction: 'renderer→main',
        status: 'ok',
        tsStart,
        tsEnd,
        durationMs: tsEnd - tsStart,
        trace: createTraceEnvelope(traceContext, tsStart, tsEnd),
        source: { webContentsId: -1 },
        request: createPayloadPreview(request),
        response: createPayloadPreview(response)
      })
    } catch {}

    return response
  } catch (error) {
    const tsEnd = Date.now()

    try {
      ipcRenderer.send('INSPECTOR:TRACE', {
        id: traceContext.spanId,
        kind: 'invoke',
        channel,
        direction: 'renderer→main',
        status: 'error',
        tsStart,
        tsEnd,
        durationMs: tsEnd - tsStart,
        trace: createTraceEnvelope(traceContext, tsStart, tsEnd),
        source: { webContentsId: -1 },
        request: createPayloadPreview(request),
        error: {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      })
    } catch {}

    throw error
  }
}

/** Traces an event IPC call */
function traceEvent<TPayload>(
  channel: string,
  payload: TPayload,
  parentTrace?: TraceContext
): TraceContext | null {
  if (!shouldTraceChannel(channel)) return null

  const traceContext = createTraceContext(parentTrace)
  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'event',
      channel,
      direction: 'renderer→main',
      status: 'ok',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      source: { webContentsId: -1 },
      payload: createPayloadPreview(payload)
    })
  } catch {}

  return traceContext
}

/** Traces a broadcast IPC event */
function traceBroadcast<TPayload>(
  channel: string,
  payload: TPayload,
  parentTrace?: TraceContext
): void {
  if (!shouldTraceChannel(channel)) return

  const traceContext = createTraceContext(parentTrace)
  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'broadcast',
      channel,
      direction: 'main→renderer',
      status: 'ok',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      target: { webContentsId: -1 },
      payload: createPayloadPreview(payload)
    })
  } catch {}
}

/** Traces a stream invoke IPC call */
function traceStreamInvoke(
  channel: string,
  request: any,
  parentTrace?: TraceContext
): TraceContext | null {
  if (!shouldTraceChannel(channel)) return null

  const traceContext = createTraceContext(parentTrace)
  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'streamInvoke',
      channel,
      direction: 'renderer→main',
      status: 'streaming',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      source: { webContentsId: -1 },
      request: createPayloadPreview(request)
    })
  } catch {}

  return traceContext
}

/** Updates stream invoke trace with chunk data */
function traceStreamInvokeChunk(
  traceContext: TraceContext | null,
  channel: string,
  chunk: any
): void {
  if (!traceContext || !shouldTraceChannel(channel)) return

  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'streamInvoke',
      channel,
      direction: 'renderer→main',
      status: 'streaming',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      source: { webContentsId: -1 },
      stream: createPayloadPreview(chunk)
    })
  } catch {}
}

/** Completes stream invoke trace */
function traceStreamInvokeEnd(
  traceContext: TraceContext | null,
  channel: string,
  tsStart: number,
  status: 'ok' | 'cancelled' | 'error' = 'ok',
  error?: any
): void {
  if (!traceContext || !shouldTraceChannel(channel)) return

  const tsEnd = Date.now()

  try {
    const event: any = {
      id: traceContext.spanId,
      kind: 'streamInvoke',
      channel,
      direction: 'renderer→main',
      status,
      tsStart,
      tsEnd,
      durationMs: tsEnd - tsStart,
      trace: createTraceEnvelope(traceContext, tsStart, tsEnd),
      source: { webContentsId: -1 }
    }

    if (status === 'error' && error) {
      event.error = {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    ipcRenderer.send('INSPECTOR:TRACE', event)
  } catch {}
}

/** Marks stream invoke as errored */
function traceStreamInvokeError(
  traceContext: TraceContext | null,
  channel: string,
  tsStart: number,
  error: any
): void {
  if (!traceContext || !shouldTraceChannel(channel)) return

  const tsEnd = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'streamInvoke',
      channel,
      direction: 'renderer→main',
      status: 'error',
      tsStart,
      tsEnd,
      durationMs: tsEnd - tsStart,
      trace: createTraceEnvelope(traceContext, tsStart, tsEnd),
      source: { webContentsId: -1 },
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    })
  } catch {}
}

/** Traces a stream upload start */
function traceStreamUploadStart(
  channel: string,
  request: any,
  parentTrace?: TraceContext
): TraceContext | null {
  if (!shouldTraceChannel(channel)) return null

  const traceContext = createTraceContext(parentTrace)
  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'streamUpload',
      channel,
      direction: 'renderer→main',
      status: 'streaming',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      source: { webContentsId: -1 },
      request: createPayloadPreview(request)
    })
  } catch {}

  return traceContext
}

/** Traces a stream upload data chunk */
function traceStreamUploadData(
  traceContext: TraceContext | null,
  channel: string,
  chunk: any
): void {
  if (!traceContext || !shouldTraceChannel(channel)) return

  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'streamUpload',
      channel,
      direction: 'renderer→main',
      status: 'streaming',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      source: { webContentsId: -1 },
      data: createPayloadPreview(chunk)
    })
  } catch {}
}

/** Traces stream upload completion */
function traceStreamUploadEnd(
  traceContext: TraceContext | null,
  channel: string,
  status: 'ok' | 'cancelled' | 'error' = 'ok',
  error?: any,
  tsStart?: number
): void {
  if (!traceContext || !shouldTraceChannel(channel)) return

  const tsEnd = Date.now()
  const resolvedStart = tsStart ?? tsEnd

  try {
    const event: any = {
      id: traceContext.spanId,
      kind: 'streamUpload',
      channel,
      direction: 'renderer→main',
      status,
      tsStart: resolvedStart,
      tsEnd,
      durationMs: tsEnd - resolvedStart,
      trace: createTraceEnvelope(traceContext, resolvedStart, tsEnd),
      source: { webContentsId: -1 }
    }

    if (status === 'error' && error) {
      event.error = {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    ipcRenderer.send('INSPECTOR:TRACE', event)
  } catch {}
}

/** Traces a stream download */
function traceStreamDownload(
  channel: string,
  chunk: any,
  parentTrace?: TraceContext
): void {
  if (!shouldTraceChannel(channel)) return

  const traceContext = parentTrace ?? createTraceContext()
  const tsStart = Date.now()

  try {
    ipcRenderer.send('INSPECTOR:TRACE', {
      id: traceContext.spanId,
      kind: 'streamDownload',
      channel,
      direction: 'main→renderer',
      status: 'streaming',
      tsStart,
      trace: createTraceEnvelope(traceContext, tsStart),
      target: { webContentsId: -1 },
      data: createPayloadPreview(chunk)
    })
  } catch {}
}

/** Completes stream download trace */
function traceStreamDownloadEnd(
  traceContext: TraceContext | null,
  channel: string,
  tsStart: number,
  status: 'ok' | 'cancelled' | 'error' = 'ok',
  error?: any
): void {
  if (!traceContext || !shouldTraceChannel(channel)) return

  const tsEnd = Date.now()

  try {
    const event: any = {
      id: traceContext.spanId,
      kind: 'streamDownload',
      channel,
      direction: 'main→renderer',
      status,
      tsStart,
      tsEnd,
      durationMs: tsEnd - tsStart,
      trace: createTraceEnvelope(traceContext, tsStart, tsEnd),
      target: { webContentsId: -1 }
    }

    if (status === 'error' && error) {
      event.error = {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    ipcRenderer.send('INSPECTOR:TRACE', event)
  } catch {}
}

// ============================================================================
// End Trace Helpers
// ============================================================================
`

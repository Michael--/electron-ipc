/**
 * Generates template for invoke contracts (Renderer ↔ Main bidirectional communication)
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for invoke contract helper function
 */
export const invokeContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function takes the channel and request, infers the types, and calls ipcRenderer.invoke with the correct types enforced.
const invoke${contract} = <K extends keyof ${contract}>(
  channel: K,
  request: ${contract}[K]["request"],
  options?: TraceOptions
): Promise<${contract}[K]["response"]> => {
   return traceInvoke(
     channel as string,
     request,
     (ch, req) => ipcRenderer.invoke(ch, req) as Promise<${contract}[K]["response"]>,
     options?.trace
   )
}
`

/**
 * Generates template for event contracts (Renderer → Main one-way communication)
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for event contract helper function
 */
export const eventContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function takes the channel and request, infers the types, and calls ipcRenderer.send with the correct types enforced.
const send${contract} = <K extends keyof ${contract}>(
  channel: K,
  request: ${contract}[K]["request"],
  options?: TraceOptions
): void => {
   const traceContext = traceEvent(channel as string, request, options?.trace)
   ipcRenderer.send(channel as string, wrapTracePayload(request, traceContext ?? undefined))
}
`

/**
 * Generates template for send/broadcast contracts (Main → Renderer one-way communication)
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for broadcast contract helper function
 */
export const sendContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function takes the channel and request, infers the types, and calls ipcRenderer.on with the correct types enforced.
const on${contract} = <K extends keyof ${contract}>(
  channel: K,
  callback: (payload: ${contract}[K]["payload"]) => void,
  options?: TraceOptions
): (() => void) => {
   const handler = (_event: any, data: any) => {
     const { payload, trace } = unwrapTracePayload(data)
     traceBroadcast(channel as string, payload, trace ?? options?.trace)
     callback(payload)
   }
   ipcRenderer.on(channel as string, handler)
   return () => ipcRenderer.removeListener(channel as string, handler)
}
`

/**
 * Generates template for stream invoke contracts (Renderer ↔ Main with stream response)
 * Uses callback-based API for contextBridge compatibility (only serializable data)
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for stream invoke contract helper function
 */
export const streamInvokeContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

/**
 * Callback handlers for stream invoke operations
 */
type StreamCallbacks<TData> = {
  onData: (chunk: TData) => void
  onEnd: () => void
  onError: (error: Error) => void
}

/**
 * Starts a stream invoke and handles the response via callbacks.
 * This approach works with contextBridge as it only transfers serializable data.
 */
const invokeStream${contract} = <K extends keyof ${contract}>(
  channel: K,
  request: ${contract}[K]["request"],
  callbacks: StreamCallbacks<${contract}[K]["stream"]>,
  options?: { signal?: AbortSignal } & TraceOptions
): (() => void) => {
   const traceContext = traceStreamInvoke(channel as string, request, options?.trace)
   const traceId = traceContext?.spanId ?? ''
   const tsStart = Date.now()

   const dataChannel = \`\${channel as string}-data\`
   const endChannel = \`\${channel as string}-end\`
   const errorChannel = \`\${channel as string}-error\`

   const dataHandler = (_event: any, chunk: ${contract}[K]["stream"]) => {
     const { payload } = unwrapTracePayload(chunk)
     traceStreamInvokeChunk(traceContext, channel as string, payload)
     callbacks.onData(payload)
   }
   const endHandler = (_event: any, _endPayload: any) => {
     traceStreamInvokeEnd(traceContext, channel as string, tsStart)
     callbacks.onEnd()
     cleanup()
   }
   const errorHandler = (_event: any, err: any) => {
     const { payload } = unwrapTracePayload(err)
     traceStreamInvokeError(traceContext, channel as string, tsStart, payload)
     callbacks.onError(payload instanceof Error ? payload : new Error(String(payload)))
     cleanup()
   }

   let isCleanedUp = false

   const cleanup = () => {
     if (isCleanedUp) return
     isCleanedUp = true
     ipcRenderer.removeListener(dataChannel, dataHandler)
     ipcRenderer.removeListener(endChannel, endHandler)
     ipcRenderer.removeListener(errorChannel, errorHandler)
     if (options?.signal) options.signal.removeEventListener('abort', handleAbort)
   }

   const stop = () => {
     traceStreamInvokeEnd(traceContext, channel as string, tsStart, 'cancelled')
     ipcRenderer.send(\`\${channel as string}-cancel\`)
     cleanup()
   }

   const handleAbort = () => {
     stop()
   }

   ipcRenderer.on(dataChannel, dataHandler)
   ipcRenderer.on(endChannel, endHandler)
   ipcRenderer.on(errorChannel, errorHandler)

   if (options?.signal) {
     if (options.signal.aborted) {
       stop()
       return stop
     }
     options.signal.addEventListener('abort', handleAbort, { once: true })
   }

   // Start the stream
   ipcRenderer.invoke(channel as string, wrapTracePayload(request, traceContext ?? undefined))

   return stop
}
`

/**
 * Generates template for stream upload contracts (Renderer → Main streaming)
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for stream upload helper function
 */
export const streamUploadContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

type StreamWriter<T> = {
  write: (chunk: T) => Promise<void>
  close: () => Promise<void>
  abort: (reason?: any) => Promise<void>
}

// This function creates a stream writer for uploading data to the main process.
const upload${contract} = <K extends keyof ${contract}>(
  channel: K,
  request: ${contract}[K]["request"],
  options?: TraceOptions
): StreamWriter<${contract}[K]["data"]> => {
   const traceContext = traceStreamUploadStart(channel as string, request, options?.trace)
   const tsStart = Date.now()
   ipcRenderer.send(
     \`\${channel as string}-start\`,
     wrapTracePayload(request, traceContext ?? undefined)
   )
   return {
     write: async (chunk: ${contract}[K]["data"]) => {
       traceStreamUploadData(traceContext, channel as string, chunk)
       ipcRenderer.send(
         \`\${channel as string}-data\`,
         wrapTracePayload(chunk, traceContext ?? undefined)
       )
     },
     close: async () => {
       traceStreamUploadEnd(traceContext, channel as string, 'ok', undefined, tsStart)
       ipcRenderer.send(
         \`\${channel as string}-end\`,
         wrapTracePayload(undefined, traceContext ?? undefined)
       )
     },
     abort: async (reason?: any) => {
       const status = reason instanceof Error ? 'error' : 'cancelled'
       traceStreamUploadEnd(traceContext, channel as string, status, reason, tsStart)
       ipcRenderer.send(
         \`\${channel as string}-error\`,
         wrapTracePayload(reason, traceContext ?? undefined)
       )
     }
   }
}
`

/**
 * Generates template for stream download contracts (Main → Renderer streaming)
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for stream download helper function
 */
export const streamDownloadContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function sets up listeners for downloading a stream from the main process.
const download${contract} = <K extends keyof ${contract}>(
  channel: K,
  request: ${contract}[K]["request"],
  callback: (data: ${contract}[K]["data"]) => void,
  onEnd?: () => void,
  onError?: (err: any) => void,
  options?: { signal?: AbortSignal } & TraceOptions
): (() => void) => {
   const dataChannel = \`\${channel as string}-data\`
   const endChannel = \`\${channel as string}-end\`
   const errorChannel = \`\${channel as string}-error\`
   const traceContext = shouldTraceChannel(channel as string)
     ? createTraceContext(options?.trace)
     : null
   const tsStart = Date.now()

   const dataHandler = (_event: any, data: ${contract}[K]["data"]) => {
     const { payload, trace } = unwrapTracePayload(data)
     traceStreamDownload(channel as string, payload, trace ?? traceContext ?? options?.trace)
     callback(payload)
   }
   const endHandler = () => {
     traceStreamDownloadEnd(traceContext, channel as string, tsStart)
     onEnd?.()
     cleanup()
   }
   const errorHandler = (_event: any, err: any) => {
     const { payload } = unwrapTracePayload(err)
     traceStreamDownloadEnd(traceContext, channel as string, tsStart, 'error', payload)
     onError?.(payload)
     cleanup()
   }

   let isCleanedUp = false

   const cleanup = () => {
     if (isCleanedUp) return
     isCleanedUp = true
     ipcRenderer.removeListener(dataChannel, dataHandler)
     ipcRenderer.removeListener(endChannel, endHandler)
     ipcRenderer.removeListener(errorChannel, errorHandler)
     if (options?.signal) options.signal.removeEventListener('abort', handleAbort)
   }

   const stop = () => {
     traceStreamDownloadEnd(traceContext, channel as string, tsStart, 'cancelled')
     ipcRenderer.send(\`\${channel as string}-cancel\`)
     cleanup()
   }

   const handleAbort = () => {
     stop()
   }

   if (options?.signal) {
     if (options.signal.aborted) {
       stop()
       return stop
     }
     options.signal.addEventListener('abort', handleAbort, { once: true })
   }

   ipcRenderer.on(dataChannel, dataHandler)
   ipcRenderer.on(endChannel, endHandler)
   ipcRenderer.on(errorChannel, errorHandler)
   ipcRenderer.invoke(
     channel as string,
     wrapTracePayload(request, traceContext ?? undefined)
   ) // Trigger the download with request
   return stop
}
`

/**
 * Generates template for renderer invoke contracts (Renderer ↔ Renderer via Main)
 * Enables type-safe request-response communication between renderer processes
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for renderer invoke contract helper function
 */
export const rendererInvokeContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

/**
 * Context information for renderer invoke handlers
 */
type RendererInvokeContext = {
  sourceWindowId: number
  sourceRole?: string
}

/**
 * Generic renderer invoke - call another renderer process by role
 */
const invokeInRenderer = async <K extends keyof ${contract}>(
  targetRole: string,
  channel: K,
  request: ${contract}[K]["request"],
  options?: { timeout?: number } & TraceOptions
): Promise<${contract}[K]["response"]> => {
  const channelStr = channel as string
  const tsStart = Date.now()

  // Create trace context for the renderer invoke
  const traceContext = shouldTraceChannel(channelStr)
    ? createTraceContext(options?.trace)
    : undefined

  // Emit trace for renderer invoke start
  if (traceContext) {
    try {
      ipcRenderer.send('INSPECTOR:TRACE', {
        id: traceContext.spanId,
        kind: 'invoke',
        channel: channelStr,
        direction: 'renderer→renderer',
        status: 'ok',
        tsStart,
        trace: createTraceEnvelope(traceContext, tsStart),
        source: { webContentsId: -1 },
        request: createPayloadPreview(request)
      })
    } catch {}
  }

  try {
    const response = await ipcRenderer.invoke('__RENDERER_ROUTE__', {
      targetRole,
      channel: channelStr,
      request: wrapTracePayload(request, traceContext ?? undefined),
      timeout: options?.timeout ?? 5000
    })

    // Emit trace for successful response
    if (traceContext) {
      const tsEnd = Date.now()
      try {
        ipcRenderer.send('INSPECTOR:TRACE', {
          id: traceContext.spanId,
          kind: 'invoke',
          channel: channelStr,
          direction: 'renderer→renderer',
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
    }

    return response
  } catch (error: any) {
    // Emit trace for error
    if (traceContext) {
      const tsEnd = Date.now()
      try {
        ipcRenderer.send('INSPECTOR:TRACE', {
          id: traceContext.spanId,
          kind: 'invoke',
          channel: channelStr,
          direction: 'renderer→renderer',
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
    }
    throw error
  }
}

/**
 * Register handler for renderer invoke requests
 */
const handleRendererInvoke = <K extends keyof ${contract}>(
  channel: K,
  handler: (
    request: ${contract}[K]["request"],
    context: RendererInvokeContext
  ) => Promise<${contract}[K]["response"]>
): (() => void) => {
  const eventName = \`__RENDERER_HANDLER_\${channel as string}__\`
  const channelStr = channel as string

  const eventHandler = async (_event: any, envelope: any) => {
    const { requestId, request: rawRequest, sourceWindowId, sourceRole } = envelope
    const tsStart = Date.now()

    // Unwrap trace payload if present
    const { payload: request, trace } = unwrapTracePayload(rawRequest)

    // Emit trace for handler invocation
    if (trace && shouldTraceChannel(channelStr)) {
      try {
        ipcRenderer.send('INSPECTOR:TRACE', {
          id: trace.spanId,
          kind: 'invoke',
          channel: channelStr,
          direction: 'renderer→renderer',
          status: 'ok',
          tsStart,
          trace: createTraceEnvelope(trace, tsStart),
          source: { webContentsId: -1 },
          request: createPayloadPreview(request)
        })
      } catch {}
    }

    try {
      const response = await handler(request, { sourceWindowId, sourceRole })
      const tsEnd = Date.now()

      // Emit trace for handler response
      if (trace && shouldTraceChannel(channelStr)) {
        try {
          ipcRenderer.send('INSPECTOR:TRACE', {
            id: trace.spanId,
            kind: 'invoke',
            channel: channelStr,
            direction: 'renderer→renderer',
            status: 'ok',
            tsStart,
            tsEnd,
            durationMs: tsEnd - tsStart,
            trace: createTraceEnvelope(trace, tsStart, tsEnd),
            source: { webContentsId: -1 },
            request: createPayloadPreview(request),
            response: createPayloadPreview(response)
          })
        } catch {}
      }

      ipcRenderer.send('__RENDERER_RESPONSE__', {
        requestId,
        response: wrapTracePayload(response, trace ?? undefined)
      })
    } catch (error: any) {
      const tsEnd = Date.now()

      // Emit trace for handler error
      if (trace && shouldTraceChannel(channelStr)) {
        try {
          ipcRenderer.send('INSPECTOR:TRACE', {
            id: trace.spanId,
            kind: 'invoke',
            channel: channelStr,
            direction: 'renderer→renderer',
            status: 'error',
            tsStart,
            tsEnd,
            durationMs: tsEnd - tsStart,
            trace: createTraceEnvelope(trace, tsStart, tsEnd),
            source: { webContentsId: -1 },
            request: createPayloadPreview(request),
            error: {
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            }
          })
        } catch {}
      }

      ipcRenderer.send('__RENDERER_RESPONSE__', {
        requestId,
        error: {
          message: error?.message ?? 'Unknown error',
          name: error?.name ?? 'Error',
          stack: error?.stack
        }
      })
    }
  }

  ipcRenderer.on(eventName, eventHandler)

  return () => {
    ipcRenderer.removeListener(eventName, eventHandler)
  }
}
`

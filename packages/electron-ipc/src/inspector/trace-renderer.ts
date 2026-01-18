/**
 * Renderer-side tracing helpers for generated IPC code
 *
 * These functions are used by the code generator to instrument IPC calls
 * in the renderer process (preload script context).
 */

import { ipcRenderer } from 'electron'
import { createPayloadPreview, generateTraceId, shouldTrace } from './trace'
import type { BroadcastTrace, EventTrace, InvokeTrace } from './types'

/**
 * Traces an invoke IPC call (renderer → main → renderer)
 *
 * @param channel - IPC channel name
 * @param request - Request payload
 * @param invoke - The actual invoke function
 * @returns Promise with response
 */
export async function traceInvoke<TRequest, TResponse>(
  channel: string,
  request: TRequest,
  invoke: (channel: string, request: TRequest) => Promise<TResponse>
): Promise<TResponse> {
  // Check if we should trace this channel
  if (!shouldTrace(channel)) {
    return invoke(channel, request)
  }

  const traceId = generateTraceId()
  const tsStart = Date.now()

  // Emit start event
  const startEvent: InvokeTrace = {
    id: traceId,
    kind: 'invoke',
    channel,
    direction: 'renderer→main',
    status: 'ok',
    tsStart,
    source: {
      webContentsId: -1, // Will be filled by main process
    },
    request: createPayloadPreview(request, 'full'),
  }

  // Send trace event to Inspector via special channel
  try {
    ipcRenderer.send('INSPECTOR:TRACE', startEvent)
  } catch {
    // Ignore trace errors
  }

  try {
    // Execute the actual invoke
    const response = await invoke(channel, request)

    // Emit success event
    const tsEnd = Date.now()
    const successEvent: InvokeTrace = {
      ...startEvent,
      tsEnd,
      durationMs: tsEnd - tsStart,
      response: createPayloadPreview(response, 'full'),
    }

    try {
      ipcRenderer.send('INSPECTOR:TRACE', successEvent)
    } catch {
      // Ignore trace errors
    }

    return response
  } catch (error) {
    // Emit error event
    const tsEnd = Date.now()
    const errorEvent: InvokeTrace = {
      ...startEvent,
      status: 'error',
      tsEnd,
      durationMs: tsEnd - tsStart,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
      },
    }

    try {
      ipcRenderer.send('INSPECTOR:TRACE', errorEvent)
    } catch {
      // Ignore trace errors
    }

    throw error
  }
}

/**
 * Traces an event IPC call (renderer → main)
 *
 * @param channel - IPC channel name
 * @param payload - Event payload
 */
export function traceEvent<TPayload>(channel: string, payload: TPayload): void {
  // Check if we should trace this channel
  if (!shouldTrace(channel)) {
    return
  }

  const traceId = generateTraceId()
  const tsStart = Date.now()

  const event: EventTrace = {
    id: traceId,
    kind: 'event',
    channel,
    direction: 'renderer→main',
    status: 'ok',
    tsStart,
    source: {
      webContentsId: -1, // Will be filled by main process
    },
    payload: createPayloadPreview(payload, 'full'),
  }

  try {
    ipcRenderer.send('INSPECTOR:TRACE', event)
  } catch {
    // Ignore trace errors
  }
}

/**
 * Traces a broadcast IPC event (main → renderer)
 *
 * @param channel - IPC channel name
 * @param payload - Broadcast payload
 */
export function traceBroadcast<TPayload>(channel: string, payload: TPayload): void {
  // Check if we should trace this channel
  if (!shouldTrace(channel)) {
    return
  }

  const traceId = generateTraceId()
  const tsStart = Date.now()

  const event: BroadcastTrace = {
    id: traceId,
    kind: 'broadcast',
    channel,
    direction: 'main→renderer',
    status: 'ok',
    tsStart,
    target: {
      webContentsId: -1, // Will be filled by main process
    },
    payload: createPayloadPreview(payload, 'full'),
  }

  try {
    ipcRenderer.send('INSPECTOR:TRACE', event)
  } catch {
    // Ignore trace errors
  }
}

import type { TraceEvent } from './types'

/**
 * Inspector IPC Protocol
 *
 * Communication between Inspector UI and Main Process
 */

/**
 * HELLO: Inspector UI connects to Main Process
 *
 * Direction: UI → Main
 * Sent when Inspector window opens
 */
export interface InspectorHelloPayload {
  /** Inspector UI version */
  version: string

  /** Timestamp of connection */
  timestamp: number
}

/**
 * INIT: Main Process sends initial snapshot to Inspector UI
 *
 * Direction: Main → UI
 * Response to HELLO, includes current buffer state
 */
export interface InspectorInitPayload {
  /** Initial snapshot of trace events */
  events: TraceEvent[]

  /** Inspector configuration */
  config: {
    enabled: boolean
    maxEvents: number
    payloadMode: 'none' | 'redacted' | 'full'
    maxPayloadPreviewBytes: number
  }

  /** Timestamp of snapshot */
  timestamp: number
}

/**
 * EVENT: Main Process sends live trace event to Inspector UI
 *
 * Direction: Main → UI
 * Sent whenever a new IPC operation is traced
 */
export interface InspectorEventPayload {
  /** New trace event */
  event: TraceEvent
}

/**
 * EVENT_BATCH: Main Process sends batch of trace events to Inspector UI
 *
 * Direction: Main → UI
 * Sent when batching is enabled to reduce IPC overhead
 */
export interface InspectorEventBatchPayload {
  /** Batch of trace events */
  events: TraceEvent[]
}

/**
 * COMMAND: Inspector UI sends command to Main Process
 *
 * Direction: UI → Main
 * Control commands from Inspector UI
 */
export type InspectorCommand =
  | { type: 'clear' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'export'; format: 'json' | 'csv' }
  | { type: 'setPayloadMode'; mode: 'none' | 'redacted' | 'full' }
  | { type: 'setBufferSize'; size: number }

export interface InspectorCommandPayload {
  command: InspectorCommand
}

/**
 * COMMAND_RESPONSE: Main Process responds to command
 *
 * Direction: Main → UI
 */
export interface InspectorCommandResponsePayload {
  success: boolean
  error?: string
  data?: unknown
}

/**
 * STATUS: Main Process sends status update
 *
 * Direction: Main → UI
 * Sent when inspector state changes
 */
export interface InspectorStatusPayload {
  /** Whether tracing is active */
  isTracing: boolean

  /** Number of events in buffer */
  eventCount: number

  /** Buffer capacity */
  bufferCapacity?: number

  /** Number of events dropped (if buffer full) */
  droppedCount?: number

  /** Current payload mode */
  payloadMode: 'none' | 'redacted' | 'full'
}

/**
 * Inspector IPC Contract definitions
 */
export interface InspectorContracts {
  // UI → Main
  'INSPECTOR:HELLO': { payload: InspectorHelloPayload }
  'INSPECTOR:COMMAND': { payload: InspectorCommandPayload }

  // Main → UI
  'INSPECTOR:INIT': { payload: InspectorInitPayload }
  'INSPECTOR:EVENT': { payload: InspectorEventPayload }
  'INSPECTOR:EVENT_BATCH': { payload: InspectorEventBatchPayload }
  'INSPECTOR:STATUS': { payload: InspectorStatusPayload }
  'INSPECTOR:COMMAND_RESPONSE': { payload: InspectorCommandResponsePayload }
}

/**
 * Type guard to check if a channel is an Inspector channel
 */
export function isInspectorChannel(channel: string): boolean {
  return channel.startsWith('INSPECTOR:')
}

/**
 * Get Inspector channel name with type safety
 */
export function getInspectorChannel<K extends keyof InspectorContracts>(channel: K): K {
  return channel
}

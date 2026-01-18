/**
 * Inspector module for IPC tracing and debugging
 *
 * @module @number10/electron-ipc/inspector
 */

// Export types
export type {
  BroadcastTrace,
  Direction,
  EventTrace,
  InspectorOptions,
  InvokeTrace,
  PayloadMode,
  PayloadPreview,
  StreamTrace,
  StreamType,
  TraceEvent,
  TraceEventBase,
  TraceKind,
  TraceSource,
  TraceStatus,
  TraceTarget,
} from './types'

export { DEFAULT_INSPECTOR_OPTIONS } from './types'

// Export contracts
export type {
  InspectorCommand,
  InspectorCommandPayload,
  InspectorCommandResponsePayload,
  InspectorContracts,
  InspectorEventPayload,
  InspectorHelloPayload,
  InspectorInitPayload,
  InspectorStatusPayload,
} from './inspector-contracts'

export { getInspectorChannel, isInspectorChannel } from './inspector-contracts'

// Export trace system
export type { TraceSink } from './trace'

export {
  createPayloadPreview,
  emitTrace,
  estimatePayloadBytes,
  generateTraceId,
  isTracingEnabled,
  serializeError,
  setTraceSink,
  shouldTrace,
} from './trace'

// Export ring buffer
export { RingBuffer } from './ring-buffer'

// Export server
export { InspectorServer, getInspectorServer, resetInspectorServer } from './server'

// Export enable function
export { closeInspector, enableIpcInspector, getInspectorWindow } from './enable'

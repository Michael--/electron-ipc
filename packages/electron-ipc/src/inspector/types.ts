/**
 * Direction of IPC communication
 */
export type Direction = 'renderer→main' | 'main→renderer'

/**
 * Type of IPC trace event
 */
export type TraceKind =
  | 'invoke'
  | 'event'
  | 'broadcast'
  | 'streamInvoke'
  | 'streamUpload'
  | 'streamDownload'

/**
 * Status of a traced operation
 */
export type TraceStatus = 'ok' | 'error' | 'timeout' | 'cancelled'

/**
 * Base structure for all trace events
 */
export interface TraceEventBase {
  /** Unique identifier for this trace */
  id: string

  /** Sequence number (server-side incrementing counter) */
  seq?: number

  /** Timestamp when operation started (ms since epoch) */
  tsStart: number

  /** Timestamp when operation ended (ms since epoch) */
  tsEnd?: number

  /** Duration of the operation in milliseconds */
  durationMs?: number

  /** Direction of communication */
  direction: Direction

  /** Type of IPC operation */
  kind: TraceKind

  /** IPC channel name */
  channel: string

  /** Optional API name (e.g., generated function name) */
  apiName?: string

  /** Operation status */
  status: TraceStatus
}

/**
 * Source information for traced events
 */
export interface TraceSource {
  /** WebContents ID of the sender */
  webContentsId: number

  /** BrowserWindow ID (if available) */
  windowId?: number

  /** Window role (from WindowRegistry) */
  windowRole?: string

  /** URL of the sender */
  url?: string

  /** Title of the window */
  title?: string
}

/**
 * Target information for traced events
 */
export interface TraceTarget {
  /** WebContents ID of the receiver */
  webContentsId?: number

  /** BrowserWindow ID (if available) */
  windowId?: number

  /** Window role (from WindowRegistry) */
  windowRole?: string
}

/**
 * Payload preview modes
 */
export type PayloadMode = 'none' | 'redacted' | 'full'

/**
 * Preview of payload data
 */
export interface PayloadPreview {
  /** Preview mode used */
  mode: PayloadMode

  /** Estimated size in bytes */
  bytes?: number

  /** Summary/description of the payload */
  summary?: string

  /** Full payload data (only if mode='full') */
  data?: unknown
}

/**
 * Trace event for invoke operations (renderer→main→renderer)
 */
export interface InvokeTrace extends TraceEventBase {
  kind: 'invoke'
  direction: 'renderer→main'

  /** Source (renderer) information */
  source: TraceSource

  /** Request payload preview */
  request?: PayloadPreview

  /** Response payload preview */
  response?: PayloadPreview

  /** Error information (if status='error') */
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

/**
 * Trace event for event operations (renderer→main)
 */
export interface EventTrace extends TraceEventBase {
  kind: 'event'
  direction: 'renderer→main'

  /** Source (renderer) information */
  source: TraceSource

  /** Event payload preview */
  payload?: PayloadPreview
}

/**
 * Trace event for broadcast operations (main→renderer)
 */
export interface BroadcastTrace extends TraceEventBase {
  kind: 'broadcast'
  direction: 'main→renderer'

  /** Target (renderer) information */
  target: TraceTarget

  /** Broadcast payload preview */
  payload?: PayloadPreview

  /** Whether this was a broadcast-to-all operation */
  broadcastToAll?: boolean

  /** Excluded roles (if broadcast-to-all) */
  excludedRoles?: string[]
}

/**
 * Stream operation type
 */
export type StreamType = 'invoke' | 'upload' | 'download'

/**
 * Trace event for stream operations
 */
export interface StreamTrace extends TraceEventBase {
  kind: 'streamInvoke' | 'streamUpload' | 'streamDownload'

  /** Stream ID (unique per stream) */
  streamId: string

  /** Stream type */
  streamType: StreamType

  /** Source information */
  source: TraceSource

  /** Target information (if applicable) */
  target?: TraceTarget

  /** Number of chunks transferred */
  chunkCount: number

  /** Total bytes transferred */
  totalBytes: number

  /** Preview of first chunk */
  firstChunk?: PayloadPreview

  /** Preview of last chunk */
  lastChunk?: PayloadPreview

  /** End reason */
  endReason?: 'complete' | 'error' | 'cancel'

  /** Error information (if endReason='error') */
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

/**
 * Union type of all trace events
 */
export type TraceEvent = InvokeTrace | EventTrace | BroadcastTrace | StreamTrace

/**
 * Inspector configuration options
 */
export interface InspectorOptions {
  /** Enable inspector (default: dev mode only) */
  enabled?: boolean

  /** Open inspector window on app start */
  openOnStart?: boolean

  /** Maximum number of events to keep in buffer */
  maxEvents?: number

  /** Payload preview mode */
  payloadMode?: PayloadMode

  /** Maximum bytes to include in payload preview */
  maxPayloadPreviewBytes?: number

  /** Keyboard shortcut to open inspector */
  shortcut?: string

  /** Event batching options */
  batching?: {
    /** Enable event batching (default: true) */
    enabled?: boolean
    /** Maximum batch size in number of events (default: 50) */
    maxBatchSize?: number
    /** Maximum time to wait before flushing batch in ms (default: 100) */
    maxBatchDelay?: number
  }
}

/**
 * Default inspector options
 */
export const DEFAULT_INSPECTOR_OPTIONS: Required<InspectorOptions> = {
  enabled: process.env.NODE_ENV !== 'production',
  openOnStart: false,
  maxEvents: 5000,
  payloadMode: 'redacted',
  maxPayloadPreviewBytes: 10_000,
  shortcut: 'CommandOrControl+Shift+I',
  batching: {
    enabled: true,
    maxBatchSize: 50,
    maxBatchDelay: 100,
  },
}

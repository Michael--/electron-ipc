import { BrowserWindow, WebContents } from 'electron'
import { RingBuffer } from './ring-buffer'
import type { InspectorOptions, PayloadMode, TraceEvent } from './types'
import { DEFAULT_INSPECTOR_OPTIONS } from './types'

/**
 * Subscriber for inspector events
 */
interface InspectorSubscriber {
  webContents: WebContents
  windowId: number
}

/**
 * Inspector server that manages trace events and subscribers
 *
 * Maintains a ring buffer of trace events and broadcasts them to
 * connected inspector UI windows.
 */
export class InspectorServer {
  private buffer: RingBuffer<TraceEvent>
  private subscribers = new Map<number, InspectorSubscriber>()
  private isPaused = false
  private droppedCount = 0
  private options: Required<InspectorOptions>

  /**
   * Creates a new inspector server
   *
   * @param options - Inspector configuration options
   */
  constructor(options: InspectorOptions = {}) {
    this.options = { ...DEFAULT_INSPECTOR_OPTIONS, ...options }
    this.buffer = new RingBuffer<TraceEvent>(this.options.maxEvents)
  }

  /**
   * Pushes a new trace event
   *
   * @param event - Trace event to add
   */
  push(event: TraceEvent): void {
    if (this.isPaused) {
      return
    }

    // Track if we're dropping events
    if (this.buffer.isFull()) {
      this.droppedCount++
    }

    this.buffer.push(event)

    // Broadcast to all subscribers
    this.broadcast({
      channel: 'INSPECTOR:EVENT',
      payload: { event },
    })
  }

  /**
   * Gets a snapshot of all events
   */
  snapshot(): TraceEvent[] {
    return this.buffer.getAll()
  }

  /**
   * Clears all events
   */
  clear(): void {
    this.buffer.clear()
    this.droppedCount = 0

    this.broadcast({
      channel: 'INSPECTOR:STATUS',
      payload: this.getStatus(),
    })
  }

  /**
   * Pauses event collection
   */
  pause(): void {
    this.isPaused = true

    this.broadcast({
      channel: 'INSPECTOR:STATUS',
      payload: this.getStatus(),
    })
  }

  /**
   * Resumes event collection
   */
  resume(): void {
    this.isPaused = false

    this.broadcast({
      channel: 'INSPECTOR:STATUS',
      payload: this.getStatus(),
    })
  }

  /**
   * Sets the payload mode
   *
   * @param mode - New payload mode
   */
  setPayloadMode(mode: PayloadMode): void {
    this.options.payloadMode = mode

    this.broadcast({
      channel: 'INSPECTOR:STATUS',
      payload: this.getStatus(),
    })
  }

  /**
   * Gets current status
   */
  getStatus() {
    return {
      isTracing: !this.isPaused,
      eventCount: this.buffer.getSize(),
      droppedCount: this.droppedCount,
      payloadMode: this.options.payloadMode,
    }
  }

  /**
   * Gets the current options
   */
  getOptions(): Required<InspectorOptions> {
    return { ...this.options }
  }

  /**
   * Subscribes an inspector window
   *
   * @param window - Inspector window to subscribe
   */
  subscribe(window: BrowserWindow): void {
    if (window.isDestroyed()) {
      return
    }

    const subscriber: InspectorSubscriber = {
      webContents: window.webContents,
      windowId: window.id,
    }

    this.subscribers.set(window.id, subscriber)

    // Auto-cleanup when window is destroyed
    window.once('closed', () => {
      this.unsubscribe(window.id)
    })

    // Send initial snapshot
    this.sendInit(subscriber)
  }

  /**
   * Unsubscribes an inspector window
   *
   * @param windowId - Window ID to unsubscribe
   */
  unsubscribe(windowId: number): void {
    this.subscribers.delete(windowId)
  }

  /**
   * Gets the number of active subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size
  }

  /**
   * Sends initial state to a subscriber
   */
  private sendInit(subscriber: InspectorSubscriber): void {
    if (subscriber.webContents.isDestroyed()) {
      return
    }

    subscriber.webContents.send('INSPECTOR:INIT', {
      events: this.snapshot(),
      config: {
        enabled: this.options.enabled,
        maxEvents: this.options.maxEvents,
        payloadMode: this.options.payloadMode,
        maxPayloadPreviewBytes: this.options.maxPayloadPreviewBytes,
      },
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcasts a message to all subscribers
   */
  private broadcast(message: { channel: string; payload: unknown }): void {
    // Clean up destroyed webContents
    const toRemove: number[] = []

    this.subscribers.forEach((subscriber, windowId) => {
      if (subscriber.webContents.isDestroyed()) {
        toRemove.push(windowId)
        return
      }

      try {
        subscriber.webContents.send(message.channel, message.payload)
      } catch (error) {
        console.error('[InspectorServer] Failed to broadcast:', error)
        toRemove.push(windowId)
      }
    })

    // Remove destroyed subscribers
    toRemove.forEach((id) => this.subscribers.delete(id))
  }

  /**
   * Exports events as JSON
   */
  exportJson(): string {
    const data = {
      version: '1.0',
      timestamp: Date.now(),
      events: this.snapshot(),
      stats: {
        totalEvents: this.buffer.getSize(),
        droppedEvents: this.droppedCount,
        capacity: this.buffer.getCapacity(),
      },
    }

    return JSON.stringify(data, null, 2)
  }
}

// Singleton instance
let serverInstance: InspectorServer | null = null

/**
 * Gets or creates the global inspector server
 *
 * @param options - Inspector options (only used on first call)
 */
export function getInspectorServer(options?: InspectorOptions): InspectorServer {
  if (!serverInstance) {
    serverInstance = new InspectorServer(options)
  }
  return serverInstance
}

/**
 * Resets the inspector server (for testing)
 */
export function resetInspectorServer(): void {
  serverInstance = null
}

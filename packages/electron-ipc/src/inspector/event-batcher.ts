/**
 * Event Batcher for Inspector
 *
 * Batches trace events to reduce IPC overhead
 */

import type { TraceEvent } from './types'

/**
 * Callback when batch is ready to send
 */
export type BatchCallback = (events: TraceEvent[]) => void

/**
 * Event batcher configuration
 */
export interface BatcherOptions {
  /** Maximum batch size in number of events */
  maxBatchSize: number
  /** Maximum time to wait before flushing batch in ms */
  maxBatchDelay: number
}

/**
 * Batches events and flushes them periodically
 */
export class EventBatcher {
  private batch: TraceEvent[] = []
  private timer: NodeJS.Timeout | null = null

  constructor(
    private options: BatcherOptions,
    private onFlush: BatchCallback
  ) {}

  /**
   * Adds an event to the batch
   */
  add(event: TraceEvent): void {
    this.batch.push(event)

    // Flush if batch is full
    if (this.batch.length >= this.options.maxBatchSize) {
      this.flush()
      return
    }

    // Start timer if not already running
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush()
      }, this.options.maxBatchDelay)
    }
  }

  /**
   * Flushes the current batch
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.batch.length === 0) {
      return
    }

    // Call callback with batch
    this.onFlush([...this.batch])
    this.batch = []
  }

  /**
   * Clears the batch without flushing
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.batch = []
  }

  /**
   * Gets current batch size
   */
  getSize(): number {
    return this.batch.length
  }
}

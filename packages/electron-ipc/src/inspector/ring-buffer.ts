/**
 * Fixed-size ring buffer for trace events
 *
 * Efficiently stores a limited number of events with O(1) push operation.
 * When the buffer is full, new events overwrite the oldest ones.
 */
export class RingBuffer<T> {
  private buffer: T[]
  private head = 0
  private size = 0
  private readonly capacity: number

  /**
   * Creates a new ring buffer
   *
   * @param capacity - Maximum number of items to store
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be greater than 0')
    }
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  /**
   * Adds an item to the buffer
   *
   * If the buffer is full, overwrites the oldest item
   *
   * @param item - Item to add
   */
  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity

    if (this.size < this.capacity) {
      this.size++
    }
  }

  /**
   * Gets all items in chronological order (oldest to newest)
   */
  getAll(): T[] {
    if (this.size === 0) {
      return []
    }

    if (this.size < this.capacity) {
      // Buffer not full yet, return items from start to head
      return this.buffer.slice(0, this.size)
    }

    // Buffer is full, items are from head (oldest) to head-1 (newest)
    const result: T[] = []
    for (let i = 0; i < this.capacity; i++) {
      const index = (this.head + i) % this.capacity
      result.push(this.buffer[index])
    }
    return result
  }

  /**
   * Gets the most recent N items
   *
   * @param count - Number of items to retrieve
   */
  getRecent(count: number): T[] {
    if (count <= 0) {
      return []
    }

    const actualCount = Math.min(count, this.size)
    const result: T[] = []

    for (let i = 0; i < actualCount; i++) {
      // Work backwards from most recent
      const index = (this.head - 1 - i + this.capacity) % this.capacity
      result.unshift(this.buffer[index])
    }

    return result
  }

  /**
   * Clears all items from the buffer
   */
  clear(): void {
    this.buffer = new Array(this.capacity)
    this.head = 0
    this.size = 0
  }

  /**
   * Gets the number of items currently stored
   */
  getSize(): number {
    return this.size
  }

  /**
   * Gets the maximum capacity of the buffer
   */
  getCapacity(): number {
    return this.capacity
  }

  /**
   * Checks if the buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity
  }

  /**
   * Checks if the buffer is empty
   */
  isEmpty(): boolean {
    return this.size === 0
  }
}

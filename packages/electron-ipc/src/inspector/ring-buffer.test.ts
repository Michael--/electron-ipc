import { beforeEach, describe, expect, it } from 'vitest'
import { RingBuffer } from './ring-buffer'

describe('RingBuffer', () => {
  describe('constructor', () => {
    it('should create a buffer with given capacity', () => {
      const buffer = new RingBuffer<number>(5)
      expect(buffer.getCapacity()).toBe(5)
      expect(buffer.getSize()).toBe(0)
      expect(buffer.isEmpty()).toBe(true)
      expect(buffer.isFull()).toBe(false)
    })

    it('should throw error for invalid capacity', () => {
      expect(() => new RingBuffer<number>(0)).toThrow('capacity must be greater than 0')
      expect(() => new RingBuffer<number>(-1)).toThrow('capacity must be greater than 0')
    })
  })

  describe('push and getAll', () => {
    let buffer: RingBuffer<number>

    beforeEach(() => {
      buffer = new RingBuffer<number>(3)
    })

    it('should add items and retrieve them in order', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)

      expect(buffer.getAll()).toEqual([1, 2, 3])
      expect(buffer.getSize()).toBe(3)
      expect(buffer.isFull()).toBe(true)
    })

    it('should overwrite oldest items when buffer is full', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      buffer.push(4) // overwrites 1

      expect(buffer.getAll()).toEqual([2, 3, 4])
      expect(buffer.getSize()).toBe(3)
    })

    it('should continue wrapping around correctly', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      buffer.push(4) // overwrites 1
      buffer.push(5) // overwrites 2
      buffer.push(6) // overwrites 3

      expect(buffer.getAll()).toEqual([4, 5, 6])
    })

    it('should handle single item buffer', () => {
      const single = new RingBuffer<number>(1)
      single.push(1)
      expect(single.getAll()).toEqual([1])

      single.push(2)
      expect(single.getAll()).toEqual([2])
    })
  })

  describe('getRecent', () => {
    let buffer: RingBuffer<number>

    beforeEach(() => {
      buffer = new RingBuffer<number>(5)
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      buffer.push(4)
      buffer.push(5)
    })

    it('should return most recent N items', () => {
      expect(buffer.getRecent(3)).toEqual([3, 4, 5])
      expect(buffer.getRecent(2)).toEqual([4, 5])
      expect(buffer.getRecent(1)).toEqual([5])
    })

    it('should return all items if count exceeds size', () => {
      expect(buffer.getRecent(10)).toEqual([1, 2, 3, 4, 5])
    })

    it('should return empty array for count <= 0', () => {
      expect(buffer.getRecent(0)).toEqual([])
      expect(buffer.getRecent(-1)).toEqual([])
    })

    it('should work correctly after buffer wraps around', () => {
      buffer.push(6) // overwrites 1
      buffer.push(7) // overwrites 2

      expect(buffer.getRecent(3)).toEqual([5, 6, 7])
      expect(buffer.getAll()).toEqual([3, 4, 5, 6, 7])
    })
  })

  describe('clear', () => {
    it('should remove all items', () => {
      const buffer = new RingBuffer<number>(3)
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)

      buffer.clear()

      expect(buffer.isEmpty()).toBe(true)
      expect(buffer.getSize()).toBe(0)
      expect(buffer.getAll()).toEqual([])
    })

    it('should allow pushing after clear', () => {
      const buffer = new RingBuffer<number>(3)
      buffer.push(1)
      buffer.push(2)
      buffer.clear()

      buffer.push(10)
      buffer.push(20)

      expect(buffer.getAll()).toEqual([10, 20])
    })
  })

  describe('size and capacity', () => {
    it('should track size correctly', () => {
      const buffer = new RingBuffer<number>(5)

      expect(buffer.getSize()).toBe(0)
      buffer.push(1)
      expect(buffer.getSize()).toBe(1)
      buffer.push(2)
      expect(buffer.getSize()).toBe(2)
    })

    it('should not increase size beyond capacity', () => {
      const buffer = new RingBuffer<number>(3)

      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      expect(buffer.getSize()).toBe(3)

      buffer.push(4)
      expect(buffer.getSize()).toBe(3) // still 3
    })
  })

  describe('isEmpty and isFull', () => {
    it('should correctly report empty state', () => {
      const buffer = new RingBuffer<number>(2)
      expect(buffer.isEmpty()).toBe(true)

      buffer.push(1)
      expect(buffer.isEmpty()).toBe(false)
    })

    it('should correctly report full state', () => {
      const buffer = new RingBuffer<number>(2)
      expect(buffer.isFull()).toBe(false)

      buffer.push(1)
      expect(buffer.isFull()).toBe(false)

      buffer.push(2)
      expect(buffer.isFull()).toBe(true)
    })
  })

  describe('complex objects', () => {
    interface TestObject {
      id: number
      name: string
    }

    it('should handle complex objects', () => {
      const buffer = new RingBuffer<TestObject>(3)

      buffer.push({ id: 1, name: 'a' })
      buffer.push({ id: 2, name: 'b' })
      buffer.push({ id: 3, name: 'c' })

      expect(buffer.getAll()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ])
    })

    it('should maintain object references', () => {
      const buffer = new RingBuffer<TestObject>(2)
      const obj1 = { id: 1, name: 'a' }
      const obj2 = { id: 2, name: 'b' }

      buffer.push(obj1)
      buffer.push(obj2)

      const results = buffer.getAll()
      expect(results[0]).toBe(obj1) // same reference
      expect(results[1]).toBe(obj2) // same reference
    })
  })
})

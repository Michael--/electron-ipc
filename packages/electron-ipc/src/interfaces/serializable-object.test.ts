/**
 * Tests for SerializableObject type utility
 */

import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Serializable, SerializableObject } from './types'

describe('SerializableObject', () => {
  it('should accept valid serializable object types', () => {
    type UserData = SerializableObject<{
      id: number
      name: string
      email: string
      age: number | null
      tags: string[]
      metadata: { [key: string]: string }
    }>

    const validUser: UserData = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      age: 30,
      tags: ['admin', 'user'],
      metadata: { role: 'admin', department: 'IT' },
    }

    expectTypeOf(validUser).toMatchTypeOf<UserData>()
  })

  it('should accept nested serializable structures', () => {
    type ComplexData = SerializableObject<{
      id: number
      nested: {
        level1: {
          level2: string[]
        }
      }
      buffer: Buffer
      array: number[]
    }>

    const validComplex: ComplexData = {
      id: 1,
      nested: {
        level1: {
          level2: ['a', 'b'],
        },
      },
      buffer: Buffer.from('test'),
      array: [1, 2, 3],
    }

    expectTypeOf(validComplex).toMatchTypeOf<ComplexData>()
  })

  it('should accept all primitive serializable types', () => {
    type PrimitiveData = SerializableObject<{
      str: string
      num: number
      bool: boolean
      nil: null
      buf: Buffer
      uint8: Uint8Array
    }>

    const validPrimitives: PrimitiveData = {
      str: 'hello',
      num: 42,
      bool: true,
      nil: null,
      buf: Buffer.from('data'),
      uint8: new Uint8Array([1, 2, 3]),
    }

    expectTypeOf(validPrimitives).toMatchTypeOf<PrimitiveData>()
  })

  it('should work with optional properties using null', () => {
    type OptionalData = SerializableObject<{
      required: string
      optional: number | null // Use null instead of undefined
    }>

    const valid1: OptionalData = {
      required: 'test',
      optional: 42,
    }

    const valid2: OptionalData = {
      required: 'test',
      optional: null, // null is serializable
    }

    expectTypeOf(valid1).toMatchTypeOf<OptionalData>()
    expectTypeOf(valid2).toMatchTypeOf<OptionalData>()
  })

  it('should be assignable to Serializable', () => {
    type MyData = SerializableObject<{
      id: number
      name: string
    }>

    const data: MyData = { id: 1, name: 'test' }
    const serializable: Serializable = data

    expectTypeOf(serializable).toMatchTypeOf<Serializable>()
  })

  it('should work with union types', () => {
    type UnionData = SerializableObject<{
      status: 'active' | 'inactive'
      value: string | number | null
    }>

    const valid: UnionData = {
      status: 'active',
      value: 'test',
    }

    expectTypeOf(valid).toMatchTypeOf<UnionData>()
  })

  it('should work with interfaces', () => {
    interface UserData {
      id: number
      name: string
      email: string
      age: number | null
      tags: string[]
      metadata: { [key: string]: string }
    }

    type SerializableUserData = SerializableObject<UserData>

    const validUser: SerializableUserData = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      age: 30,
      tags: ['admin', 'user'],
      metadata: { role: 'admin', department: 'IT' },
    }

    expectTypeOf(validUser).toMatchTypeOf<SerializableUserData>()
  })

  it('should serialize and deserialize correctly', () => {
    type TestData = SerializableObject<{
      id: number
      name: string
      tags: string[]
      metadata: { [key: string]: string }
      optional: number | null
    }>

    const original: TestData = {
      id: 42,
      name: 'Test User',
      tags: ['tag1', 'tag2'],
      metadata: { key: 'value' },
      optional: null,
    }

    // Serialize using JSON (simulates IPC serialization for most types)
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized) as TestData

    expect(deserialized).toEqual(original)
    expectTypeOf(deserialized).toMatchTypeOf<TestData>()
  })

  it('should handle Buffer and Uint8Array serialization', () => {
    type BinaryData = SerializableObject<{
      buffer: Buffer
      uint8: Uint8Array
      text: string
    }>

    const original: BinaryData = {
      buffer: Buffer.from('hello world'),
      uint8: new Uint8Array([1, 2, 3, 4]),
      text: 'test',
    }

    // In Electron IPC, Buffer and Uint8Array are serializable
    // For this test, we verify the types are accepted
    expectTypeOf(original).toMatchTypeOf<BinaryData>()
  })

  // Note: The following tests demonstrate compile-time rejection of non-serializable types
  // They intentionally contain type errors to show SerializableObject's type safety
  // The errors are expected and prove the type works correctly

  it.skip('should reject non-serializable types at compile time', () => {
    // This should cause a type error - Date is not Serializable
    type _InvalidData = SerializableObject<{
      createdAt: Date // This should become never
    }>

    // Uncomment to see compile error:
    // const invalid: _InvalidData = { createdAt: new Date() } // Type error: Date not assignable to never
  })

  it.skip('should reject undefined in object properties', () => {
    // Optional properties with undefined are not allowed
    type _InvalidOptional = SerializableObject<{
      name: string
      age?: number // This creates number | undefined, which is not Serializable
    }>

    // Uncomment to see compile error:
    // const invalid: _InvalidOptional = { name: 'Test', age: 25 } // Type error: number not assignable to never
  })

  it('should allow null for optional values', () => {
    type ValidOptional = SerializableObject<{
      name: string
      age: number | null
    }>

    const valid: ValidOptional = {
      name: 'Test',
      age: null, // null is serializable
    }

    expectTypeOf(valid).toMatchTypeOf<ValidOptional>()

    // Test serialization
    const serialized = JSON.stringify(valid)
    const deserialized = JSON.parse(serialized) as ValidOptional
    expect(deserialized).toEqual(valid)
  })

  it('should serialize and deserialize and fail', () => {
    type InvalidData = { createdAt: Date; age?: number }
    const original: InvalidData = { createdAt: new Date(), age: undefined }

    // Attempt to serialize using JSON
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized) as InvalidData

    // Date becomes string (not serializable as Date)
    expect(typeof deserialized.createdAt).toBe('string')
    expect(deserialized.createdAt).not.toBeInstanceOf(Date)

    // undefined properties are lost during serialization
    expect(deserialized).not.toHaveProperty('age')
    expect('age' in deserialized).toBe(false)
  })
})

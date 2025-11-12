/**
 * Tests for SerializableObject type utility
 */

import { describe, expectTypeOf, it } from 'vitest'
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

  // ...existing code...

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
})

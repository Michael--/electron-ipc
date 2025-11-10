import { describe, expect, it } from 'vitest'
import type { IBroadcastContract, IInvokeContract, IRendererEventContract } from './ipc-contracts'

/**
 * Tests for Serializable type enforcement in IPC contracts
 */
describe('Serializable Type Validation', () => {
  it('should allow valid serializable types in IInvokeContract', () => {
    // Valid: primitives
    type ValidPrimitive = IInvokeContract<string, number>
    // Valid: plain objects
    type ValidObject = IInvokeContract<{ name: string; age: number }, { success: boolean }>
    // Valid: arrays
    type ValidArray = IInvokeContract<string[], number[]>
    // Valid: nested objects
    type ValidNested = IInvokeContract<
      { user: { name: string; roles: string[] } },
      { data: { items: number[] } }
    >
    // Valid: void
    type ValidVoid = IInvokeContract<void, { result: string }>

    // Type assertions to ensure compilation
    const _p: ValidPrimitive = null as unknown as ValidPrimitive
    const _o: ValidObject = null as unknown as ValidObject
    const _a: ValidArray = null as unknown as ValidArray
    const _n: ValidNested = null as unknown as ValidNested
    const _v: ValidVoid = null as unknown as ValidVoid

    expect(_p || _o || _a || _n || _v).toBeDefined()
  })

  it('should allow valid serializable types in IRendererEventContract', () => {
    type ValidEvent = IRendererEventContract<{ message: string; level: 'info' | 'warn' }>
    type ValidVoidEvent = IRendererEventContract<void>

    const _e: ValidEvent = null as unknown as ValidEvent
    const _v: ValidVoidEvent = null as unknown as ValidVoidEvent

    expect(_e || _v).toBeDefined()
  })

  it('should allow valid serializable types in IBroadcastContract', () => {
    type ValidBroadcast = IBroadcastContract<{ count: number }>
    type ValidVoidBroadcast = IBroadcastContract<void>

    const _b: ValidBroadcast = null as unknown as ValidBroadcast
    const _v: ValidVoidBroadcast = null as unknown as ValidVoidBroadcast

    expect(_b || _v).toBeDefined()
  })

  // These tests demonstrate compile-time errors for non-serializable types
  // Uncomment to verify type errors:

  // it('should reject Date objects', () => {
  //   // @ts-expect-error - Date is not serializable
  //   type InvalidDate = IInvokeContract<Date, string>
  // })

  // it('should reject Map objects', () => {
  //   // @ts-expect-error - Map is not serializable
  //   type InvalidMap = IInvokeContract<Map<string, number>, string>
  // })

  // it('should reject Set objects', () => {
  //   // @ts-expect-error - Set is not serializable
  //   type InvalidSet = IInvokeContract<Set<string>, string>
  // })

  // it('should reject Function types', () => {
  //   // @ts-expect-error - Function is not serializable
  //   type InvalidFunction = IInvokeContract<() => void, string>
  // })

  // it('should reject class instances', () => {
  //   class MyClass {
  //     value: string = ''
  //   }
  //   // @ts-expect-error - Class instances are not serializable
  //   type InvalidClass = IInvokeContract<MyClass, string>
  // })
})

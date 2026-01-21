/**
 * Demonstration file showing compile-time errors for non-serializable types.
 * This file intentionally contains type errors to demonstrate the Serializable validation.
 *
 * To verify the validation works:
 * 1. Uncomment the type definitions below
 * 2. Run TypeScript compiler or check in IDE
 * 3. You should see type errors for each non-serializable type
 */

import type { IInvokeContract } from './ipc-contracts'

// ❌ THESE SHOULD FAIL AT COMPILE TIME - Uncomment to test:

// Date objects are not serializable
// type InvalidDate = IInvokeContract<Date, string>

// Map is not serializable
// type InvalidMap = IInvokeContract<{ data: Map<string, number> }, string>

// Set is not serializable
// type InvalidSet = IRendererEventContract<{ items: Set<string> }>

// Functions are not serializable
// type InvalidFunction = IInvokeContract<() => void, string>

// Class instances are not serializable
// class UserClass {
//   name: string = ''
// }
// type InvalidClass = IBroadcastContract<UserClass>

// Symbols are not serializable
// type InvalidSymbol = IInvokeContract<symbol, string>

// Regular expressions are not serializable across IPC
// type InvalidRegex = IInvokeContract<RegExp, string>

// ✅ THESE SHOULD WORK - Valid serializable types:

type ValidString = IInvokeContract<string, string>
type ValidNumber = IInvokeContract<number, number>
type ValidBoolean = IInvokeContract<boolean, boolean>
type ValidNull = IInvokeContract<null, null>
type ValidObject = IInvokeContract<{ name: string; age: number }, { success: boolean }>
type ValidArray = IInvokeContract<string[], number[]>
type ValidVoid = IInvokeContract<void, { result: string }>
type ValidNested = IInvokeContract<
  { user: { name: string; tags: string[] } },
  { data: { items: { id: number; name: string }[] } }
>

// Export to avoid unused variable warnings
export type {
  ValidArray,
  ValidBoolean,
  ValidNested,
  ValidNull,
  ValidNumber,
  ValidObject,
  ValidString,
  ValidVoid,
}

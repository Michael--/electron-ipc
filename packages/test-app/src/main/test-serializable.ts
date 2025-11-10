/**
 * This file demonstrates that non-serializable types are rejected at compile-time.
 * Uncomment any of the type definitions to see TypeScript errors.
 */

import type { IInvokeContract } from 'electron-ipc'

// ❌ This should cause a compile error when uncommented:
// type InvalidDateContract = IInvokeContract<Date, string>

// ✅ This should work fine:
type ValidContract = IInvokeContract<{ timestamp: number }, string>

export type { ValidContract }

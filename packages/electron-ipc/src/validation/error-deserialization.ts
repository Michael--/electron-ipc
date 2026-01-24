/**
 * Error deserialization utilities for renderer process
 *
 * Automatically reconstructs IPCValidationError and IPCHandlerError
 * from serialized error objects received via IPC.
 */

import { IPCHandlerError, IPCValidationError } from './errors'
import type { SerializableHandlerError, SerializableValidationError } from './errors'

/**
 * Checks if an object is a serialized validation error
 */
function isSerializedValidationError(obj: unknown): obj is SerializableValidationError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    obj.code === 'IPC_VALIDATION_ERROR' &&
    'issues' in obj &&
    Array.isArray((obj as SerializableValidationError).issues)
  )
}

/**
 * Checks if an object is a serialized handler error
 */
function isSerializedHandlerError(obj: unknown): obj is SerializableHandlerError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    obj.name === 'IPCHandlerError' &&
    'code' in obj
  )
}

/**
 * Deserializes an error object from IPC transmission
 *
 * Automatically reconstructs IPCValidationError or IPCHandlerError
 * from their JSON representation. Returns unknown errors unchanged.
 *
 * @param error - Error object (serialized or plain Error)
 * @returns Reconstructed error instance
 *
 * @example
 * ```typescript
 * try {
 *   await window.api.invokeAddNumbers({ a: "invalid", b: 2 })
 * } catch (err) {
 *   const error = deserializeError(err)
 *   if (error instanceof IPCValidationError) {
 *     console.log('Validation issues:', error.issues)
 *   }
 * }
 * ```
 */
export function deserializeError(error: unknown): Error {
  if (isSerializedValidationError(error)) {
    return IPCValidationError.fromJSON(error)
  }

  if (isSerializedHandlerError(error)) {
    return IPCHandlerError.fromJSON(error)
  }

  // Return plain errors unchanged
  if (error instanceof Error) {
    return error
  }

  // Convert unknown errors to Error
  return new Error(String(error))
}

/**
 * Wraps an async function to automatically deserialize errors
 *
 * @param fn - Async function that may throw serialized errors
 * @returns Wrapped function that deserializes errors before throwing
 *
 * @example
 * ```typescript
 * const safeInvoke = withErrorDeserialization(
 *   async (params) => window.api.invokeAddNumbers(params)
 * )
 *
 * try {
 *   await safeInvoke({ a: "invalid", b: 2 })
 * } catch (err) {
 *   // err is automatically deserialized
 *   if (err instanceof IPCValidationError) {
 *     console.log('Validation failed:', err.issues)
 *   }
 * }
 * ```
 */
export function withErrorDeserialization<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw deserializeError(error)
    }
  }
}

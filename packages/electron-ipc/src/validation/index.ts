/**
 * Validation module for type-safe runtime validation
 *
 * Provides adapters for popular validation libraries (Zod, Valibot)
 * and standardized error handling for IPC communication.
 *
 * @module @number10/electron-ipc/validation
 */

// Core types
export type {
  Validator,
  ValidationResult,
  SafeParseFunction,
  SafeParseResult,
  InvokeValidationOptions,
  StreamValidationOptions,
} from './types'

// Error types
export type {
  ValidationIssue,
  SerializableValidationError,
  SerializableHandlerError,
} from './errors'

export {
  IPCValidationError,
  IPCHandlerError,
  isIPCValidationError,
  isIPCHandlerError,
  formatValidationIssues,
} from './errors'

// Validation helpers
export {
  validatorFromSafeParse,
  ensureValid,
  withInvokeValidation,
  withEventValidation,
  withStreamInvokeValidation,
  withStreamDownloadValidation,
  withStreamUploadValidation,
} from './helpers'

// Adapter exports (type-only to avoid dependency requirements)
export type { ZodType, ZodIssue, ZodError } from './adapters/zod'
export type { BaseSchema, BaseIssue, ValibotPathItem } from './adapters/valibot'

/**
 * Re-export adapter functions under namespaces for clarity
 */
export * as zodAdapter from './adapters/zod'
export * as valibotAdapter from './adapters/valibot'

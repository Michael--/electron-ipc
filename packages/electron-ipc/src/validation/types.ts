/**
 * Core validation types used throughout the validation system
 */

/**
 * Result of a validation operation
 */
export type ValidationResult<T> = { success: true; data: T } | { success: false; error: Error }

/**
 * Validator function that transforms unknown input into typed output
 *
 * @param input - Unknown input to validate
 * @returns Validation result with typed data or error
 */
export type Validator<T> = (input: unknown) => ValidationResult<T>

/**
 * SafeParse-style result (Zod/Valibot compatible)
 */
export type SafeParseResult<T> = { success: true; data: T } | { success: false; error?: unknown }

/**
 * SafeParse-style function signature
 */
export type SafeParseFunction<T> = (input: unknown) => SafeParseResult<T>

/**
 * Validation options for invoke handlers
 */
export interface InvokeValidationOptions<TReq, TRes> {
  /** Request payload validator */
  request: Validator<TReq>
  /** Response payload validator (optional) */
  response?: Validator<TRes>
}

/**
 * Validation options for stream handlers
 */
export interface StreamValidationOptions<TReq, TData> {
  /** Request payload validator */
  request: Validator<TReq>
  /** Stream chunk validator (optional) */
  data?: Validator<TData>
}

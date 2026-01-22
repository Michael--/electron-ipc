import type { IpcMainInvokeEvent } from 'electron'
import { IPCValidationError } from './errors'
import type {
  InvokeValidationOptions,
  SafeParseFunction,
  StreamValidationOptions,
  ValidationResult,
  Validator,
} from './types'

/**
 * Normalizes any error to Error instance
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error ?? 'Validation error'))
}

/**
 * Validates a ReadableStream by wrapping it with chunk validation
 */
function validateReadableStream<T>(
  stream: ReadableStream<T>,
  validator: Validator<T>
): ReadableStream<T> {
  const reader = stream.getReader()
  let released = false

  const releaseLock = () => {
    if (released) return
    released = true
    reader.releaseLock()
  }

  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          releaseLock()
          controller.close()
          return
        }
        const validated = ensureValid(validator, value)
        controller.enqueue(validated)
      } catch (error) {
        releaseLock()
        controller.error(error)
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason)
      } finally {
        releaseLock()
      }
    },
  })
}

/**
 * Adapts a safeParse-style function (Zod/Valibot) into a Validator
 *
 * @param safeParse - safeParse function from validation library
 * @param toError - Optional error transformer
 * @returns Validator function
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * const validator = validatorFromSafeParse(z.string().safeParse)
 * ```
 */
export function validatorFromSafeParse<T>(
  safeParse: SafeParseFunction<T>,
  toError?: (error: unknown) => Error
): Validator<T> {
  return (input: unknown): ValidationResult<T> => {
    const result = safeParse(input)
    if (result.success) return { success: true, data: result.data }
    const error = toError ? toError(result.error) : normalizeError(result.error)
    return { success: false, error }
  }
}

/**
 * Ensures input is valid or throws
 *
 * @param validator - Validator function
 * @param input - Input to validate
 * @returns Validated data
 * @throws {IPCValidationError} If validation fails
 */
export function ensureValid<T>(validator: Validator<T>, input: unknown): T {
  const result = validator(input)
  if (!result.success) throw result.error
  return result.data
}

/**
 * Wraps invoke handler with request/response validation
 *
 * @param validators - Request and optional response validators
 * @param handler - Handler function to wrap
 * @returns Wrapped handler with validation
 *
 * @example
 * ```typescript
 * import { zodValidator } from '@number10/electron-ipc/validation/adapters/zod'
 * import { z } from 'zod'
 *
 * const handler = withInvokeValidation(
 *   {
 *     request: zodValidator(z.object({ a: z.number(), b: z.number() })),
 *     response: zodValidator(z.number())
 *   },
 *   async (_event, { a, b }) => a + b
 * )
 * ```
 */
export function withInvokeValidation<TReq, TRes>(
  validators: InvokeValidationOptions<TReq, TRes>,
  handler: (event: IpcMainInvokeEvent, request: TReq) => Promise<TRes> | TRes
): (event: IpcMainInvokeEvent, request: TReq) => Promise<TRes> {
  return async (event, request) => {
    try {
      const validatedRequest = ensureValid(validators.request, request)
      const result = await handler(event, validatedRequest)
      if (validators.response) {
        return ensureValid(validators.response, result)
      }
      return result
    } catch (error) {
      // Re-throw validation errors with additional context
      if (error instanceof IPCValidationError) {
        throw error
      }
      throw error
    }
  }
}

/**
 * Wraps event handler with payload validation
 *
 * @param validator - Payload validator
 * @param handler - Handler function to wrap
 * @returns Wrapped handler with validation
 */
export function withEventValidation<TReq>(
  validator: Validator<TReq>,
  handler: (event: IpcMainInvokeEvent, request: TReq) => void
): (event: IpcMainInvokeEvent, request: TReq) => void {
  return (event, request) => {
    const validatedRequest = ensureValid(validator, request)
    handler(event, validatedRequest)
  }
}

/**
 * Wraps stream invoke handler with request and chunk validation
 *
 * @param validators - Request and optional chunk validators
 * @param handler - Handler function to wrap
 * @returns Wrapped handler with validation
 */
export function withStreamInvokeValidation<TReq, TData>(
  validators: StreamValidationOptions<TReq, TData>,
  handler: (event: IpcMainInvokeEvent, request: TReq) => ReadableStream<TData>
): (event: IpcMainInvokeEvent, request: TReq) => ReadableStream<TData> {
  return (event, request) => {
    const validatedRequest = ensureValid(validators.request, request)
    const stream = handler(event, validatedRequest)
    if (!validators.data) return stream
    return validateReadableStream(stream, validators.data)
  }
}

/**
 * Wraps stream download handler with request and chunk validation
 *
 * @param validators - Request and optional chunk validators
 * @param handler - Handler function to wrap
 * @returns Wrapped handler with validation
 */
export function withStreamDownloadValidation<TReq, TData>(
  validators: StreamValidationOptions<TReq, TData>,
  handler: (request: TReq, event: IpcMainInvokeEvent) => ReadableStream<TData>
): (request: TReq, event: IpcMainInvokeEvent) => ReadableStream<TData> {
  return (request, event) => {
    const validatedRequest = ensureValid(validators.request, request)
    const stream = handler(validatedRequest, event)
    if (!validators.data) return stream
    return validateReadableStream(stream, validators.data)
  }
}

/**
 * Wraps stream upload handler with request and chunk validation
 *
 * @param validators - Request and optional chunk validators
 * @param handler - Handler function to wrap
 * @returns Wrapped handler with validation
 */
export function withStreamUploadValidation<TReq, TData>(
  validators: StreamValidationOptions<TReq, TData>,
  handler: (
    request: TReq,
    onData: (callback: (chunk: TData) => void) => void,
    onEnd: (callback: () => void) => void,
    onError: (callback: (error: unknown) => void) => void
  ) => void
): (
  request: TReq,
  onData: (callback: (chunk: TData) => void) => void,
  onEnd: (callback: () => void) => void,
  onError: (callback: (error: unknown) => void) => void
) => void {
  return (request, onData, onEnd, onError) => {
    const validatedRequest = ensureValid(validators.request, request)
    let errorCallback: ((error: unknown) => void) | null = null

    const onErrorWrapped = (callback: (error: unknown) => void) => {
      errorCallback = callback
      onError(callback)
    }

    const onDataWrapped = (callback: (chunk: TData) => void) => {
      onData((chunk) => {
        try {
          const validatedChunk = validators.data ? ensureValid(validators.data, chunk) : chunk
          callback(validatedChunk)
        } catch (error) {
          if (errorCallback) errorCallback(error)
        }
      })
    }

    handler(validatedRequest, onDataWrapped, onEnd, onErrorWrapped)
  }
}

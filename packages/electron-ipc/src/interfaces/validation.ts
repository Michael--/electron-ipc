import type { IpcMainInvokeEvent } from 'electron'

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: Error }

export type Validator<T> = (input: unknown) => ValidationResult<T>

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error?: unknown }

export type SafeParseFunction<T> = (input: unknown) => SafeParseResult<T>

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error ?? 'Validation error'))
}

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
 * Adapts a safeParse-style function (Zod/Valibot/etc.) into a Validator.
 */
export function validatorFromSafeParse<T>(
  safeParse: SafeParseFunction<T>,
  toError?: (error: unknown) => Error
): Validator<T> {
  return (input: unknown) => {
    const result = safeParse(input)
    if (result.success) return { success: true, data: result.data }
    const error = toError ? toError(result.error) : normalizeError(result.error)
    return { success: false, error }
  }
}

export function ensureValid<T>(validator: Validator<T>, input: unknown): T {
  const result = validator(input)
  if (!result.success) throw result.error
  return result.data
}

export function withInvokeValidation<TReq, TRes>(
  validators: { request: Validator<TReq>; response?: Validator<TRes> },
  handler: (event: IpcMainInvokeEvent, request: TReq) => Promise<TRes> | TRes
): (event: IpcMainInvokeEvent, request: TReq) => Promise<TRes> | TRes {
  return async (event, request) => {
    const validatedRequest = ensureValid(validators.request, request)
    const result = await handler(event, validatedRequest)
    if (validators.response) return ensureValid(validators.response, result)
    return result
  }
}

export function withEventValidation<TReq>(
  validator: Validator<TReq>,
  handler: (event: IpcMainInvokeEvent, request: TReq) => void
): (event: IpcMainInvokeEvent, request: TReq) => void {
  return (event, request) => {
    const validatedRequest = ensureValid(validator, request)
    handler(event, validatedRequest)
  }
}

export function withStreamInvokeValidation<TReq, TData>(
  validators: { request: Validator<TReq>; data?: Validator<TData> },
  handler: (event: IpcMainInvokeEvent, request: TReq) => ReadableStream<TData>
): (event: IpcMainInvokeEvent, request: TReq) => ReadableStream<TData> {
  return (event, request) => {
    const validatedRequest = ensureValid(validators.request, request)
    const stream = handler(event, validatedRequest)
    if (!validators.data) return stream
    return validateReadableStream(stream, validators.data)
  }
}

export function withStreamDownloadValidation<TReq, TData>(
  validators: { request: Validator<TReq>; data?: Validator<TData> },
  handler: (request: TReq, event: IpcMainInvokeEvent) => ReadableStream<TData>
): (request: TReq, event: IpcMainInvokeEvent) => ReadableStream<TData> {
  return (request, event) => {
    const validatedRequest = ensureValid(validators.request, request)
    const stream = handler(validatedRequest, event)
    if (!validators.data) return stream
    return validateReadableStream(stream, validators.data)
  }
}

export function withStreamUploadValidation<TReq, TData>(
  validators: { request: Validator<TReq>; data?: Validator<TData> },
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
          else throw error
        }
      })
    }

    handler(validatedRequest, onDataWrapped, onEnd, onErrorWrapped)
  }
}

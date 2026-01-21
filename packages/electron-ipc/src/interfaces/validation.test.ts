import type { IpcMainInvokeEvent } from 'electron'
import { describe, expect, it } from 'vitest'
import type { Validator } from './validation'
import {
  ensureValid,
  validatorFromSafeParse,
  withEventValidation,
  withInvokeValidation,
  withStreamDownloadValidation,
  withStreamInvokeValidation,
  withStreamUploadValidation,
} from './validation'

const numberValidator: Validator<number> = (input) => {
  if (typeof input === 'number') return { success: true, data: input }
  return { success: false, error: new Error('expected number') }
}

const requestValidator: Validator<{ value: number }> = (input) => {
  if (
    typeof input === 'object' &&
    input !== null &&
    typeof (input as { value?: number }).value === 'number'
  ) {
    return { success: true, data: input as { value: number } }
  }
  return { success: false, error: new Error('invalid request') }
}

const textValidator: Validator<string> = (input) => {
  if (typeof input === 'string') return { success: true, data: input }
  return { success: false, error: new Error('expected string') }
}

async function readAll<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader()
  const chunks: T[] = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return chunks
}

describe('Runtime validation helpers', () => {
  it('adapts safeParse into a validator', () => {
    const safeParse: (
      input: unknown
    ) => { success: true; data: string } | { success: false; error: string } = (input) => {
      if (typeof input === 'string') return { success: true, data: input.toUpperCase() }
      return { success: false, error: 'bad input' }
    }
    const validator = validatorFromSafeParse(
      safeParse,
      (error) => new Error(`invalid:${String(error)}`)
    )

    const ok = validator('test')
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data).toBe('TEST')

    const bad = validator(123)
    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.message).toBe('invalid:bad input')
  })

  it('throws when validation fails', () => {
    expect(() => ensureValid(textValidator, 123)).toThrow('expected string')
  })

  it('validates invoke request and response', async () => {
    const handler = withInvokeValidation(
      { request: requestValidator, response: numberValidator },
      async (_event, request) => request.value + 1
    )

    await expect(handler({} as IpcMainInvokeEvent, { value: 2 })).resolves.toBe(3)
    await expect(handler({} as IpcMainInvokeEvent, { value: 'nope' } as never)).rejects.toThrow(
      'invalid request'
    )

    const badResponse = withInvokeValidation(
      { request: requestValidator, response: numberValidator },
      async () => 'oops' as never
    )
    await expect(badResponse({} as IpcMainInvokeEvent, { value: 1 })).rejects.toThrow(
      'expected number'
    )
  })

  it('validates event payload', () => {
    const received: string[] = []
    const handler = withEventValidation(textValidator, (_event, message) => {
      received.push(message)
    })

    handler({} as IpcMainInvokeEvent, 'ok')
    expect(received).toEqual(['ok'])
    expect(() => handler({} as IpcMainInvokeEvent, 123 as never)).toThrow('expected string')
  })

  it('validates stream invoke request and data', async () => {
    const handler = withStreamInvokeValidation(
      { request: requestValidator, data: numberValidator },
      (_event, request) =>
        new ReadableStream<number | string>({
          start(controller) {
            controller.enqueue(request.value)
            controller.enqueue('bad')
            controller.close()
          },
        }) as ReadableStream<number>
    )

    const stream = handler({} as IpcMainInvokeEvent, { value: 1 })
    await expect(readAll(stream)).rejects.toThrow('expected number')
  })

  it('validates stream download request and data', async () => {
    const handler = withStreamDownloadValidation(
      { request: requestValidator, data: numberValidator },
      (request) =>
        new ReadableStream<number>({
          start(controller) {
            controller.enqueue(request.value)
            controller.close()
          },
        })
    )

    const stream = handler({ value: 5 }, {} as IpcMainInvokeEvent)
    await expect(readAll(stream)).resolves.toEqual([5])
    expect(() => handler({ value: 'nope' } as never, {} as IpcMainInvokeEvent)).toThrow(
      'invalid request'
    )
  })

  it('validates stream upload request and data', () => {
    const data: number[] = []
    const errors: string[] = []

    const handler = withStreamUploadValidation(
      {
        request: (input) => {
          if (
            typeof input === 'object' &&
            input !== null &&
            (input as { id?: string }).id === 'ok'
          ) {
            return { success: true, data: input as { id: string } }
          }
          return { success: false, error: new Error('invalid upload request') }
        },
        data: numberValidator,
      },
      (_request, onData, onEnd, onError) => {
        onData((chunk) => data.push(chunk))
        onError((error) => errors.push((error as Error).message))
        onEnd(() => {
          data.push(999)
        })
      }
    )

    let onDataCallback: (chunk: number) => void = () => undefined
    let onEndCallback: () => void = () => undefined

    handler(
      { id: 'ok' },
      (callback) => {
        onDataCallback = callback
      },
      (callback) => {
        onEndCallback = callback
      },
      (_callback) => undefined
    )

    onDataCallback(1)
    onDataCallback('bad' as never)
    onEndCallback()

    expect(data).toEqual([1, 999])
    expect(errors).toEqual(['expected number'])
    expect(() =>
      handler(
        { id: 'nope' } as never,
        () => undefined,
        () => undefined,
        () => undefined
      )
    ).toThrow('invalid upload request')
  })
})

import type { IpcMainInvokeEvent } from 'electron'
import { describe, expect, it } from 'vitest'
import { IPCValidationError } from './errors'
import {
  ensureValid,
  validatorFromSafeParse,
  withEventValidation,
  withInvokeValidation,
  withStreamDownloadValidation,
  withStreamInvokeValidation,
  withStreamUploadValidation,
} from './helpers'
import type { SafeParseFunction, Validator } from './types'

// Mock validators
const numberValidator: Validator<number> = (input) => {
  if (typeof input === 'number') return { success: true, data: input }
  return {
    success: false,
    error: new IPCValidationError('Expected number', [
      { path: [], message: 'Expected number', expected: 'number', received: typeof input },
    ]),
  }
}

const stringValidator: Validator<string> = (input) => {
  if (typeof input === 'string') return { success: true, data: input }
  return {
    success: false,
    error: new IPCValidationError('Expected string', [{ path: [], message: 'Expected string' }]),
  }
}

const objectValidator: Validator<{ value: number }> = (input) => {
  if (
    typeof input === 'object' &&
    input !== null &&
    typeof (input as { value?: number }).value === 'number'
  ) {
    return { success: true, data: input as { value: number } }
  }
  return {
    success: false,
    error: new IPCValidationError('Invalid object', [{ path: ['value'], message: 'Required' }]),
  }
}

describe('validatorFromSafeParse', () => {
  it('adapts safeParse function', () => {
    const safeParse: SafeParseFunction<number> = (input) => {
      if (typeof input === 'number') return { success: true, data: input }
      return { success: false, error: 'not a number' }
    }

    const validator = validatorFromSafeParse(safeParse)
    const good = validator(42)
    const bad = validator('nope')

    expect(good.success).toBe(true)
    if (good.success) expect(good.data).toBe(42)

    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.message).toContain('not a number')
  })

  it('uses custom error transformer', () => {
    const safeParse: SafeParseFunction<string> = (input) => {
      if (typeof input === 'string') return { success: true, data: input }
      return { success: false, error: { code: 'BAD_TYPE' } }
    }

    const toError = (err: unknown) => new Error(`Custom: ${JSON.stringify(err)}`)
    const validator = validatorFromSafeParse(safeParse, toError)
    const bad = validator(123)

    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.message).toContain('Custom:')
  })
})

describe('ensureValid', () => {
  it('returns data on success', () => {
    expect(ensureValid(numberValidator, 42)).toBe(42)
    expect(ensureValid(stringValidator, 'hello')).toBe('hello')
  })

  it('throws on failure', () => {
    expect(() => ensureValid(numberValidator, 'bad')).toThrow(IPCValidationError)
    expect(() => ensureValid(stringValidator, 123)).toThrow(IPCValidationError)
  })
})

describe('withInvokeValidation', () => {
  it('validates request and response', async () => {
    const handler = withInvokeValidation(
      { request: objectValidator, response: numberValidator },
      async (_event, req) => req.value + 1
    )

    const result = await handler({} as IpcMainInvokeEvent, { value: 5 })
    expect(result).toBe(6)
  })

  it('throws on invalid request', async () => {
    const handler = withInvokeValidation(
      { request: objectValidator, response: numberValidator },
      async (_event, req) => req.value
    )

    await expect(handler({} as IpcMainInvokeEvent, { bad: 'data' } as never)).rejects.toThrow(
      IPCValidationError
    )
  })

  it('throws on invalid response', async () => {
    const handler = withInvokeValidation(
      { request: objectValidator, response: numberValidator },
      async () => 'oops' as never
    )

    await expect(handler({} as IpcMainInvokeEvent, { value: 1 })).rejects.toThrow(
      IPCValidationError
    )
  })

  it('skips response validation if not provided', async () => {
    const handler = withInvokeValidation({ request: objectValidator }, async (_event, req) => ({
      result: req.value * 2,
    }))

    const result = await handler({} as IpcMainInvokeEvent, { value: 3 })
    expect(result).toEqual({ result: 6 })
  })
})

describe('withEventValidation', () => {
  it('validates event payload', () => {
    let received: string | null = null
    const handler = withEventValidation(stringValidator, (_event, payload) => {
      received = payload
    })

    handler({} as IpcMainInvokeEvent, 'test')
    expect(received).toBe('test')
  })

  it('throws on invalid payload', () => {
    const handler = withEventValidation(stringValidator, () => {})
    expect(() => handler({} as IpcMainInvokeEvent, 123 as never)).toThrow(IPCValidationError)
  })
})

describe('withStreamInvokeValidation', () => {
  it('validates request', () => {
    const handler = withStreamInvokeValidation({ request: objectValidator }, (_event, req) => {
      expect(req.value).toBe(10)
      return new ReadableStream()
    })

    handler({} as IpcMainInvokeEvent, { value: 10 })
  })

  it('validates stream chunks when data validator provided', async () => {
    const handler = withStreamInvokeValidation(
      { request: objectValidator, data: numberValidator },
      () => {
        return new ReadableStream({
          start(controller) {
            controller.enqueue(1)
            controller.enqueue(2)
            controller.close()
          },
        })
      }
    )

    const stream = handler({} as IpcMainInvokeEvent, { value: 1 })
    const reader = stream.getReader()

    const first = await reader.read()
    expect(first.value).toBe(1)

    const second = await reader.read()
    expect(second.value).toBe(2)

    const done = await reader.read()
    expect(done.done).toBe(true)
  })

  it('throws on invalid chunk', async () => {
    const handler = withStreamInvokeValidation(
      { request: objectValidator, data: numberValidator },
      () => {
        return new ReadableStream({
          start(controller) {
            controller.enqueue('bad' as never)
          },
        })
      }
    )

    const stream = handler({} as IpcMainInvokeEvent, { value: 1 })
    const reader = stream.getReader()

    await expect(reader.read()).rejects.toThrow(IPCValidationError)
  })
})

describe('withStreamDownloadValidation', () => {
  it('validates request and chunks', async () => {
    const handler = withStreamDownloadValidation(
      { request: objectValidator, data: stringValidator },
      (req) => {
        expect(req.value).toBe(5)
        return new ReadableStream({
          start(controller) {
            controller.enqueue('chunk1')
            controller.enqueue('chunk2')
            controller.close()
          },
        })
      }
    )

    const stream = handler({ value: 5 }, {} as IpcMainInvokeEvent)
    const reader = stream.getReader()

    const first = await reader.read()
    expect(first.value).toBe('chunk1')

    const second = await reader.read()
    expect(second.value).toBe('chunk2')
  })
})

describe('withStreamUploadValidation', () => {
  it('validates request', async () => {
    const handler = withStreamUploadValidation({ request: objectValidator }, (req) => {
      expect(req.value).toBe(7)
    })

    handler(
      { value: 7 },
      () => {},
      () => {},
      () => {}
    )
  })

  it('validates chunks when data validator provided', async () => {
    const received: number[] = []

    const handler = withStreamUploadValidation(
      { request: objectValidator, data: numberValidator },
      (_req, onData, onEnd) => {
        onData((chunk) => received.push(chunk))
        onEnd(() => {
          expect(received).toEqual([1, 2, 3])
        })
      }
    )

    await new Promise<void>((resolve) => {
      let dataCallback: ((chunk: number) => void) | null = null
      let endCallback: (() => void) | null = null

      handler(
        { value: 1 },
        (cb) => (dataCallback = cb),
        (cb) => {
          endCallback = () => {
            cb()
            resolve()
          }
        },
        () => {}
      )

      dataCallback?.(1)
      dataCallback?.(2)
      dataCallback?.(3)
      endCallback?.()
    })
  })

  it('calls error callback on invalid chunk', async () => {
    let errorReceived = false

    const handler = withStreamUploadValidation(
      { request: objectValidator, data: numberValidator },
      (_req, onData, _onEnd, onError) => {
        onError((error) => {
          errorReceived = true
          expect(error).toBeInstanceOf(IPCValidationError)
        })
        onData(() => {
          // This callback receives validated data
        })
      }
    )

    let dataCallback: ((chunk: unknown) => void) | null = null

    handler(
      { value: 1 },
      (cb) => (dataCallback = cb as never),
      () => {},
      () => {}
    )

    // Trigger error by sending invalid chunk
    dataCallback?.('invalid')

    // Wait a tick for async error handling
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(errorReceived).toBe(true)
  })
})

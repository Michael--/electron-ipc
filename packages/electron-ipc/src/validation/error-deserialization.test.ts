import { describe, expect, it } from 'vitest'
import { deserializeError, withErrorDeserialization } from './error-deserialization'
import { IPCHandlerError, IPCValidationError } from './errors'
import type { SerializableHandlerError, SerializableValidationError } from './errors'

describe('deserializeError', () => {
  it('deserializes IPCValidationError', () => {
    const serialized: SerializableValidationError = {
      name: 'IPCValidationError',
      message: 'Validation failed',
      code: 'IPC_VALIDATION_ERROR',
      issues: [
        {
          path: ['name'],
          message: 'Expected string',
          expected: 'string',
          received: 'number',
        },
      ],
      stack: 'Error: Validation failed\n  at...',
    }

    const error = deserializeError(serialized)

    expect(error).toBeInstanceOf(IPCValidationError)
    expect(error.message).toBe('Validation failed')
    expect((error as IPCValidationError).issues).toHaveLength(1)
    expect((error as IPCValidationError).issues[0].path).toEqual(['name'])
  })

  it('deserializes IPCHandlerError', () => {
    const serialized: SerializableHandlerError = {
      name: 'IPCHandlerError',
      message: 'Handler failed',
      code: 'FILE_NOT_FOUND',
      statusCode: 404,
      details: { path: '/missing.txt' },
      stack: 'Error: Handler failed\n  at...',
    }

    const error = deserializeError(serialized)

    expect(error).toBeInstanceOf(IPCHandlerError)
    expect(error.message).toBe('Handler failed')
    expect((error as IPCHandlerError).code).toBe('FILE_NOT_FOUND')
    expect((error as IPCHandlerError).statusCode).toBe(404)
    expect((error as IPCHandlerError).details).toEqual({ path: '/missing.txt' })
  })

  it('returns plain Error unchanged', () => {
    const plainError = new Error('Plain error')
    const result = deserializeError(plainError)

    expect(result).toBe(plainError)
    expect(result.message).toBe('Plain error')
  })

  it('converts unknown values to Error', () => {
    const result = deserializeError('string error')

    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('string error')
  })

  it('handles objects without error signatures', () => {
    const result = deserializeError({ foo: 'bar' })

    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('[object Object]')
  })
})

describe('withErrorDeserialization', () => {
  it('deserializes validation errors automatically', async () => {
    const serialized: SerializableValidationError = {
      name: 'IPCValidationError',
      message: 'Invalid input',
      code: 'IPC_VALIDATION_ERROR',
      issues: [{ path: ['age'], message: 'Must be positive', expected: 'number', received: '-1' }],
    }

    const fn = withErrorDeserialization(async () => {
      throw serialized
    })

    await expect(fn()).rejects.toThrow(IPCValidationError)

    try {
      await fn()
    } catch (err) {
      expect(err).toBeInstanceOf(IPCValidationError)
      expect((err as IPCValidationError).issues[0].path).toEqual(['age'])
    }
  })

  it('deserializes handler errors automatically', async () => {
    const serialized: SerializableHandlerError = {
      name: 'IPCHandlerError',
      message: 'Access denied',
      code: 'FORBIDDEN',
      statusCode: 403,
    }

    const fn = withErrorDeserialization(async () => {
      throw serialized
    })

    await expect(fn()).rejects.toThrow(IPCHandlerError)

    try {
      await fn()
    } catch (err) {
      expect(err).toBeInstanceOf(IPCHandlerError)
      expect((err as IPCHandlerError).code).toBe('FORBIDDEN')
    }
  })

  it('passes through successful results', async () => {
    const fn = withErrorDeserialization(async (x: number) => x * 2)

    await expect(fn(21)).resolves.toBe(42)
  })

  it('preserves function arguments', async () => {
    const fn = withErrorDeserialization(async (a: number, b: string) => {
      return `${b}: ${a}`
    })

    await expect(fn(42, 'Answer')).resolves.toBe('Answer: 42')
  })
})

import { describe, expect, it } from 'vitest'
import {
  formatValidationIssues,
  IPCHandlerError,
  IPCValidationError,
  isIPCHandlerError,
  isIPCValidationError,
  type ValidationIssue,
} from './errors'

describe('IPCValidationError', () => {
  it('creates error with issues', () => {
    const issues: ValidationIssue[] = [
      { path: ['name'], message: 'Required', expected: 'string', received: 'undefined' },
      { path: ['age'], message: 'Must be positive', expected: 'number > 0', received: '-5' },
    ]
    const error = new IPCValidationError('Validation failed', issues)

    expect(error.name).toBe('IPCValidationError')
    expect(error.code).toBe('IPC_VALIDATION_ERROR')
    expect(error.issues).toEqual(issues)
    expect(error.message).toBe('Validation failed')
  })

  it('serializes to JSON', () => {
    const issues: ValidationIssue[] = [{ path: ['test'], message: 'Invalid' }]
    const error = new IPCValidationError('Test error', issues, 'request')

    const json = error.toJSON()
    expect(json.name).toBe('IPCValidationError')
    expect(json.code).toBe('IPC_VALIDATION_ERROR')
    expect(json.field).toBe('request')
    expect(json.issues).toEqual(issues)
    expect(json.stack).toBeDefined()
  })

  it('deserializes from JSON', () => {
    const json = {
      name: 'IPCValidationError',
      message: 'Test',
      code: 'IPC_VALIDATION_ERROR',
      field: 'response',
      issues: [{ path: ['x'], message: 'Bad' }],
      stack: 'stack trace',
    }

    const error = IPCValidationError.fromJSON(json)
    expect(error.message).toBe('Test')
    expect(error.field).toBe('response')
    expect(error.issues).toEqual(json.issues)
    expect(error.stack).toBe('stack trace')
  })

  it('is detectable via type guard', () => {
    const error = new IPCValidationError('test', [])
    expect(isIPCValidationError(error)).toBe(true)
    expect(isIPCValidationError(new Error())).toBe(false)
    expect(isIPCValidationError({ code: 'IPC_VALIDATION_ERROR' })).toBe(true)
  })
})

describe('IPCHandlerError', () => {
  it('creates error with code and details', () => {
    const error = new IPCHandlerError('Handler failed', {
      code: 'FILE_NOT_FOUND',
      statusCode: 404,
      details: { path: '/missing.txt' },
    })

    expect(error.name).toBe('IPCHandlerError')
    expect(error.code).toBe('FILE_NOT_FOUND')
    expect(error.statusCode).toBe(404)
    expect(error.details).toEqual({ path: '/missing.txt' })
  })

  it('uses default code if not provided', () => {
    const error = new IPCHandlerError('Oops')
    expect(error.code).toBe('IPC_HANDLER_ERROR')
  })

  it('serializes and deserializes', () => {
    const error = new IPCHandlerError('DB error', { code: 'DB_TIMEOUT', statusCode: 500 })
    const json = error.toJSON()
    const restored = IPCHandlerError.fromJSON(json)

    expect(restored.message).toBe('DB error')
    expect(restored.code).toBe('DB_TIMEOUT')
    expect(restored.statusCode).toBe(500)
  })

  it('is detectable via type guard', () => {
    const error = new IPCHandlerError('test')
    expect(isIPCHandlerError(error)).toBe(true)
    expect(isIPCHandlerError(new Error())).toBe(false)
    expect(isIPCHandlerError({ name: 'IPCHandlerError' })).toBe(true)
  })
})

describe('formatValidationIssues', () => {
  it('formats issues for display', () => {
    const issues: ValidationIssue[] = [
      { path: ['user', 'name'], message: 'Required' },
      { path: ['user', 'age'], message: 'Invalid', expected: 'number', received: 'string' },
      { path: [], message: 'Root error' },
    ]

    const formatted = formatValidationIssues(issues)
    expect(formatted).toContain('user.name: Required')
    expect(formatted).toContain('user.age: Invalid (expected: number) (received: string)')
    expect(formatted).toContain('root: Root error')
  })

  it('handles empty path', () => {
    const issues: ValidationIssue[] = [{ path: [], message: 'Test' }]
    const formatted = formatValidationIssues(issues)
    expect(formatted).toContain('root: Test')
  })

  it('handles array indices in path', () => {
    const issues: ValidationIssue[] = [{ path: ['users', 0, 'name'], message: 'Missing' }]
    const formatted = formatValidationIssues(issues)
    expect(formatted).toContain('users.0.name: Missing')
  })
})

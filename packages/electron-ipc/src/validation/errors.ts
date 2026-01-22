/**
 * Standardized validation error class for IPC contracts
 */
export class IPCValidationError extends Error {
  readonly code = 'IPC_VALIDATION_ERROR'
  readonly issues: ValidationIssue[]
  readonly field?: string

  constructor(message: string, issues: ValidationIssue[], field?: string) {
    super(message)
    this.name = 'IPCValidationError'
    this.issues = issues
    this.field = field
    // Ensure stack trace is correct
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IPCValidationError)
    }
  }

  /**
   * Converts error to serializable format for IPC transmission
   */
  toJSON(): SerializableValidationError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      field: this.field,
      issues: this.issues,
      stack: this.stack,
    }
  }

  /**
   * Creates error from serialized format
   */
  static fromJSON(json: SerializableValidationError): IPCValidationError {
    const error = new IPCValidationError(json.message, json.issues, json.field)
    if (json.stack) error.stack = json.stack
    return error
  }
}

/**
 * Standardized IPC error for handler execution failures
 */
export class IPCHandlerError extends Error {
  readonly code: string
  readonly statusCode?: number
  readonly details?: unknown

  constructor(
    message: string,
    options?: { code?: string; statusCode?: number; details?: unknown }
  ) {
    super(message)
    this.name = 'IPCHandlerError'
    this.code = options?.code ?? 'IPC_HANDLER_ERROR'
    this.statusCode = options?.statusCode
    this.details = options?.details
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IPCHandlerError)
    }
  }

  toJSON(): SerializableHandlerError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    }
  }

  static fromJSON(json: SerializableHandlerError): IPCHandlerError {
    const error = new IPCHandlerError(json.message, {
      code: json.code,
      statusCode: json.statusCode,
      details: json.details,
    })
    if (json.stack) error.stack = json.stack
    return error
  }
}

/**
 * Single validation issue (path + message)
 */
export interface ValidationIssue {
  /** JSON path to the problematic field */
  path: (string | number)[]
  /** Human-readable error message */
  message: string
  /** Expected type/constraint */
  expected?: string
  /** Received value (sanitized) */
  received?: string
}

/**
 * Serializable validation error for IPC transmission
 */
export interface SerializableValidationError {
  name: string
  message: string
  code: string
  field?: string
  issues: ValidationIssue[]
  stack?: string
}

/**
 * Serializable handler error for IPC transmission
 */
export interface SerializableHandlerError {
  name: string
  message: string
  code: string
  statusCode?: number
  details?: unknown
  stack?: string
}

/**
 * Checks if error is an IPC validation error
 */
export function isIPCValidationError(error: unknown): error is IPCValidationError {
  return (
    error instanceof IPCValidationError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'IPC_VALIDATION_ERROR')
  )
}

/**
 * Checks if error is an IPC handler error
 */
export function isIPCHandlerError(error: unknown): error is IPCHandlerError {
  return (
    error instanceof IPCHandlerError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'IPCHandlerError')
  )
}

/**
 * Formats validation issues for user-friendly display
 */
export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
      const expected = issue.expected ? ` (expected: ${issue.expected})` : ''
      const received = issue.received ? ` (received: ${issue.received})` : ''
      return `  - ${path}: ${issue.message}${expected}${received}`
    })
    .join('\n')
}

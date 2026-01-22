import type { ValidationIssue } from '../errors'
import { IPCValidationError } from '../errors'
import type { Validator } from '../types'

/**
 * Zod types (conditional import)
 */
type ZodIssue = {
  code: string
  path: (string | number)[]
  message: string
  received?: unknown
}

type ZodError = {
  issues: ZodIssue[]
}

type ZodType<T> = {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: ZodError }
}

/**
 * Converts Zod issues to standardized validation issues
 */
function zodIssuesToValidationIssues(issues: ZodIssue[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
    expected: 'code' in issue ? String(issue.code) : undefined,
    received: 'received' in issue ? String(issue.received) : undefined,
  }))
}

/**
 * Creates a validator from a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Validator function
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { zodValidator } from '@number10/electron-ipc/validation/adapters/zod'
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number().min(0)
 * })
 *
 * const userValidator = zodValidator(userSchema)
 * ```
 */
export function zodValidator<T>(schema: ZodType<T>): Validator<T> {
  return (input: unknown) => {
    const result = schema.safeParse(input)
    if (result.success) {
      return { success: true, data: result.data }
    }
    const issues = zodIssuesToValidationIssues(result.error.issues)
    const message = `Validation failed: ${result.error.issues.length} issue(s) found`
    return {
      success: false,
      error: new IPCValidationError(message, issues),
    }
  }
}

/**
 * Re-export common Zod types
 */
export type { ZodType, ZodIssue, ZodError }

import type { ValidationIssue } from '../errors'
import { IPCValidationError } from '../errors'
import type { Validator } from '../types'

/**
 * Valibot types (conditional import)
 */
type ValibotPathItem = {
  key: string | number | undefined
}

type BaseIssue<T = unknown> = {
  message: string
  path?: ValibotPathItem[]
  expected?: string
  received?: T
}

type BaseSchema<
  TInput = unknown,
  TOutput = TInput,
  TIssue extends BaseIssue<unknown> = BaseIssue<unknown>,
> = {
  _types?: {
    input: TInput
    output: TOutput
    issue: TIssue
  }
}

/**
 * Converts Valibot issues to standardized validation issues
 */
function valibotIssuesToValidationIssues(issues: BaseIssue<unknown>[]): ValidationIssue[] {
  return issues.map((issue) => {
    const path =
      issue.path?.map((p) => p.key).filter((k): k is string | number => k !== undefined) ?? []
    return {
      path,
      message: issue.message,
      expected: 'expected' in issue ? String(issue.expected) : undefined,
      received: 'received' in issue ? String(issue.received) : undefined,
    }
  })
}

/**
 * Creates a validator from a Valibot schema
 *
 * **Important:** This adapter requires `valibot` to be installed as a dependency.
 * Install it with: `pnpm add valibot`
 *
 * @param schema - Valibot schema to validate against
 * @param safeParseFn - The safeParse function from valibot (pass `safeParse` from valibot)
 * @returns Validator function
 *
 * @example
 * ```typescript
 * import { object, string, number, minValue, safeParse } from 'valibot'
 * import { valibotValidator } from '@number10/electron-ipc/validation/adapters/valibot'
 *
 * const userSchema = object({
 *   name: string(),
 *   age: number([minValue(0)])
 * })
 *
 * // Pass safeParse explicitly to avoid bundling valibot unnecessarily
 * const userValidator = valibotValidator(userSchema, safeParse)
 * ```
 */
export function valibotValidator<T>(
  schema: BaseSchema<unknown, T, BaseIssue<unknown>>,
  safeParseFn: (
    schema: BaseSchema<unknown, T, BaseIssue<unknown>>,
    input: unknown
  ) => { success: boolean; output?: T; issues?: BaseIssue<unknown>[] }
): Validator<T> {
  return (input: unknown) => {
    const result = safeParseFn(schema, input)

    if (result.success) {
      return { success: true, data: result.output as T }
    }

    const issues = valibotIssuesToValidationIssues(result.issues ?? [])
    const message = `Validation failed: ${issues.length} issue(s) found`
    return {
      success: false,
      error: new IPCValidationError(message, issues),
    }
  }
}

/**
 * Re-export common Valibot types
 */
export type { BaseSchema, BaseIssue, ValibotPathItem }

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from './generator/generate-api'

// Mock process.exit
const mockExit = vi.fn()
const originalExit = process.exit
beforeEach(() => {
  process.exit = mockExit as unknown as typeof process.exit
  vi.clearAllMocks()
})
afterEach(() => {
  process.exit = originalExit
})

describe('main() CLI function', () => {
  beforeEach(() => {
    mockExit.mockClear()
  })

  it('should exit with error when no contracts are specified', () => {
    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      '--input=/tmp/test-contracts.ts',
      '--output=/tmp/generated-api.ts',
    ]

    main()

    expect(mockExit).toHaveBeenCalledWith(1)

    process.argv = originalArgv
  })

  it('should exit with error when contract type is unknown', () => {
    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      '--input=/tmp/test-contracts.ts',
      '--output=/tmp/generated-api.ts',
      '--unknown=TestContracts',
    ]

    main()

    expect(mockExit).toHaveBeenCalledWith(1)

    process.argv = originalArgv
  })
})

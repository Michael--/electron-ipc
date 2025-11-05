import fs from 'fs'
import path from 'path'
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

  it('should generate API for invoke contracts', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'))
    const inputPath = path.join(tempDir, 'contracts.ts')
    const outputPath = path.join(tempDir, 'api.ts')

    // Create test contract file
    const contractCode = `
      export type InvokeContracts = {
        GetUser: {
          request: { id: string }
          response: { name: string; email: string }
        }
        SaveData: {
          request: { data: any }
          response: { success: boolean }
        }
      }
    `
    fs.writeFileSync(inputPath, contractCode, 'utf8')

    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      `--input=${inputPath}`,
      `--output=${outputPath}`,
      '--invoke=InvokeContracts',
    ]

    main()

    expect(mockExit).not.toHaveBeenCalled()

    // Check generated output
    expect(fs.existsSync(outputPath)).toBe(true)
    const generatedCode = fs.readFileSync(outputPath, 'utf8')

    expect(generatedCode).toContain('const InvokeContractsApi = {')
    expect(generatedCode).toContain('invokeGetUser:')
    expect(generatedCode).toContain('invokeSaveData:')
    expect(generatedCode).toContain('export const api = {')
    expect(generatedCode).toContain('...InvokeContractsApi,')

    process.argv = originalArgv

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should generate API for event contracts', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'))
    const inputPath = path.join(tempDir, 'contracts.ts')
    const outputPath = path.join(tempDir, 'api.ts')

    // Create test contract file
    const contractCode = `
      export type EventContracts = {
        LogMessage: {
          request: { message: string; level: 'info' | 'error' }
        }
      }
    `
    fs.writeFileSync(inputPath, contractCode, 'utf8')

    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      `--input=${inputPath}`,
      `--output=${outputPath}`,
      '--event=EventContracts',
    ]

    main()

    expect(mockExit).not.toHaveBeenCalled()

    // Check generated output
    expect(fs.existsSync(outputPath)).toBe(true)
    const generatedCode = fs.readFileSync(outputPath, 'utf8')

    expect(generatedCode).toContain('const EventContractsApi = {')
    expect(generatedCode).toContain('sendLogMessage:')
    expect(generatedCode).toContain('export const api = {')
    expect(generatedCode).toContain('...EventContractsApi,')

    process.argv = originalArgv

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should generate API for send contracts', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'))
    const inputPath = path.join(tempDir, 'contracts.ts')
    const outputPath = path.join(tempDir, 'api.ts')

    // Create test contract file
    const contractCode = `
      export type SendContracts = {
        UserUpdated: {
          payload: { userId: string; changes: object }
        }
        Notification: {
          payload: { message: string }
        }
      }
    `
    fs.writeFileSync(inputPath, contractCode, 'utf8')

    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      `--input=${inputPath}`,
      `--output=${outputPath}`,
      '--send=SendContracts',
    ]

    main()

    expect(mockExit).not.toHaveBeenCalled()

    // Check generated output
    expect(fs.existsSync(outputPath)).toBe(true)
    const generatedCode = fs.readFileSync(outputPath, 'utf8')

    expect(generatedCode).toContain('const SendContractsApi = {')
    expect(generatedCode).toContain('onUserUpdated:')
    expect(generatedCode).toContain('onNotification:')
    expect(generatedCode).toContain('export const api = {')
    expect(generatedCode).toContain('...SendContractsApi,')

    process.argv = originalArgv

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should generate API for multiple contract types', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'))
    const inputPath = path.join(tempDir, 'contracts.ts')
    const outputPath = path.join(tempDir, 'api.ts')

    // Create test contract file
    const contractCode = `
      export type InvokeContracts = {
        GetData: {
          request: { id: string }
          response: { data: any }
        }
      }
      export type EventContracts = {
        SendEvent: {
          request: { event: string }
        }
      }
      export type SendContracts = {
        Broadcast: {
          payload: { message: string }
        }
      }
    `
    fs.writeFileSync(inputPath, contractCode, 'utf8')

    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      `--input=${inputPath}`,
      `--output=${outputPath}`,
      '--invoke=InvokeContracts',
      '--event=EventContracts',
      '--send=SendContracts',
    ]

    main()

    expect(mockExit).not.toHaveBeenCalled()

    // Check generated output
    expect(fs.existsSync(outputPath)).toBe(true)
    const generatedCode = fs.readFileSync(outputPath, 'utf8')

    expect(generatedCode).toContain('...InvokeContractsApi,')
    expect(generatedCode).toContain('...EventContractsApi,')
    expect(generatedCode).toContain('...SendContractsApi,')
    expect(generatedCode).toContain('invokeGetData:')
    expect(generatedCode).toContain('sendSendEvent:')
    expect(generatedCode).toContain('onBroadcast:')

    process.argv = originalArgv

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should generate main broadcast API when requested', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'))
    const inputPath = path.join(tempDir, 'contracts.ts')
    const outputPath = path.join(tempDir, 'api.ts')
    const broadcastPath = path.join(tempDir, 'broadcast.ts')

    // Create test contract file
    const contractCode = `
      export type SendContracts = {
        UserUpdated: {
          payload: { userId: string; changes: object }
        }
      }
    `
    fs.writeFileSync(inputPath, contractCode, 'utf8')

    const originalArgv = process.argv
    process.argv = [
      'node',
      'generate-api.ts',
      `--input=${inputPath}`,
      `--output=${outputPath}`,
      '--send=SendContracts',
      `--main-broadcast-output=${broadcastPath}`,
    ]

    main()

    expect(mockExit).not.toHaveBeenCalled()

    // Check main API output
    expect(fs.existsSync(outputPath)).toBe(true)
    const generatedCode = fs.readFileSync(outputPath, 'utf8')
    expect(generatedCode).toContain('const SendContractsApi = {')

    // Check broadcast API output
    expect(fs.existsSync(broadcastPath)).toBe(true)
    const broadcastCode = fs.readFileSync(broadcastPath, 'utf8')
    expect(broadcastCode).toContain('export const mainBroadcast =')
    expect(broadcastCode).toContain('UserUpdated:')

    process.argv = originalArgv

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true })
  })
})

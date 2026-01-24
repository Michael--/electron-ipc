import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { generateMainBroadcastApi, processContracts } from './generator/generate-api'

/**
 * Generator structure tests
 *
 * These tests verify the structural integrity of generated code without
 * being overly sensitive to comments, whitespace, or helper code.
 *
 * Tests focus on:
 * - Method names and signatures
 * - Type references
 * - API surface area
 *
 * If a test fails, check if the API contract changed unintentionally.
 */
describe('generator structure tests', () => {
  const project = new Project()

  /**
   * Checks if code contains expected patterns
   */
  function assertCodeContains(code: string, patterns: string[]) {
    for (const pattern of patterns) {
      expect(code, `Expected to find: ${pattern}`).toContain(pattern)
    }
  }

  describe('invoke contracts', () => {
    it('generates correct method names and type references', () => {
      const sourceCode = `
        export type InvokeContracts = {
          GetUser: {
            request: { id: number }
            response: { name: string; email: string }
          }
          SaveData: {
            request: { data: string }
            response: { success: boolean }
          }
        }
      `
      const sourceFile = project.createSourceFile('invoke-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [{ type: 'invoke' as const, name: 'InvokeContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify method names with invoke prefix
      assertCodeContains(result, [
        'invokeGetUser:',
        'invokeSaveData:',
        'InvokeContracts["GetUser"]["request"]',
        'InvokeContracts["GetUser"]["response"]',
        'InvokeContracts["SaveData"]["request"]',
        'InvokeContracts["SaveData"]["response"]',
      ])
    })
  })

  describe('event contracts', () => {
    it('generates correct method names and type references', () => {
      const sourceCode = `
        export type EventContracts = {
          UserLoggedOut: {
            request: { reason: string }
          }
          WindowClosed: {
            request: { windowId: string }
          }
        }
      `
      const sourceFile = project.createSourceFile('event-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [{ type: 'event' as const, name: 'EventContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify method names with send prefix
      assertCodeContains(result, [
        'sendUserLoggedOut:',
        'sendWindowClosed:',
        'EventContracts["UserLoggedOut"]["request"]',
        'EventContracts["WindowClosed"]["request"]',
      ])
    })
  })

  describe('broadcast contracts', () => {
    it('generates correct preload listener methods', () => {
      const sourceCode = `
        export type BroadcastContracts = {
          Ping: {
            payload: number
          }
          DataUpdated: {
            payload: { id: string; value: string }
          }
        }
      `
      const sourceFile = project.createSourceFile('broadcast-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [{ type: 'send' as const, name: 'BroadcastContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify listener methods with on prefix
      assertCodeContains(result, [
        'onPing:',
        'onDataUpdated:',
        'BroadcastContracts["Ping"]["payload"]',
        'BroadcastContracts["DataUpdated"]["payload"]',
      ])
    })

    it('generates correct main broadcast API', () => {
      const sourceCode = `
        export type BroadcastContracts = {
          Ping: {
            payload: number
          }
          DataUpdated: {
            payload: { id: string }
          }
        }
      `
      const sourceFile = project.createSourceFile('broadcast-test-2.ts', sourceCode, {
        overwrite: true,
      })
      const result = generateMainBroadcastApi('BroadcastContracts', './ipc-api', sourceFile)

      // Verify main broadcast API structure
      assertCodeContains(result, [
        'export const mainBroadcast = {',
        'Ping: (mainWindow: BrowserWindow, payload: BroadcastContracts["Ping"]["payload"])',
        'DataUpdated: (mainWindow: BrowserWindow, payload: BroadcastContracts["DataUpdated"]["payload"])',
        'mainWindow.webContents.send(',
      ])
    })
  })

  describe('stream contracts', () => {
    it('generates correct stream invoke methods', () => {
      const sourceCode = `
        export type StreamInvokeContracts = {
          GetLargeData: {
            request: { id: string }
            stream: string
          }
        }
      `
      const sourceFile = project.createSourceFile('stream-invoke-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [{ type: 'streamInvoke' as const, name: 'StreamInvokeContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify stream invoke method
      assertCodeContains(result, [
        'invokeStreamGetLargeData:',
        'StreamInvokeContracts["GetLargeData"]["request"]',
        'StreamInvokeContracts["GetLargeData"]["stream"]',
      ])
    })

    it('generates correct stream upload methods', () => {
      const sourceCode = `
        export type StreamUploadContracts = {
          UploadFile: {
            request: { fileName: string }
            data: Uint8Array
          }
        }
      `
      const sourceFile = project.createSourceFile('stream-upload-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [{ type: 'streamUpload' as const, name: 'StreamUploadContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify stream upload method
      assertCodeContains(result, [
        'uploadUploadFile:',
        'StreamUploadContracts["UploadFile"]["request"]',
        'StreamUploadContracts["UploadFile"]["data"]',
      ])
    })

    it('generates correct stream download methods', () => {
      const sourceCode = `
        export type StreamDownloadContracts = {
          DownloadLogs: {
            request: { level?: string }
            data: string
          }
        }
      `
      const sourceFile = project.createSourceFile('stream-download-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [{ type: 'streamDownload' as const, name: 'StreamDownloadContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify stream download method
      assertCodeContains(result, [
        'downloadDownloadLogs:',
        'StreamDownloadContracts["DownloadLogs"]["request"]',
        'StreamDownloadContracts["DownloadLogs"]["data"]',
      ])
    })
  })

  describe('mixed contracts', () => {
    it('generates all method types correctly', () => {
      const sourceCode = `
        export type InvokeContracts = {
          GetData: {
            request: { id: string }
            response: { value: string }
          }
        }
        export type EventContracts = {
          DataChanged: {
            request: { id: string }
          }
        }
        export type BroadcastContracts = {
          Notification: {
            payload: { message: string }
          }
        }
      `
      const sourceFile = project.createSourceFile('mixed-test-1.ts', sourceCode, {
        overwrite: true,
      })
      const contracts = [
        { type: 'invoke' as const, name: 'InvokeContracts' },
        { type: 'event' as const, name: 'EventContracts' },
        { type: 'send' as const, name: 'BroadcastContracts' },
      ]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify all method types present
      assertCodeContains(result, ['invokeGetData:', 'sendDataChanged:', 'onNotification:'])
    })
  })
})

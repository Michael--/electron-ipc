import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { generateMainBroadcastApi, processContracts } from './generator/generate-api'

describe('generate-api', () => {
  const project = new Project()

  describe('processContracts', () => {
    it('should generate API for invoke contracts', () => {
      const sourceCode = `
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
      const sourceFile = project.createSourceFile('test1.ts', sourceCode)
      const contracts = [{ type: 'invoke' as const, name: 'InvokeContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('const InvokeContractsApi = {')
      expect(result).toContain('invokeGetUser:')
      expect(result).toContain('invokeSaveData:')
      expect(result).toContain('export const api = {')
      expect(result).toContain('...InvokeContractsApi,')
    })

    it('should generate API for event contracts', () => {
      const sourceCode = `
        export type EventContracts = {
          LogMessage: {
            request: { message: string; level: 'info' | 'error' }
          }
        }
      `
      const sourceFile = project.createSourceFile('test2.ts', sourceCode)
      const contracts = [{ type: 'event' as const, name: 'EventContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('const EventContractsApi = {')
      expect(result).toContain('sendLogMessage:')
      expect(result).toContain('export const api = {')
      expect(result).toContain('...EventContractsApi,')
    })

    it('should generate API for send contracts', () => {
      const sourceCode = `
        export type SendContracts = {
          UserUpdated: {
            payload: { userId: string; changes: object }
          }
          Notification: {
            payload: { message: string }
          }
        }
      `
      const sourceFile = project.createSourceFile('test3.ts', sourceCode)
      const contracts = [{ type: 'send' as const, name: 'SendContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('const SendContractsApi = {')
      expect(result).toContain('onUserUpdated:')
      expect(result).toContain('onNotification:')
      expect(result).toContain('export const api = {')
      expect(result).toContain('...SendContractsApi,')
    })

    it('should handle multiple contract types', () => {
      const sourceCode = `
        export type InvokeContracts = {
          getData: {
            request: { id: string }
            response: { data: any }
          }
        }
        export type EventContracts = {
          sendEvent: {
            request: { event: string }
          }
        }
        export type SendContracts = {
          broadcast: {
            payload: { message: string }
          }
        }
      `
      const sourceFile = project.createSourceFile('test4.ts', sourceCode)
      const contracts = [
        { type: 'invoke' as const, name: 'InvokeContracts' },
        { type: 'event' as const, name: 'EventContracts' },
        { type: 'send' as const, name: 'SendContracts' },
      ]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('...InvokeContractsApi,')
      expect(result).toContain('...EventContractsApi,')
      expect(result).toContain('...SendContractsApi,')
    })

    it('should throw error for unknown contract type', () => {
      const sourceCode = `
        export type TestContracts = {
          test: {
            request: {}
            response: {}
          }
        }
      `
      const sourceFile = project.createSourceFile('test5.ts', sourceCode)
      const contracts = [{ type: 'invalid' as 'invoke' | 'event' | 'send', name: 'TestContracts' }]

      expect(() => processContracts(sourceFile, contracts, './ipc-api')).toThrow()
    })

    it('should throw error when contract not found', () => {
      const sourceCode = `export type OtherContracts = {}`
      const sourceFile = project.createSourceFile('test6.ts', sourceCode)
      const contracts = [{ type: 'invoke' as const, name: 'NonExistentContracts' }]

      expect(() => processContracts(sourceFile, contracts, './ipc-api')).toThrow()
    })
  })

  describe('generateMainBroadcastApi', () => {
    it('should generate main broadcast API for send contracts', () => {
      const sourceCode = `
        export type SendContracts = {
          userUpdated: {
            payload: { userId: string; changes: object }
          }
          notification: {
            payload: { message: string }
          }
          emptyEvent: {
            payload: void
          }
        }
      `
      const sourceFile = project.createSourceFile('test7.ts', sourceCode)
      const result = generateMainBroadcastApi('SendContracts', './ipc-api', sourceFile)

      expect(result).toContain('export const mainBroadcast = {')
      expect(result).toContain(
        'userUpdated: (mainWindow: BrowserWindow, payload: SendContracts["userUpdated"]["payload"]): void => {'
      )
      expect(result).toContain(
        'notification: (mainWindow: BrowserWindow, payload: SendContracts["notification"]["payload"]): void => {'
      )
      expect(result).toContain(
        'emptyEvent: (mainWindow: BrowserWindow, payload?: SendContracts["emptyEvent"]["payload"]): void => {'
      )
      expect(result).toContain("mainWindow.webContents.send('userUpdated', payload)")
      expect(result).toContain('} as const')
    })

    it('should handle empty contracts', () => {
      const sourceCode = `export type EmptyContracts = {}`
      const sourceFile = project.createSourceFile('test8.ts', sourceCode)
      const result = generateMainBroadcastApi('EmptyContracts', './ipc-api', sourceFile)

      expect(result).toContain('export const mainBroadcast = {')
      expect(result).toContain('} as const')
    })
  })
})

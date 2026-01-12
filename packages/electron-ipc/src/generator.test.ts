import fs from 'fs'
import os from 'os'
import path from 'path'
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { processApiConfig } from './generator/cli'
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
      expect(result).toContain("mainWindow.webContents.send('notification', payload)")
      expect(result).toContain("mainWindow.webContents.send('emptyEvent', payload)")
      // Note: } as const is no longer generated
    })

    it('should handle empty contracts', () => {
      const sourceCode = `export type EmptyContracts = {}`
      const sourceFile = project.createSourceFile('test8.ts', sourceCode)
      const result = generateMainBroadcastApi('EmptyContracts', './ipc-api', sourceFile)

      expect(result).toContain('export const mainBroadcast = {')
      // Note: } as const is no longer generated
    })
  })

  describe('processApiConfig', () => {
    it('should write main broadcast output separately when configured', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-ipc-'))
      const inputPath = path.join(tempDir, 'ipc-api.ts')
      const outputPath = path.join(tempDir, 'api-generated.ts')
      const mainBroadcastPath = path.join(tempDir, 'broadcast-generated.ts')

      fs.writeFileSync(
        inputPath,
        `
          export type BroadcastContracts = {
            Ping: { payload: number }
          }
        `,
        'utf8'
      )

      processApiConfig({
        name: 'api',
        input: inputPath,
        output: outputPath,
        contracts: [{ type: 'send', name: 'BroadcastContracts' }],
        mainBroadcastOutput: mainBroadcastPath,
      })

      const preloadCode = fs.readFileSync(outputPath, 'utf8')
      const mainBroadcastCode = fs.readFileSync(mainBroadcastPath, 'utf8')

      expect(preloadCode).toContain('ipcRenderer')
      expect(preloadCode).not.toContain('mainBroadcast')
      expect(mainBroadcastCode).toContain('export const mainBroadcast = {')
      expect(mainBroadcastCode).toContain("import { BrowserWindow } from 'electron'")
      expect(mainBroadcastCode).not.toContain('ipcRenderer')

      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('should resolve re-exported contracts via tsconfig path aliases', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-ipc-'))
      const srcDir = path.join(tempDir, 'src')
      const inputPath = path.join(srcDir, 'index.ts')
      const contractsPath = path.join(srcDir, 'contracts.ts')
      const outputPath = path.join(tempDir, 'api-generated.ts')
      const tsconfigPath = path.join(tempDir, 'tsconfig.json')

      fs.mkdirSync(srcDir, { recursive: true })
      fs.writeFileSync(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              baseUrl: '.',
              paths: {
                '@ipc/*': ['src/*'],
              },
            },
          },
          null,
          2
        ),
        'utf8'
      )
      fs.writeFileSync(
        contractsPath,
        `
          export type InvokeContracts = {
            AddNumbers: {
              request: { a: number; b: number }
              response: number
            }
          }
        `,
        'utf8'
      )
      fs.writeFileSync(
        inputPath,
        `
          export type { InvokeContracts } from '@ipc/contracts'
        `,
        'utf8'
      )

      processApiConfig({
        name: 'api',
        input: inputPath,
        output: outputPath,
        tsconfig: tsconfigPath,
        contracts: [{ type: 'invoke', name: 'InvokeContracts' }],
      })

      const preloadCode = fs.readFileSync(outputPath, 'utf8')
      expect(preloadCode).toContain('invokeAddNumbers')

      fs.rmSync(tempDir, { recursive: true, force: true })
    })
  })

  describe('Stream Contracts', () => {
    it('should generate callback-based API for stream invoke contracts', () => {
      const sourceCode = `
        export type StreamInvokeContracts = {
          GetLargeData: {
            request: { id: string }
            stream: string
          }
          GetNumbers: {
            request: void
            stream: number
          }
        }
      `
      const sourceFile = project.createSourceFile('test-stream-1.ts', sourceCode)
      const contracts = [{ type: 'streamInvoke' as const, name: 'StreamInvokeContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Should include StreamCallbacks type definition
      expect(result).toContain('type StreamCallbacks<TData>')
      expect(result).toContain('onData: (chunk: TData) => void')
      expect(result).toContain('onEnd: () => void')
      expect(result).toContain('onError: (error: Error) => void')

      // Should include stream invoke API methods with callbacks parameter
      expect(result).toContain('const StreamInvokeContractsApi = {')
      expect(result).toContain('invokeStreamGetLargeData:')
      expect(result).toContain(
        'callbacks: StreamCallbacks<StreamInvokeContracts["GetLargeData"]["stream"]>'
      )
      expect(result).toContain('): (() => void) =>')
      expect(result).toContain('ipcRenderer.send(`${channel as string}-cancel`)')

      // Should include in final API
      expect(result).toContain('...StreamInvokeContractsApi,')
    })

    it('should generate stream upload contracts', () => {
      const sourceCode = `
        export type StreamUploadContracts = {
          UploadFile: {
            data: Uint8Array
          }
        }
      `
      const sourceFile = project.createSourceFile('test-stream-2.ts', sourceCode)
      const contracts = [{ type: 'streamUpload' as const, name: 'StreamUploadContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('const StreamUploadContractsApi = {')
      expect(result).toContain('uploadUploadFile:')
      expect(result).toContain('StreamWriter')
    })

    it('should generate stream download contracts', () => {
      const sourceCode = `
        export type StreamDownloadContracts = {
          DownloadLogs: {
            payload: string
          }
        }
      `
      const sourceFile = project.createSourceFile('test-stream-3.ts', sourceCode)
      const contracts = [{ type: 'streamDownload' as const, name: 'StreamDownloadContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('const StreamDownloadContractsApi = {')
      expect(result).toContain('downloadDownloadLogs:')
      expect(result).toContain('const cleanup = () =>')
      expect(result).toContain('ipcRenderer.removeListener(dataChannel, dataHandler)')
      expect(result).toContain('ipcRenderer.send(`${channel as string}-cancel`)')
    })

    it('should handle multiple stream contract types together', () => {
      const sourceCode = `
        export type StreamInvokeContracts = {
          GetData: { request: void; stream: string }
        }
        export type StreamUploadContracts = {
          Upload: { data: string }
        }
        export type StreamDownloadContracts = {
          Download: { payload: string }
        }
      `
      const sourceFile = project.createSourceFile('test-stream-4.ts', sourceCode)
      const contracts = [
        { type: 'streamInvoke' as const, name: 'StreamInvokeContracts' },
        { type: 'streamUpload' as const, name: 'StreamUploadContracts' },
        { type: 'streamDownload' as const, name: 'StreamDownloadContracts' },
      ]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      expect(result).toContain('...StreamInvokeContractsApi,')
      expect(result).toContain('...StreamUploadContractsApi,')
      expect(result).toContain('...StreamDownloadContractsApi,')
    })

    it('should generate proper cleanup logic in stream templates', () => {
      const sourceCode = `
        export type StreamInvokeContracts = {
          TestStream: { request: void; stream: string }
        }
      `
      const sourceFile = project.createSourceFile('test-stream-5.ts', sourceCode)
      const contracts = [{ type: 'streamInvoke' as const, name: 'StreamInvokeContracts' }]
      const result = processContracts(sourceFile, contracts, './ipc-api')

      // Verify cleanup function exists
      expect(result).toContain('const cleanup = ()')
      expect(result).toContain('ipcRenderer.removeListener(dataChannel, dataHandler)')
      expect(result).toContain('ipcRenderer.removeListener(endChannel, endHandler)')
      expect(result).toContain('ipcRenderer.removeListener(errorChannel, errorHandler)')

      // Verify cleanup is called on end and error
      expect(result).toContain('callbacks.onEnd()')
      expect(result).toContain('cleanup()')
      expect(result).toContain('callbacks.onError')
    })
  })
})

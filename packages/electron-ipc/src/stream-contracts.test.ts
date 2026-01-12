/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbstractRegisterStreamDownload,
  AbstractRegisterStreamHandler,
  AbstractRegisterStreamUpload,
  GenericStreamDownloadContract,
  GenericStreamInvokeContract,
  GenericStreamUploadContract,
  IPCStreamDownloadHandlerType,
  IPCStreamHandlerType,
  IPCStreamUploadHandlerType,
  IStreamDownloadContract,
  IStreamInvokeContract,
  IStreamUploadContract,
} from './interfaces/ipc-contracts'

// Mock Electron APIs
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

describe('Stream IPC Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GenericStreamInvokeContract', () => {
    it('should accept valid stream invoke contract structure', () => {
      type TestStreamContract = GenericStreamInvokeContract<{
        GetData: IStreamInvokeContract<{ id: string }, string>
      }>

      const contract: TestStreamContract = {
        GetData: {
          request: { id: 'test-123' },
          stream: 'chunk-data',
        },
      }

      expect(contract.GetData.request.id).toBe('test-123')
      expect(contract.GetData.stream).toBe('chunk-data')
    })

    it('should accept stream contract with void request', () => {
      type VoidRequestContract = GenericStreamInvokeContract<{
        GetLogs: IStreamInvokeContract<void, string>
      }>

      const contract: VoidRequestContract = {
        GetLogs: {
          request: undefined,
          stream: 'log-entry',
        },
      }

      expect(contract.GetLogs.request).toBeUndefined()
      expect(contract.GetLogs.stream).toBe('log-entry')
    })

    it('should accept various serializable chunk types', () => {
      type MultiTypeContract = GenericStreamInvokeContract<{
        Numbers: IStreamInvokeContract<void, number>
        Objects: IStreamInvokeContract<void, { value: number }>
        Arrays: IStreamInvokeContract<void, string[]>
      }>

      const contract: MultiTypeContract = {
        Numbers: { request: undefined, stream: 42 },
        Objects: { request: undefined, stream: { value: 100 } },
        Arrays: { request: undefined, stream: ['a', 'b', 'c'] },
      }

      expect(contract.Numbers.stream).toBe(42)
      expect(contract.Objects.stream.value).toBe(100)
      expect(contract.Arrays.stream).toEqual(['a', 'b', 'c'])
    })
  })

  describe('AbstractRegisterStreamHandler', () => {
    it('should register stream handler and process chunks', async () => {
      type TestStreamContract = GenericStreamInvokeContract<{
        TestStream: IStreamInvokeContract<{ id: string }, string>
      }>

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      }

      const chunks = ['chunk1', 'chunk2', 'chunk3']

      class TestStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<TestStreamContract> = {
          TestStream: (_event, request) => {
            expect(request.id).toBe('test-id')

            // Return a Web Streams API ReadableStream
            return new globalThis.ReadableStream({
              async start(controller) {
                for (const chunk of chunks) {
                  controller.enqueue(chunk)
                  await new Promise((resolve) => setTimeout(resolve, 10))
                }
                controller.close()
              },
            })
          },
        }
      }

      TestStreamHandler.register()

      expect(ipcMain.handle).toHaveBeenCalledWith('TestStream', expect.any(Function))

      // Get the registered handler
      const handleCall = (ipcMain.handle as any).mock.calls[0]
      const handler = handleCall[1]

      // Execute the handler
      await handler(mockEvent, { id: 'test-id' })

      // Verify data chunks were sent
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-data', 'chunk1')
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-data', 'chunk2')
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-data', 'chunk3')
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-end')
    })

    it('should handle stream errors', async () => {
      type ErrorStreamContract = GenericStreamInvokeContract<{
        ErrorStream: IStreamInvokeContract<void, string>
      }>

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      }

      const testError = new Error('Stream error')

      class ErrorStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<ErrorStreamContract> = {
          ErrorStream: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.error(testError)
              },
            })
          },
        }
      }

      ErrorStreamHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls[0]
      const handler = handleCall[1]

      await handler(mockEvent, undefined)

      expect(mockEvent.sender.send).toHaveBeenCalledWith('ErrorStream-error', testError)
    })

    it('should handle empty streams', async () => {
      type EmptyStreamContract = GenericStreamInvokeContract<{
        EmptyStream: IStreamInvokeContract<void, string>
      }>

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      }

      class EmptyStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<EmptyStreamContract> = {
          EmptyStream: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.close()
              },
            })
          },
        }
      }

      EmptyStreamHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls[0]
      const handler = handleCall[1]

      await handler(mockEvent, undefined)

      // Should only send end signal, no data
      expect(mockEvent.sender.send).toHaveBeenCalledTimes(1)
      expect(mockEvent.sender.send).toHaveBeenCalledWith('EmptyStream-end')
    })

    it('should handle large data streams efficiently', async () => {
      type LargeStreamContract = GenericStreamInvokeContract<{
        LargeStream: IStreamInvokeContract<{ count: number }, number>
      }>

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      }

      class LargeStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<LargeStreamContract> = {
          LargeStream: (_event, request) => {
            return new globalThis.ReadableStream({
              async start(controller) {
                for (let i = 0; i < request.count; i++) {
                  controller.enqueue(i)
                }
                controller.close()
              },
            })
          },
        }
      }

      LargeStreamHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls[0]
      const handler = handleCall[1]

      await handler(mockEvent, { count: 100 })

      // Should send 100 data chunks + 1 end signal
      expect(mockEvent.sender.send).toHaveBeenCalledTimes(101)
      expect(mockEvent.sender.send).toHaveBeenLastCalledWith('LargeStream-end')
    })

    it('should maintain type safety for different stream data types', async () => {
      type MultiTypeStreamContract = GenericStreamInvokeContract<{
        NumberStream: IStreamInvokeContract<void, number>
        ObjectStream: IStreamInvokeContract<void, { id: number; value: string }>
        ArrayStream: IStreamInvokeContract<void, string[]>
      }>

      class MultiTypeStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<MultiTypeStreamContract> = {
          NumberStream: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue(42)
                controller.close()
              },
            })
          },
          ObjectStream: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue({ id: 1, value: 'test' })
                controller.close()
              },
            })
          },
          ArrayStream: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue(['a', 'b', 'c'])
                controller.close()
              },
            })
          },
        }
      }

      MultiTypeStreamHandler.register()

      // Verify all handlers were registered
      expect(ipcMain.handle).toHaveBeenCalledTimes(3)
      expect(ipcMain.handle).toHaveBeenCalledWith('NumberStream', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ObjectStream', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ArrayStream', expect.any(Function))
    })
  })

  describe('GenericStreamUploadContract', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should accept valid stream upload contract structure with request parameter', () => {
      type TestUploadContract = GenericStreamUploadContract<{
        UploadFile: IStreamUploadContract<{ fileName: string }, Uint8Array>
      }>

      const contract: TestUploadContract = {
        UploadFile: {
          request: { fileName: 'test.bin' },
          data: new Uint8Array([1, 2, 3]),
        },
      }

      expect(contract.UploadFile.request.fileName).toBe('test.bin')
      expect(contract.UploadFile.data).toBeInstanceOf(Uint8Array)
      expect(contract.UploadFile.data.length).toBe(3)
    })

    it('should register upload handlers via AbstractRegisterStreamUpload', () => {
      type UploadContract = GenericStreamUploadContract<{
        UploadData: IStreamUploadContract<{ id: number }, string>
      }>

      class RegisterUpload extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          UploadData: (request, onData, onEnd, onError) => {
            expect(request.id).toBe(42)
            onData((_chunk) => {
              // Test callback
            })
            onEnd(() => {
              // Test end
            })
            onError((_err) => {
              // Test error
            })
          },
        }
      }

      RegisterUpload.register()

      expect(ipcMain.on).toHaveBeenCalledWith('UploadData-start', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('UploadData-data', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('UploadData-end', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('UploadData-error', expect.any(Function))
    })

    it('should support Uint8Array data type', () => {
      type UploadContract = GenericStreamUploadContract<{
        UploadBinary: IStreamUploadContract<null, Uint8Array>
      }>

      const contract: UploadContract = {
        UploadBinary: {
          request: null,
          data: new Uint8Array([255, 254, 253]),
        },
      }

      expect(contract.UploadBinary.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(contract.UploadBinary.data)).toEqual([255, 254, 253])
    })
  })

  describe('GenericStreamDownloadContract', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should accept valid stream download contract structure with request parameter', () => {
      type TestDownloadContract = GenericStreamDownloadContract<{
        DownloadLogs: IStreamDownloadContract<{ level: string }, string>
      }>

      const contract: TestDownloadContract = {
        DownloadLogs: {
          request: { level: 'info' },
          data: 'Log message',
        },
      }

      expect(contract.DownloadLogs.request.level).toBe('info')
      expect(contract.DownloadLogs.data).toBe('Log message')
    })

    it('should register download handlers via AbstractRegisterStreamDownload', () => {
      type DownloadContract = GenericStreamDownloadContract<{
        GetLogs: IStreamDownloadContract<{ count: number }, number>
      }>

      class RegisterDownload extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          GetLogs: (request) => {
            expect(request.count).toBe(10)
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue(42)
                controller.close()
              },
            })
          },
        }
      }

      RegisterDownload.register()

      expect(ipcMain.handle).toHaveBeenCalledWith('GetLogs', expect.any(Function))
    })

    it('should support multiple data types', () => {
      type DownloadContract = GenericStreamDownloadContract<{
        DownloadNumbers: IStreamDownloadContract<null, number>
        DownloadObjects: IStreamDownloadContract<null, { id: number; value: string }>
      }>

      const contract: DownloadContract = {
        DownloadNumbers: {
          request: null,
          data: 123,
        },
        DownloadObjects: {
          request: null,
          data: { id: 1, value: 'test' },
        },
      }

      expect(contract.DownloadNumbers.data).toBe(123)
      expect(contract.DownloadObjects.data).toEqual({ id: 1, value: 'test' })
    })
  })
})

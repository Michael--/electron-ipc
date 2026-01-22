/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbstractRegisterStreamDownload,
  AbstractRegisterStreamHandler,
  AbstractRegisterStreamUpload,
  defineStreamDownloadHandlers,
  defineStreamUploadHandlers,
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
import * as tracePropagation from './inspector/trace-propagation'

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
      expect(ipcMain.on).toHaveBeenCalledWith('TestStream-cancel', expect.any(Function))

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
      expect(ipcMain.on).toHaveBeenCalledWith('GetLogs-cancel', expect.any(Function))
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

  describe('AbstractRegisterStreamUpload - Data Flow', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should handle data flow through upload stream', () => {
      type UploadContract = GenericStreamUploadContract<{
        UploadChunks: IStreamUploadContract<{ id: number }, string>
      }>

      const receivedChunks: string[] = []
      let endCalled = false
      let errorCalled = false

      class TestUploadHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          UploadChunks: (request, onData, onEnd, onError) => {
            expect(request.id).toBe(123)
            onData((chunk) => {
              receivedChunks.push(chunk)
            })
            onEnd(() => {
              endCalled = true
            })
            onError(() => {
              errorCalled = true
            })
          },
        }
      }

      TestUploadHandler.register()

      // Get the registered start handler
      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadChunks-start'
      )
      expect(startCall).toBeDefined()
      const startHandler = startCall[1]

      // Simulate upload start
      startHandler({}, { id: 123 })

      // Get data handler
      const dataCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadChunks-data'
      )
      const dataHandler = dataCall[1]

      // Simulate data chunks
      dataHandler({}, 'chunk1')
      dataHandler({}, 'chunk2')
      dataHandler({}, 'chunk3')

      expect(receivedChunks).toEqual(['chunk1', 'chunk2', 'chunk3'])

      // Get end handler
      const endCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadChunks-end'
      )
      const endHandler = endCall[1]

      // Simulate end
      endHandler({}, undefined)

      expect(endCalled).toBe(true)
      expect(errorCalled).toBe(false)
    })

    it('should handle error in upload stream', () => {
      type UploadContract = GenericStreamUploadContract<{
        UploadData: IStreamUploadContract<null, number>
      }>

      let errorReceived: unknown = null

      class ErrorUploadHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          UploadData: (_request, onData, onEnd, onError) => {
            onData((_chunk) => {
              // Do nothing
            })
            onEnd(() => {
              // Do nothing
            })
            onError((err) => {
              errorReceived = err
            })
          },
        }
      }

      ErrorUploadHandler.register()

      // Get the registered start handler
      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadData-start'
      )
      const startHandler = startCall[1]

      // Simulate upload start
      startHandler({}, null)

      // Get error handler
      const errorCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadData-error'
      )
      const errorHandler = errorCall[1]

      // Simulate error
      const testError = new Error('Upload failed')
      errorHandler({}, testError)

      expect(errorReceived).toBe(testError)
    })

    it('should support void request type in upload', () => {
      type UploadContract = GenericStreamUploadContract<{
        UploadLogs: IStreamUploadContract<void, string>
      }>

      let requestReceived: unknown

      class VoidUploadHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          UploadLogs: (request, onData, onEnd, onError) => {
            requestReceived = request
            onData(() => {})
            onEnd(() => {})
            onError(() => {})
          },
        }
      }

      VoidUploadHandler.register()

      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadLogs-start'
      )
      const startHandler = startCall[1]

      startHandler({}, undefined)

      expect(requestReceived).toBeUndefined()
    })

    it('should handle data event when no callbacks are registered', () => {
      type UploadContract = GenericStreamUploadContract<{
        OrphanData: IStreamUploadContract<void, string>
      }>

      class OrphanDataHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          OrphanData: (_request, onData, onEnd, onError) => {
            onData(() => {})
            onEnd(() => {})
            onError(() => {})
          },
        }
      }

      OrphanDataHandler.register()

      // Get data handler
      const dataCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'OrphanData-data'
      )
      const dataHandler = dataCall[1]

      // Send data without starting the stream - should not throw
      expect(() => dataHandler({}, 'orphan-chunk')).not.toThrow()
    })

    it('should handle end event when no callbacks are registered', () => {
      type UploadContract = GenericStreamUploadContract<{
        OrphanEnd: IStreamUploadContract<void, string>
      }>

      class OrphanEndHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          OrphanEnd: (_request, onData, onEnd, onError) => {
            onData(() => {})
            onEnd(() => {})
            onError(() => {})
          },
        }
      }

      OrphanEndHandler.register()

      // Get end handler
      const endCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'OrphanEnd-end'
      )
      const endHandler = endCall[1]

      // Send end without starting the stream - should not throw
      expect(() => endHandler({}, undefined)).not.toThrow()
    })

    it('should handle error event when no callbacks are registered', () => {
      type UploadContract = GenericStreamUploadContract<{
        OrphanError: IStreamUploadContract<void, string>
      }>

      class OrphanErrorHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          OrphanError: (_request, onData, onEnd, onError) => {
            onData(() => {})
            onEnd(() => {})
            onError(() => {})
          },
        }
      }

      OrphanErrorHandler.register()

      // Get error handler
      const errorCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'OrphanError-error'
      )
      const errorHandler = errorCall[1]

      // Send error without starting the stream - should not throw
      expect(() => errorHandler({}, new Error('Orphan error'))).not.toThrow()
    })
  })

  describe('AbstractRegisterStreamDownload - Cancel & Error', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should handle stream cancellation', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        GetData: IStreamDownloadContract<{ id: number }, string>
      }>

      let streamCancelled = false

      class CancelDownloadHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          GetData: (request) => {
            expect(request.id).toBe(42)
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue('data1')
              },
              cancel() {
                streamCancelled = true
              },
            })
          },
        }
      }

      CancelDownloadHandler.register()

      // Get cancel handler
      const cancelCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'GetData-cancel'
      )
      expect(cancelCall).toBeDefined()
      const cancelHandler = cancelCall[1]

      // First, start the stream
      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'GetData'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      // Start stream (but don't await completion)
      const streamPromise = handler(mockEvent, { id: 42 })

      // Simulate cancel
      await cancelHandler({ sender: { id: 1 } })

      // Wait for stream to complete
      await streamPromise

      expect(streamCancelled).toBe(true)
    })

    it('should handle stream errors during download', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        ErrorDownload: IStreamDownloadContract<void, number>
      }>

      const testError = new Error('Stream failed')

      class ErrorDownloadHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          ErrorDownload: () => {
            return new globalThis.ReadableStream({
              async start(controller) {
                // Enqueue some data first
                controller.enqueue(1)
                // Small delay to ensure data is sent before error
                await new Promise((resolve) => setTimeout(resolve, 10))
                controller.error(testError)
              },
            })
          },
        }
      }

      ErrorDownloadHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'ErrorDownload'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      await handler(mockEvent, undefined)

      // Should send one data chunk and then an error
      expect(mockEvent.sender.send).toHaveBeenCalledWith('ErrorDownload-data', 1)
      expect(mockEvent.sender.send).toHaveBeenCalledWith('ErrorDownload-error', testError)
    })

    it('should replace existing reader when multiple downloads start for same channel', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        MultiDownload: IStreamDownloadContract<{ id: number }, string>
      }>

      let firstStreamCancelled = false
      let secondStreamCancelled = false

      class MultiDownloadHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          MultiDownload: (request) => {
            if (request.id === 1) {
              return new globalThis.ReadableStream({
                async start(controller) {
                  controller.enqueue('first-1')
                  await new Promise((resolve) => setTimeout(resolve, 100))
                  controller.enqueue('first-2')
                  controller.close()
                },
                cancel() {
                  firstStreamCancelled = true
                },
              })
            } else {
              return new globalThis.ReadableStream({
                start(controller) {
                  controller.enqueue('second-1')
                  controller.close()
                },
                cancel() {
                  secondStreamCancelled = true
                },
              })
            }
          },
        }
      }

      MultiDownloadHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'MultiDownload'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      // Start first stream (don't await)
      const promise1 = handler(mockEvent, { id: 1 })

      // Immediately start second stream - should cancel first
      await handler(mockEvent, { id: 2 })

      // Wait for first to complete
      await promise1

      expect(firstStreamCancelled).toBe(true)
      expect(secondStreamCancelled).toBe(false)
    })

    it('should handle cancel errors gracefully', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        CancelError: IStreamDownloadContract<void, string>
      }>

      class CancelErrorHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          CancelError: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue('data')
              },
              cancel() {
                throw new Error('Cancel failed')
              },
            })
          },
        }
      }

      CancelErrorHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'CancelError'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      // Start stream (don't await)
      const streamPromise = handler(mockEvent, undefined)

      // Get cancel handler
      const cancelCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'CancelError-cancel'
      )
      const cancelHandler = cancelCall[1]

      // Cancel should not throw even if cancel() throws
      await expect(cancelHandler({ sender: { id: 1 } })).resolves.toBeUndefined()

      await streamPromise
    })

    it('should handle cancel when no active reader exists', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        NoReader: IStreamDownloadContract<void, string>
      }>

      class NoReaderHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          NoReader: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue('data')
                controller.close()
              },
            })
          },
        }
      }

      NoReaderHandler.register()

      const cancelCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'NoReader-cancel'
      )
      const cancelHandler = cancelCall[1]

      // Cancel without active reader should not throw
      await expect(cancelHandler({ sender: { id: 999 } })).resolves.toBeUndefined()
    })
  })

  describe('Helper Functions', () => {
    it('should define stream upload handlers with type safety', () => {
      type UploadContract = GenericStreamUploadContract<{
        Upload1: IStreamUploadContract<{ id: number }, string>
        Upload2: IStreamUploadContract<void, Uint8Array>
      }>

      const handlers = defineStreamUploadHandlers<UploadContract>({
        Upload1: (_request, onData, onEnd, onError) => {
          onData(() => {})
          onEnd(() => {})
          onError(() => {})
        },
        Upload2: (_request, onData, onEnd, onError) => {
          onData(() => {})
          onEnd(() => {})
          onError(() => {})
        },
      })

      expect(handlers).toBeDefined()
      expect(handlers.Upload1).toBeInstanceOf(Function)
      expect(handlers.Upload2).toBeInstanceOf(Function)
    })

    it('should define stream download handlers with type safety', () => {
      type DownloadContract = GenericStreamDownloadContract<{
        Download1: IStreamDownloadContract<{ count: number }, number>
        Download2: IStreamDownloadContract<void, string>
      }>

      const handlers = defineStreamDownloadHandlers<DownloadContract>({
        Download1: (request) => {
          return new globalThis.ReadableStream({
            start(controller) {
              for (let i = 0; i < request.count; i++) {
                controller.enqueue(i)
              }
              controller.close()
            },
          })
        },
        Download2: () => {
          return new globalThis.ReadableStream({
            start(controller) {
              controller.enqueue('test')
              controller.close()
            },
          })
        },
      })

      expect(handlers).toBeDefined()
      expect(handlers.Download1).toBeInstanceOf(Function)
      expect(handlers.Download2).toBeInstanceOf(Function)
    })
  })

  describe('Trace Context Propagation', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should propagate trace context in upload stream', () => {
      type UploadContract = GenericStreamUploadContract<{
        TracedUpload: IStreamUploadContract<{ id: string }, string>
      }>

      const mockTraceContext = { traceId: 'trace-123', spanId: 'span-456' }
      let capturedTraceContext: unknown = null

      // Mock trace propagation
      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((payload) => {
        if (payload && typeof payload === 'object' && 'id' in payload) {
          return { payload: { id: 'test-id' }, trace: mockTraceContext }
        }
        return { payload, trace: undefined }
      })

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((trace, fn) => {
        capturedTraceContext = trace
        return fn()
      })

      class TracedUploadHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          TracedUpload: (_request, onData, onEnd, onError) => {
            onData(() => {})
            onEnd(() => {})
            onError(() => {})
          },
        }
      }

      TracedUploadHandler.register()

      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TracedUpload-start'
      )
      const startHandler = startCall[1]

      startHandler({}, { id: 'test-id' })

      expect(capturedTraceContext).toEqual(mockTraceContext)
    })

    it('should propagate trace context in download stream', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        TracedDownload: IStreamDownloadContract<{ id: string }, number>
      }>

      const mockTraceContext = { traceId: 'trace-789', spanId: 'span-012' }
      let capturedTraceContext: unknown = null

      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((payload) => {
        if (payload && typeof payload === 'object' && 'id' in payload) {
          return { payload: { id: 'dl-id' }, trace: mockTraceContext }
        }
        return { payload, trace: undefined }
      })

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((trace, fn) => {
        capturedTraceContext = trace
        return fn()
      })

      vi.spyOn(tracePropagation, 'getCurrentTraceContext').mockReturnValue(mockTraceContext)

      vi.spyOn(tracePropagation, 'wrapTracePayload').mockImplementation((payload, trace) => {
        return { payload, trace }
      })

      class TracedDownloadHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          TracedDownload: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue(42)
                controller.close()
              },
            })
          },
        }
      }

      TracedDownloadHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'TracedDownload'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      await handler(mockEvent, { id: 'dl-id' })

      expect(capturedTraceContext).toEqual(mockTraceContext)
      expect(tracePropagation.wrapTracePayload).toHaveBeenCalled()
    })

    it('should handle download stream end without trace context', async () => {
      type DownloadContract = GenericStreamDownloadContract<{
        NoTraceDownload: IStreamDownloadContract<void, string>
      }>

      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((payload) => {
        return { payload, trace: undefined }
      })

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((_trace, fn) => {
        return fn()
      })

      vi.spyOn(tracePropagation, 'getCurrentTraceContext').mockReturnValue(undefined)

      class NoTraceDownloadHandler extends AbstractRegisterStreamDownload {
        handlers: IPCStreamDownloadHandlerType<DownloadContract> = {
          NoTraceDownload: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue('data')
                controller.close()
              },
            })
          },
        }
      }

      NoTraceDownloadHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'NoTraceDownload'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      await handler(mockEvent, undefined)

      // Should send end without trace wrapper when no trace context
      const endCalls = mockEvent.sender.send.mock.calls.filter(
        ([channel]) => channel === 'NoTraceDownload-end'
      )
      expect(endCalls.length).toBe(1)
      // When no trace, send is called with just the channel name, no second arg
      expect(endCalls[0].length).toBe(1)
    })

    it('should use fallback trace from start in upload data/end/error events', () => {
      type UploadContract = GenericStreamUploadContract<{
        TraceFallback: IStreamUploadContract<{ id: string }, string>
      }>

      const startTrace = { traceId: 'start-trace', spanId: 'start-span' }
      let capturedDataTrace: unknown = null
      let capturedEndTrace: unknown = null
      let capturedErrorTrace: unknown = null

      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((payload) => {
        // Only the start event has trace
        if (payload && typeof payload === 'object' && 'id' in payload) {
          return { payload: { id: 'test' }, trace: startTrace }
        }
        // Data, end, error events don't have trace
        return { payload, trace: undefined }
      })

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((trace, fn) => {
        if (!capturedDataTrace && trace) capturedDataTrace = trace
        if (!capturedEndTrace && trace) capturedEndTrace = trace
        if (!capturedErrorTrace && trace) capturedErrorTrace = trace
        return fn()
      })

      class TraceFallbackHandler extends AbstractRegisterStreamUpload {
        handlers: IPCStreamUploadHandlerType<UploadContract> = {
          TraceFallback: (_request, onData, onEnd, onError) => {
            onData(() => {})
            onEnd(() => {})
            onError(() => {})
          },
        }
      }

      TraceFallbackHandler.register()

      // Start stream
      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-start'
      )
      const startHandler = startCall[1]
      startHandler({}, { id: 'test' })

      // Send data (no trace in payload, should use trace from start)
      const dataCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-data'
      )
      const dataHandler = dataCall[1]
      dataHandler({}, 'chunk')

      expect(capturedDataTrace).toEqual(startTrace)

      // Send end (no trace in payload, should use trace from start)
      const endCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-end'
      )
      const endHandler = endCall[1]
      endHandler({}, undefined)

      expect(capturedEndTrace).toEqual(startTrace)

      // Send error (no trace in payload, should use trace from start)
      const errorCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-error'
      )
      const errorHandler = errorCall[1]
      errorHandler({}, new Error('test'))

      expect(capturedErrorTrace).toEqual(startTrace)
    })
  })
})

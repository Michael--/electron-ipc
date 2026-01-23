/* eslint-disable @typescript-eslint/no-explicit-any */
import './test-helpers/electron-mock'
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tracePropagation from './inspector/trace-propagation'
import {
  AbstractRegisterStreamUpload,
  GenericStreamUploadContract,
  IStreamUploadContract,
  IPCStreamUploadHandlerType,
  defineStreamUploadHandlers,
} from './interfaces/ipc-contracts'

describe('Stream IPC Contracts - Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GenericStreamUploadContract', () => {
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
            onData((_chunk) => {})
            onEnd(() => {})
            onError((_err) => {})
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

  describe('AbstractRegisterStreamUpload - Data Flow', () => {
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

      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadChunks-start'
      )
      expect(startCall).toBeDefined()
      if (!startCall) {
        throw new Error('Expected UploadChunks-start handler to be registered')
      }
      const startHandler = startCall[1]

      startHandler({}, { id: 123 })

      const dataCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadChunks-data'
      )
      if (!dataCall) {
        throw new Error('Expected UploadChunks-data handler to be registered')
      }
      const dataHandler = dataCall[1]

      dataHandler({}, 'chunk1')
      dataHandler({}, 'chunk2')
      dataHandler({}, 'chunk3')

      expect(receivedChunks).toEqual(['chunk1', 'chunk2', 'chunk3'])

      const endCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadChunks-end'
      )
      if (!endCall) {
        throw new Error('Expected UploadChunks-end handler to be registered')
      }
      const endHandler = endCall[1]

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
            onData((_chunk) => {})
            onEnd(() => {})
            onError((err) => {
              errorReceived = err
            })
          },
        }
      }

      ErrorUploadHandler.register()

      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadData-start'
      )
      if (!startCall) {
        throw new Error('Expected UploadData-start handler to be registered')
      }
      const startHandler = startCall[1]

      startHandler({}, null)

      const errorCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'UploadData-error'
      )
      if (!errorCall) {
        throw new Error('Expected UploadData-error handler to be registered')
      }
      const errorHandler = errorCall[1]

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
      if (!startCall) {
        throw new Error('Expected UploadLogs-start handler to be registered')
      }
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

      const dataCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'OrphanData-data'
      )
      if (!dataCall) {
        throw new Error('Expected OrphanData-data handler to be registered')
      }
      const dataHandler = dataCall[1]

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

      const endCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'OrphanEnd-end'
      )
      if (!endCall) {
        throw new Error('Expected OrphanEnd-end handler to be registered')
      }
      const endHandler = endCall[1]

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

      const errorCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'OrphanError-error'
      )
      if (!errorCall) {
        throw new Error('Expected OrphanError-error handler to be registered')
      }
      const errorHandler = errorCall[1]

      expect(() => errorHandler({}, new Error('Orphan error'))).not.toThrow()
    })
  })

  describe('Helper Functions - Upload', () => {
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
  })

  describe('Trace Context Propagation - Upload', () => {
    it('should propagate trace context in upload stream', () => {
      type UploadContract = GenericStreamUploadContract<{
        TracedUpload: IStreamUploadContract<{ id: string }, string>
      }>

      const mockTraceContext = { traceId: 'trace-123', spanId: 'span-456' }
      let capturedTraceContext: unknown = null

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
      if (!startCall) {
        throw new Error('Expected TracedUpload-start handler to be registered')
      }
      const startHandler = startCall[1]

      startHandler({}, { id: 'test-id' })

      expect(capturedTraceContext).toEqual(mockTraceContext)
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
        if (payload && typeof payload === 'object' && 'id' in payload) {
          return { payload: { id: 'test' }, trace: startTrace }
        }
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

      const startCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-start'
      )
      if (!startCall) {
        throw new Error('Expected TraceFallback-start handler to be registered')
      }
      const startHandler = startCall[1]
      startHandler({}, { id: 'test' })

      const dataCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-data'
      )
      if (!dataCall) {
        throw new Error('Expected TraceFallback-data handler to be registered')
      }
      const dataHandler = dataCall[1]
      dataHandler({}, 'chunk')

      expect(capturedDataTrace).toEqual(startTrace)

      const endCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-end'
      )
      if (!endCall) {
        throw new Error('Expected TraceFallback-end handler to be registered')
      }
      const endHandler = endCall[1]
      endHandler({}, undefined)

      expect(capturedEndTrace).toEqual(startTrace)

      const errorCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'TraceFallback-error'
      )
      if (!errorCall) {
        throw new Error('Expected TraceFallback-error handler to be registered')
      }
      const errorHandler = errorCall[1]
      errorHandler({}, new Error('test'))

      expect(capturedErrorTrace).toEqual(startTrace)
    })
  })
})

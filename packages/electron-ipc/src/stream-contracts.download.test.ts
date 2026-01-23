/* eslint-disable @typescript-eslint/no-explicit-any */
import './test-helpers/electron-mock'
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tracePropagation from './inspector/trace-propagation'
import {
  AbstractRegisterStreamDownload,
  GenericStreamDownloadContract,
  IStreamDownloadContract,
  IPCStreamDownloadHandlerType,
  defineStreamDownloadHandlers,
} from './interfaces/ipc-contracts'

describe('Stream IPC Contracts - Download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GenericStreamDownloadContract', () => {
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

  describe('AbstractRegisterStreamDownload - Cancel & Error', () => {
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

      const cancelCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'GetData-cancel'
      )
      expect(cancelCall).toBeDefined()
      if (!cancelCall) {
        throw new Error('Expected GetData-cancel handler to be registered')
      }
      const cancelHandler = cancelCall[1]

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'GetData'
      )
      if (!handleCall) {
        throw new Error('Expected GetData handler to be registered')
      }
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      const streamPromise = handler(mockEvent, { id: 42 })

      await cancelHandler({ sender: { id: 1 } })

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
                controller.enqueue(1)
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
      if (!handleCall) {
        throw new Error('Expected ErrorDownload handler to be registered')
      }
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      await handler(mockEvent, undefined)

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
            }

            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue('second-1')
                controller.close()
              },
              cancel() {
                secondStreamCancelled = true
              },
            })
          },
        }
      }

      MultiDownloadHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'MultiDownload'
      )
      if (!handleCall) {
        throw new Error('Expected MultiDownload handler to be registered')
      }
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      const promise1 = handler(mockEvent, { id: 1 })

      await handler(mockEvent, { id: 2 })

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
      if (!handleCall) {
        throw new Error('Expected CancelError handler to be registered')
      }
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      const streamPromise = handler(mockEvent, undefined)

      const cancelCall = (ipcMain.on as any).mock.calls.find(
        ([channel]) => channel === 'CancelError-cancel'
      )
      if (!cancelCall) {
        throw new Error('Expected CancelError-cancel handler to be registered')
      }
      const cancelHandler = cancelCall[1]

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
      if (!cancelCall) {
        throw new Error('Expected NoReader-cancel handler to be registered')
      }
      const cancelHandler = cancelCall[1]

      await expect(cancelHandler({ sender: { id: 999 } })).resolves.toBeUndefined()
    })
  })

  describe('Helper Functions - Download', () => {
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

  describe('Trace Context Propagation - Download', () => {
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

      vi.spyOn(tracePropagation, 'wrapTracePayload').mockImplementation((payload, trace) => ({
        payload,
        trace,
      }))

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
      if (!handleCall) {
        throw new Error('Expected TracedDownload handler to be registered')
      }
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

      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((payload) => ({
        payload,
        trace: undefined,
      }))

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((_trace, fn) => fn())

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
      if (!handleCall) {
        throw new Error('Expected NoTraceDownload handler to be registered')
      }
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      await handler(mockEvent, undefined)

      const endCalls = mockEvent.sender.send.mock.calls.filter(
        ([channel]) => channel === 'NoTraceDownload-end'
      )
      expect(endCalls.length).toBe(1)
      expect(endCalls[0].length).toBe(1)
    })
  })
})

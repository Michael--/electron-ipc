/* eslint-disable @typescript-eslint/no-explicit-any */
import './test-helpers/electron-mock'
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbstractRegisterHandler,
  AbstractRegisterStreamHandler,
  defineInvokeHandlers,
  defineStreamInvokeHandlers,
  GenericInvokeContract,
  GenericStreamInvokeContract,
  IPCHandlerType,
  IPCStreamHandlerType,
  IInvokeContract,
  IStreamInvokeContract,
} from './interfaces/ipc-contracts'
import * as tracePropagation from './inspector/trace-propagation'

describe('Invoke IPC Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GenericInvokeContract', () => {
    it('should accept valid invoke contract structure', () => {
      type TestInvokeContract = GenericInvokeContract<{
        Echo: IInvokeContract<string, string>
      }>

      const contract: TestInvokeContract = {
        Echo: {
          request: 'hello',
          response: 'hello',
        },
      }

      expect(contract.Echo.request).toBe('hello')
      expect(contract.Echo.response).toBe('hello')
    })

    it('should accept invoke contract with void request', () => {
      type VoidRequestContract = GenericInvokeContract<{
        GetTime: IInvokeContract<void, number>
      }>

      const contract: VoidRequestContract = {
        GetTime: {
          request: undefined,
          response: Date.now(),
        },
      }

      expect(contract.GetTime.request).toBeUndefined()
      expect(typeof contract.GetTime.response).toBe('number')
    })

    it('should accept invoke contract with void response', () => {
      type VoidResponseContract = GenericInvokeContract<{
        DoAction: IInvokeContract<{ action: string }, void>
      }>

      const contract: VoidResponseContract = {
        DoAction: {
          request: { action: 'test' },
          response: undefined,
        },
      }

      expect(contract.DoAction.request.action).toBe('test')
      expect(contract.DoAction.response).toBeUndefined()
    })

    it('should accept various serializable types', () => {
      type MultiTypeContract = GenericInvokeContract<{
        GetUser: IInvokeContract<{ id: number }, { name: string; age: number }>
        Calculate: IInvokeContract<number[], number>
        Toggle: IInvokeContract<boolean, boolean>
      }>

      const contract: MultiTypeContract = {
        GetUser: {
          request: { id: 1 },
          response: { name: 'John', age: 30 },
        },
        Calculate: {
          request: [1, 2, 3],
          response: 6,
        },
        Toggle: {
          request: true,
          response: false,
        },
      }

      expect(contract.GetUser.response.name).toBe('John')
      expect(contract.Calculate.response).toBe(6)
      expect(contract.Toggle.response).toBe(false)
    })
  })

  describe('AbstractRegisterHandler', () => {
    it('should register invoke handlers', async () => {
      type TestInvokeContract = GenericInvokeContract<{
        TestInvoke: IInvokeContract<{ value: string }, string>
      }>

      class TestInvokeHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<TestInvokeContract> = {
          TestInvoke: async (_event, request) => {
            return `Received: ${request.value}`
          },
        }
      }

      TestInvokeHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('TestInvoke')
      expect(ipcMain.handle).toHaveBeenCalledWith('TestInvoke', expect.any(Function))
    })

    it('should handle async invoke requests', async () => {
      type InvokeContract = GenericInvokeContract<{
        AsyncEcho: IInvokeContract<string, string>
      }>

      class AsyncInvokeHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<InvokeContract> = {
          AsyncEcho: async (_event, request) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            return `Echo: ${request}`
          },
        }
      }

      AsyncInvokeHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'AsyncEcho'
      )
      const handler = handleCall[1]

      const mockEvent = { sender: { id: 1 } }
      const result = await handler(mockEvent, 'test')

      expect(result).toBe('Echo: test')
    })

    it('should handle sync invoke requests', async () => {
      type InvokeContract = GenericInvokeContract<{
        SyncAdd: IInvokeContract<{ a: number; b: number }, number>
      }>

      class SyncInvokeHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<InvokeContract> = {
          SyncAdd: (_event, { a, b }) => {
            return a + b
          },
        }
      }

      SyncInvokeHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'SyncAdd'
      )
      const handler = handleCall[1]

      const mockEvent = { sender: { id: 1 } }
      const result = await handler(mockEvent, { a: 5, b: 3 })

      expect(result).toBe(8)
    })

    it('should handle void request', async () => {
      type InvokeContract = GenericInvokeContract<{
        GetRandom: IInvokeContract<void, number>
      }>

      class VoidRequestHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<InvokeContract> = {
          GetRandom: () => {
            return 42
          },
        }
      }

      VoidRequestHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'GetRandom'
      )
      const handler = handleCall[1]

      const mockEvent = { sender: { id: 1 } }
      const result = await handler(mockEvent, undefined)

      expect(result).toBe(42)
    })

    it('should handle void response', async () => {
      type InvokeContract = GenericInvokeContract<{
        DoWork: IInvokeContract<{ task: string }, void>
      }>

      let taskReceived = ''

      class VoidResponseHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<InvokeContract> = {
          DoWork: async (_event, { task }) => {
            taskReceived = task
            return undefined
          },
        }
      }

      VoidResponseHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'DoWork'
      )
      const handler = handleCall[1]

      const mockEvent = { sender: { id: 1 } }
      const result = await handler(mockEvent, { task: 'test-task' })

      expect(result).toBeUndefined()
      expect(taskReceived).toBe('test-task')
    })

    it('should register multiple handlers', () => {
      type InvokeContract = GenericInvokeContract<{
        Handler1: IInvokeContract<string, string>
        Handler2: IInvokeContract<number, number>
        Handler3: IInvokeContract<boolean, boolean>
      }>

      class MultiHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<InvokeContract> = {
          Handler1: (_event, req) => req,
          Handler2: (_event, req) => req * 2,
          Handler3: (_event, req) => !req,
        }
      }

      MultiHandler.register()

      expect(ipcMain.handle).toHaveBeenCalledWith('Handler1', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('Handler2', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('Handler3', expect.any(Function))
    })

    it('should maintain singleton pattern per class', () => {
      type InvokeContract = GenericInvokeContract<{
        SingletonInvoke: IInvokeContract<string, string>
      }>

      let instanceCount = 0

      class SingletonHandler extends AbstractRegisterHandler {
        constructor() {
          super()
          instanceCount++
        }

        handlers: IPCHandlerType<InvokeContract> = {
          SingletonInvoke: (_event, req) => req,
        }
      }

      SingletonHandler.register()
      SingletonHandler.register()
      SingletonHandler.register()

      expect(instanceCount).toBe(1)
    })
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
  })

  describe('AbstractRegisterStreamHandler', () => {
    it('should register stream handler and process chunks', async () => {
      type TestStreamContract = GenericStreamInvokeContract<{
        TestStream: IStreamInvokeContract<{ id: string }, string>
      }>

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      const chunks = ['chunk1', 'chunk2', 'chunk3']

      class TestStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<TestStreamContract> = {
          TestStream: (_event, request) => {
            expect(request.id).toBe('test-id')

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

      const handleCall = (ipcMain.handle as any).mock.calls[0]
      const handler = handleCall[1]

      await handler(mockEvent, { id: 'test-id' })

      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-data', 'chunk1')
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-data', 'chunk2')
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-data', 'chunk3')
      expect(mockEvent.sender.send).toHaveBeenCalledWith('TestStream-end')
    })

    it('should handle invalid stream (no getReader method)', async () => {
      type TestStreamContract = GenericStreamInvokeContract<{
        InvalidStream: IStreamInvokeContract<void, string>
      }>

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      class InvalidStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<TestStreamContract> = {
          InvalidStream: () => {
            // Return an object without getReader method
            return {} as any
          },
        }
      }

      InvalidStreamHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'InvalidStream'
      )
      const handler = handleCall[1]

      await handler(mockEvent, undefined)

      // Should send error about invalid stream
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'InvalidStream-error',
        expect.objectContaining({
          message: 'Handler must return a Web Streams API ReadableStream',
        })
      )
    })

    it('should maintain singleton pattern', () => {
      type StreamContract = GenericStreamInvokeContract<{
        Stream1: IStreamInvokeContract<void, number>
      }>

      let instanceCount = 0

      class SingletonStreamHandler extends AbstractRegisterStreamHandler {
        constructor() {
          super()
          instanceCount++
        }

        handlers: IPCStreamHandlerType<StreamContract> = {
          Stream1: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.close()
              },
            })
          },
        }
      }

      SingletonStreamHandler.register()
      SingletonStreamHandler.register()
      SingletonStreamHandler.register()

      expect(instanceCount).toBe(1)
    })
  })

  describe('Helper Functions', () => {
    it('should define invoke handlers with type safety', () => {
      type InvokeContract = GenericInvokeContract<{
        Handler1: IInvokeContract<{ id: number }, string>
        Handler2: IInvokeContract<void, boolean>
      }>

      const handlers = defineInvokeHandlers<InvokeContract>({
        Handler1: async (_event, request) => {
          return `ID: ${request.id}`
        },
        Handler2: () => {
          return true
        },
      })

      expect(handlers).toBeDefined()
      expect(handlers.Handler1).toBeInstanceOf(Function)
      expect(handlers.Handler2).toBeInstanceOf(Function)
    })

    it('should define stream invoke handlers with type safety', () => {
      type StreamContract = GenericStreamInvokeContract<{
        Stream1: IStreamInvokeContract<{ count: number }, number>
        Stream2: IStreamInvokeContract<void, string>
      }>

      const handlers = defineStreamInvokeHandlers<StreamContract>({
        Stream1: (event, request) => {
          return new globalThis.ReadableStream({
            start(controller) {
              for (let i = 0; i < request.count; i++) {
                controller.enqueue(i)
              }
              controller.close()
            },
          })
        },
        Stream2: () => {
          return new globalThis.ReadableStream({
            start(controller) {
              controller.enqueue('test')
              controller.close()
            },
          })
        },
      })

      expect(handlers).toBeDefined()
      expect(handlers.Stream1).toBeInstanceOf(Function)
      expect(handlers.Stream2).toBeInstanceOf(Function)
    })
  })

  describe('Trace Context Propagation', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should propagate trace context in invoke handlers', async () => {
      type InvokeContract = GenericInvokeContract<{
        TracedInvoke: IInvokeContract<{ data: string }, string>
      }>

      const mockTraceContext = { traceId: 'trace-123', spanId: 'span-456' }
      let capturedTraceContext: unknown = null

      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((_payload) => {
        return { payload: { data: 'test' }, trace: mockTraceContext }
      })

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((trace, fn) => {
        capturedTraceContext = trace
        return fn()
      })

      class TracedInvokeHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<InvokeContract> = {
          TracedInvoke: async (_event, request) => {
            return `Received: ${request.data}`
          },
        }
      }

      TracedInvokeHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'TracedInvoke'
      )
      const handler = handleCall[1]

      const mockEvent = { sender: { id: 1 } }
      await handler(mockEvent, { data: 'test' })

      expect(capturedTraceContext).toEqual(mockTraceContext)
    })

    it('should propagate trace context in stream handlers', async () => {
      type StreamContract = GenericStreamInvokeContract<{
        TracedStream: IStreamInvokeContract<{ id: string }, number>
      }>

      const mockTraceContext = { traceId: 'trace-789', spanId: 'span-012' }
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

      vi.spyOn(tracePropagation, 'getCurrentTraceContext').mockReturnValue(mockTraceContext)
      vi.spyOn(tracePropagation, 'wrapTracePayload').mockImplementation((payload, trace) => {
        return { payload, trace }
      })

      class TracedStreamHandler extends AbstractRegisterStreamHandler {
        handlers: IPCStreamHandlerType<StreamContract> = {
          TracedStream: () => {
            return new globalThis.ReadableStream({
              start(controller) {
                controller.enqueue(42)
                controller.close()
              },
            })
          },
        }
      }

      TracedStreamHandler.register()

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        ([channel]) => channel === 'TracedStream'
      )
      const handler = handleCall[1]

      const mockEvent = {
        sender: {
          id: 1,
          send: vi.fn(),
        },
      }

      await handler(mockEvent, { id: 'test-id' })

      expect(capturedTraceContext).toEqual(mockTraceContext)
      expect(tracePropagation.wrapTracePayload).toHaveBeenCalled()
    })
  })
})

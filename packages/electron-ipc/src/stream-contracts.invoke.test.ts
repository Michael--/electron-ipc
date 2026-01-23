/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbstractRegisterStreamHandler,
  GenericStreamInvokeContract,
  IStreamInvokeContract,
  IPCStreamHandlerType,
} from './interfaces/ipc-contracts'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

describe('Stream IPC Contracts - Invoke', () => {
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

      expect(ipcMain.handle).toHaveBeenCalledTimes(3)
      expect(ipcMain.handle).toHaveBeenCalledWith('NumberStream', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ObjectStream', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ArrayStream', expect.any(Function))
    })
  })
})

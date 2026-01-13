/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow, ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  createBroadcast,
  defineEventHandlers,
  defineInvokeHandlers,
  defineStreamDownloadHandlers,
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericStreamDownloadContract,
  IBroadcastContract,
  IInvokeContract,
  IPCEventType,
  IPCHandlerType,
  IPCStreamDownloadHandlerType,
  IRendererEventContract,
  IStreamDownloadContract,
} from './interfaces/ipc-contracts'

// Mock Electron APIs
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

describe('IPC Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GenericInvokeContract', () => {
    it('should accept valid invoke contract structure', () => {
      type TestContract = GenericInvokeContract<{
        TestMethod: IInvokeContract<string, number>
      }>

      const contract: TestContract = {
        TestMethod: {
          request: 'test',
          response: 42,
        },
      }

      expect(contract.TestMethod.request).toBe('test')
      expect(contract.TestMethod.response).toBe(42)
    })

    it('should reject invalid invoke contract structure', () => {
      // This should cause a TypeScript error if uncommented
      // type InvalidContract = GenericInvokeContract<{
      //   TestMethod: { invalid: string }
      // }>
    })

    it('should handle multiple invoke contracts', () => {
      type MultiContract = GenericInvokeContract<{
        Method1: IInvokeContract<string, boolean>
        Method2: IInvokeContract<number[], string>
      }>

      const contracts: MultiContract = {
        Method1: {
          request: 'test',
          response: true,
        },
        Method2: {
          request: [1, 2, 3],
          response: 'result',
        },
      }

      expect(contracts.Method1.request).toBe('test')
      expect(contracts.Method1.response).toBe(true)
      expect(contracts.Method2.request).toEqual([1, 2, 3])
      expect(contracts.Method2.response).toBe('result')
    })
  })

  describe('GenericRendererEventContract', () => {
    it('should accept valid event contract structure', () => {
      type TestContract = GenericRendererEventContract<{
        TestEvent: IRendererEventContract<string>
      }>

      const contract: TestContract = {
        TestEvent: {
          request: 'event data',
        },
      }

      expect(contract.TestEvent.request).toBe('event data')
    })

    it('should reject invalid event contract structure', () => {
      // This should cause a TypeScript error if uncommented
      // type InvalidContract = GenericRendererEventContract<{
      //   TestEvent: { invalid: string }
      // }>
    })

    it('should handle multiple event contracts', () => {
      type MultiContract = GenericRendererEventContract<{
        Event1: IRendererEventContract<boolean>
        Event2: IRendererEventContract<{ id: number; message: string }>
      }>

      const contracts: MultiContract = {
        Event1: {
          request: true,
        },
        Event2: {
          request: { id: 123, message: 'test' },
        },
      }

      expect(contracts.Event1.request).toBe(true)
      expect(contracts.Event2.request).toEqual({ id: 123, message: 'test' })
    })
  })

  describe('GenericBroadcastContract', () => {
    it('should accept valid broadcast contract structure', () => {
      type TestContract = GenericBroadcastContract<{
        TestBroadcast: IBroadcastContract<string>
      }>

      const contract: TestContract = {
        TestBroadcast: {
          payload: 'broadcast data',
        },
      }

      expect(contract.TestBroadcast.payload).toBe('broadcast data')
    })

    it('should reject invalid broadcast contract structure', () => {
      // This should cause a TypeScript error if uncommented
      // type InvalidContract = GenericBroadcastContract<{
      //   TestBroadcast: { invalid: string }
      // }>
    })

    it('should handle multiple broadcast contracts', () => {
      type MultiContract = GenericBroadcastContract<{
        Broadcast1: IBroadcastContract<number>
        Broadcast2: IBroadcastContract<{ status: string; progress: number }>
      }>

      const contracts: MultiContract = {
        Broadcast1: {
          payload: 75,
        },
        Broadcast2: {
          payload: { status: 'processing', progress: 75 },
        },
      }

      expect(contracts.Broadcast1.payload).toBe(75)
      expect(contracts.Broadcast2.payload).toEqual({ status: 'processing', progress: 75 })
    })
  })

  describe('Handler Helpers', () => {
    it('should return invoke handlers unchanged', () => {
      type TestInvokeContract = GenericInvokeContract<{
        TestInvoke: IInvokeContract<{ id: string }, string>
      }>

      const handlers: IPCHandlerType<TestInvokeContract> = {
        TestInvoke: async (_event, request) => `ok:${request.id}`,
      }

      const result = defineInvokeHandlers<TestInvokeContract>(handlers)
      expect(result).toBe(handlers)
    })

    it('should return event handlers unchanged', () => {
      type TestEventContract = GenericRendererEventContract<{
        TestEvent: IRendererEventContract<string>
      }>

      const handlers: IPCEventType<TestEventContract> = {
        TestEvent: (_event, payload) => {
          void payload
        },
      }

      const result = defineEventHandlers<TestEventContract>(handlers)
      expect(result).toBe(handlers)
    })

    it('should return stream download handlers unchanged', () => {
      type TestDownloadContract = GenericStreamDownloadContract<{
        DownloadLogs: IStreamDownloadContract<{ sinceMs: number }, string>
      }>

      const handlers: IPCStreamDownloadHandlerType<TestDownloadContract> = {
        DownloadLogs: async () => {
          return new globalThis.ReadableStream({
            start(controller) {
              controller.enqueue('ok')
              controller.close()
            },
          })
        },
      }

      const result = defineStreamDownloadHandlers<TestDownloadContract>(handlers)
      expect(result).toBe(handlers)
    })
  })

  describe('AbstractRegisterHandler', () => {
    it('should register handlers correctly', () => {
      type TestInvokeContract = GenericInvokeContract<{
        testChannel: IInvokeContract<string, string>
      }>

      class TestHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<TestInvokeContract> = {
          testChannel: vi.fn().mockResolvedValue('response'),
        }
      }

      TestHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('testChannel')
      expect(ipcMain.handle).toHaveBeenCalledWith('testChannel', expect.any(Function))
    })

    it('should only create one instance per class', () => {
      let instanceCount = 0

      class SingletonHandler extends AbstractRegisterHandler {
        constructor() {
          super()
          instanceCount++
        }

        handlers: IPCHandlerType<any> = {
          singletonChannel: vi.fn().mockResolvedValue('singleton'),
        }
      }

      SingletonHandler.register()
      SingletonHandler.register() // Should not create new instance

      expect(instanceCount).toBe(1)
      expect(ipcMain.handle).toHaveBeenCalledTimes(2) // Called twice, once per register call
    })

    it('should handle multiple handlers', () => {
      class MultiHandler extends AbstractRegisterHandler {
        handlers: IPCHandlerType<any> = {
          channel1: vi.fn().mockResolvedValue('response1'),
          channel2: vi.fn().mockResolvedValue('response2'),
        }
      }

      MultiHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('channel1')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('channel2')
      expect(ipcMain.handle).toHaveBeenCalledTimes(2)
    })
  })

  describe('AbstractRegisterEvent', () => {
    it('should register events correctly', () => {
      class TestEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<any> = {
          testEvent: vi.fn(),
        }
      }

      TestEventHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('testEvent')
      expect(ipcMain.on).toHaveBeenCalledWith('testEvent', expect.any(Function))
    })

    it('should only create one instance per class', () => {
      let instanceCount = 0

      class SingletonEventHandler extends AbstractRegisterEvent {
        constructor() {
          super()
          instanceCount++
        }

        events: IPCEventType<any> = {
          singletonEvent: vi.fn(),
        }
      }

      SingletonEventHandler.register()
      SingletonEventHandler.register() // Should not create new instance

      expect(instanceCount).toBe(1)
      expect(ipcMain.on).toHaveBeenCalledTimes(2) // Called twice, once per register call
    })

    it('should handle multiple events', () => {
      class MultiEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<any> = {
          event1: vi.fn(),
          event2: vi.fn(),
        }
      }

      MultiEventHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('event1')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('event2')
      expect(ipcMain.on).toHaveBeenCalledTimes(2)
    })
  })

  describe('createBroadcast', () => {
    it('should create broadcast function', () => {
      type TestBroadcast = GenericBroadcastContract<{
        TestChannel: IBroadcastContract<string>
      }>

      const broadcast = createBroadcast<TestBroadcast>()

      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: {
          send: vi.fn(),
        },
      } as unknown as BrowserWindow

      broadcast('TestChannel', mockWindow, 'test payload')

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('TestChannel', 'test payload')
    })

    it('should not send if window is destroyed', () => {
      type TestBroadcast = GenericBroadcastContract<{
        TestChannel: IBroadcastContract<string>
      }>

      const broadcast = createBroadcast<TestBroadcast>()

      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(true),
        webContents: {
          send: vi.fn(),
        },
      } as unknown as BrowserWindow

      broadcast('TestChannel', mockWindow, 'test payload')

      expect(mockWindow.webContents.send).not.toHaveBeenCalled()
    })

    it('should handle different payload types', () => {
      type MultiBroadcast = GenericBroadcastContract<{
        StringChannel: IBroadcastContract<string>
        NumberChannel: IBroadcastContract<number>
        ObjectChannel: IBroadcastContract<{ data: string; count: number }>
      }>

      const broadcast = createBroadcast<MultiBroadcast>()

      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: {
          send: vi.fn(),
        },
      } as unknown as BrowserWindow

      broadcast('StringChannel', mockWindow, 'string payload')
      broadcast('NumberChannel', mockWindow, 42)
      broadcast('ObjectChannel', mockWindow, { data: 'test', count: 10 })

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('StringChannel', 'string payload')
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('NumberChannel', 42)
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('ObjectChannel', {
        data: 'test',
        count: 10,
      })
    })
  })
})

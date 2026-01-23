/* eslint-disable @typescript-eslint/no-explicit-any */
import './test-helpers/electron-mock'
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbstractRegisterEvent,
  defineEventHandlers,
  GenericRendererEventContract,
  IPCEventType,
  IRendererEventContract,
} from './interfaces/ipc-contracts'
import * as tracePropagation from './inspector/trace-propagation'

describe('Event IPC Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GenericRendererEventContract', () => {
    it('should accept valid event contract structure', () => {
      type TestEventContract = GenericRendererEventContract<{
        LogMessage: IRendererEventContract<{ level: string; message: string }>
      }>

      const contract: TestEventContract = {
        LogMessage: {
          request: { level: 'info', message: 'Test message' },
        },
      }

      expect(contract.LogMessage.request.level).toBe('info')
      expect(contract.LogMessage.request.message).toBe('Test message')
    })

    it('should accept event contract with void request', () => {
      type VoidEventContract = GenericRendererEventContract<{
        Quit: IRendererEventContract<void>
      }>

      const contract: VoidEventContract = {
        Quit: {
          request: undefined,
        },
      }

      expect(contract.Quit.request).toBeUndefined()
    })

    it('should accept various serializable request types', () => {
      type MultiTypeContract = GenericRendererEventContract<{
        NumberEvent: IRendererEventContract<number>
        StringEvent: IRendererEventContract<string>
        ObjectEvent: IRendererEventContract<{ id: number; data: string }>
        ArrayEvent: IRendererEventContract<string[]>
      }>

      const contract: MultiTypeContract = {
        NumberEvent: { request: 42 },
        StringEvent: { request: 'test' },
        ObjectEvent: { request: { id: 1, data: 'value' } },
        ArrayEvent: { request: ['a', 'b', 'c'] },
      }

      expect(contract.NumberEvent.request).toBe(42)
      expect(contract.StringEvent.request).toBe('test')
      expect(contract.ObjectEvent.request).toEqual({ id: 1, data: 'value' })
      expect(contract.ArrayEvent.request).toEqual(['a', 'b', 'c'])
    })
  })

  describe('AbstractRegisterEvent', () => {
    it('should register event handlers', () => {
      type TestEventContract = GenericRendererEventContract<{
        TestEvent: IRendererEventContract<{ value: string }>
      }>

      class TestEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<TestEventContract> = {
          TestEvent: (_event, request) => {
            expect(request.value).toBeDefined()
          },
        }
      }

      TestEventHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('TestEvent')
      expect(ipcMain.on).toHaveBeenCalledWith('TestEvent', expect.any(Function))
    })

    it('should handle event data correctly', () => {
      type EventContract = GenericRendererEventContract<{
        LogEvent: IRendererEventContract<{ message: string; level: string }>
      }>

      let receivedMessage = ''
      let receivedLevel = ''

      class LogEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<EventContract> = {
          LogEvent: (_event, { message, level }) => {
            receivedMessage = message
            receivedLevel = level
          },
        }
      }

      LogEventHandler.register()

      const onCall = (ipcMain.on as any).mock.calls.find(([channel]) => channel === 'LogEvent')
      expect(onCall).toBeDefined()
      const handler = onCall[1]

      const mockEvent = { sender: { id: 1 } }
      handler(mockEvent, { message: 'Test log', level: 'error' })

      expect(receivedMessage).toBe('Test log')
      expect(receivedLevel).toBe('error')
    })

    it('should handle void request events', () => {
      type EventContract = GenericRendererEventContract<{
        QuitEvent: IRendererEventContract<void>
      }>

      let quitCalled = false

      class QuitEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<EventContract> = {
          QuitEvent: () => {
            quitCalled = true
          },
        }
      }

      QuitEventHandler.register()

      const onCall = (ipcMain.on as any).mock.calls.find(([channel]) => channel === 'QuitEvent')
      const handler = onCall[1]

      const mockEvent = { sender: { id: 1 } }
      handler(mockEvent, undefined)

      expect(quitCalled).toBe(true)
    })

    it('should register multiple event handlers', () => {
      type EventContract = GenericRendererEventContract<{
        Event1: IRendererEventContract<{ data: string }>
        Event2: IRendererEventContract<number>
        Event3: IRendererEventContract<void>
      }>

      class MultiEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<EventContract> = {
          Event1: () => {},
          Event2: () => {},
          Event3: () => {},
        }
      }

      MultiEventHandler.register()

      expect(ipcMain.on).toHaveBeenCalledWith('Event1', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('Event2', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('Event3', expect.any(Function))
    })

    it('should maintain singleton pattern per class', () => {
      type EventContract = GenericRendererEventContract<{
        SingletonEvent: IRendererEventContract<string>
      }>

      let instanceCount = 0

      class SingletonEventHandler extends AbstractRegisterEvent {
        constructor() {
          super()
          instanceCount++
        }

        events: IPCEventType<EventContract> = {
          SingletonEvent: () => {},
        }
      }

      SingletonEventHandler.register()
      SingletonEventHandler.register()
      SingletonEventHandler.register()

      expect(instanceCount).toBe(1)
    })

    it('should remove existing handler before registering new one', () => {
      type EventContract = GenericRendererEventContract<{
        ReplaceEvent: IRendererEventContract<number>
      }>

      class ReplaceEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<EventContract> = {
          ReplaceEvent: () => {},
        }
      }

      ReplaceEventHandler.register()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('ReplaceEvent')
      expect(ipcMain.on).toHaveBeenCalledWith('ReplaceEvent', expect.any(Function))

      // Verify removeHandler was called at least once
      const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls.filter(
        ([channel]: any) => channel === 'ReplaceEvent'
      )
      expect(removeHandlerCalls.length).toBeGreaterThan(0)
    })
  })

  describe('defineEventHandlers', () => {
    it('should define event handlers with type safety', () => {
      type EventContract = GenericRendererEventContract<{
        Handler1: IRendererEventContract<{ id: number }>
        Handler2: IRendererEventContract<string>
      }>

      const handlers = defineEventHandlers<EventContract>({
        Handler1: (_event, request) => {
          expect(request.id).toBeDefined()
        },
        Handler2: (_event, request) => {
          expect(typeof request).toBe('string')
        },
      })

      expect(handlers).toBeDefined()
      expect(handlers.Handler1).toBeInstanceOf(Function)
      expect(handlers.Handler2).toBeInstanceOf(Function)
    })
  })

  describe('Trace Context Propagation', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should propagate trace context in event handlers', () => {
      type EventContract = GenericRendererEventContract<{
        TracedEvent: IRendererEventContract<{ data: string }>
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

      class TracedEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<EventContract> = {
          TracedEvent: () => {},
        }
      }

      TracedEventHandler.register()

      const onCall = (ipcMain.on as any).mock.calls.find(([channel]) => channel === 'TracedEvent')
      const handler = onCall[1]

      const mockEvent = { sender: { id: 1 } }
      handler(mockEvent, { data: 'test' })

      expect(capturedTraceContext).toEqual(mockTraceContext)
    })

    it('should handle events without trace context', () => {
      type EventContract = GenericRendererEventContract<{
        NoTraceEvent: IRendererEventContract<number>
      }>

      vi.spyOn(tracePropagation, 'unwrapTracePayload').mockImplementation((_payload) => {
        return { payload: 42, trace: undefined }
      })

      vi.spyOn(tracePropagation, 'runWithTraceContext').mockImplementation((_trace, fn) => {
        return fn()
      })

      let eventHandled = false

      class NoTraceEventHandler extends AbstractRegisterEvent {
        events: IPCEventType<EventContract> = {
          NoTraceEvent: (_event, request) => {
            expect(request).toBe(42)
            eventHandled = true
          },
        }
      }

      NoTraceEventHandler.register()

      const onCall = (ipcMain.on as any).mock.calls.find(([channel]) => channel === 'NoTraceEvent')
      const handler = onCall[1]

      const mockEvent = { sender: { id: 1 } }
      handler(mockEvent, 42)

      expect(eventHandled).toBe(true)
    })
  })
})

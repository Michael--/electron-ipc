import { beforeEach, describe, expect, it } from 'vitest'
import {
  AbstractRegisterRendererInvoke,
  defineRendererInvokeHandlers,
  type GenericRendererInvokeContract,
  type IRendererInvokeContract,
  type RendererInvokeContext,
  type RendererInvokeHandler,
  type RendererInvokeHandlerType,
  type RendererInvokeRequestType,
  type RendererInvokeResponseType,
} from './renderer-invoke-contracts'

/**
 * Tests for renderer-to-renderer invoke contracts
 */
describe('renderer-invoke-contracts', () => {
  describe('IRendererInvokeContract', () => {
    it('enforces serializable request and response types', () => {
      type ValidContract = IRendererInvokeContract<{ query: string }, { data: string[] }>
      type VoidRequestContract = IRendererInvokeContract<void, { result: number }>
      type VoidResponseContract = IRendererInvokeContract<{ input: number }, void>
      type BothVoidContract = IRendererInvokeContract<void, void>

      const _v1: ValidContract = null as unknown as ValidContract
      const _v2: VoidRequestContract = null as unknown as VoidRequestContract
      const _v3: VoidResponseContract = null as unknown as VoidResponseContract
      const _v4: BothVoidContract = null as unknown as BothVoidContract

      expect(_v1 || _v2 || _v3 || _v4).toBeDefined()
    })
  })

  describe('GenericRendererInvokeContract', () => {
    it('validates multiple renderer invoke contracts', () => {
      type MyContracts = GenericRendererInvokeContract<{
        GetData: IRendererInvokeContract<{ id: number }, { name: string; value: number }>
        SendMessage: IRendererInvokeContract<{ text: string; target: string }, void>
        FetchList: IRendererInvokeContract<void, { items: string[] }>
      }>

      const _contracts: MyContracts = null as unknown as MyContracts
      expect(_contracts).toBeDefined()
    })

    it('enforces IRendererInvokeContract structure for all contracts', () => {
      type ValidContracts = GenericRendererInvokeContract<{
        Alpha: IRendererInvokeContract<{ x: number }, { y: number }>
        Beta: IRendererInvokeContract<void, void>
      }>

      const _v: ValidContracts = null as unknown as ValidContracts
      expect(_v).toBeDefined()
    })
  })

  describe('RendererInvokeContext', () => {
    it('provides source window information', () => {
      const context: RendererInvokeContext = {
        sourceWindowId: 42,
        sourceRole: 'dashboard',
      }

      expect(context.sourceWindowId).toBe(42)
      expect(context.sourceRole).toBe('dashboard')
    })

    it('allows optional sourceRole', () => {
      const context: RendererInvokeContext = {
        sourceWindowId: 100,
      }

      expect(context.sourceWindowId).toBe(100)
      expect(context.sourceRole).toBeUndefined()
    })
  })

  describe('RendererInvokeRequestType', () => {
    it('extracts request type from renderer invoke contract', () => {
      type Contracts = GenericRendererInvokeContract<{
        GetUser: IRendererInvokeContract<{ userId: number }, { name: string }>
        Ping: IRendererInvokeContract<void, { pong: boolean }>
      }>

      type GetUserRequest = RendererInvokeRequestType<Contracts, 'GetUser'>
      type PingRequest = RendererInvokeRequestType<Contracts, 'Ping'>

      const getUserReq: GetUserRequest = { userId: 5 }
      const pingReq: PingRequest = undefined as void

      expect(getUserReq.userId).toBe(5)
      expect(pingReq).toBeUndefined()
    })
  })

  describe('RendererInvokeResponseType', () => {
    it('extracts response type from renderer invoke contract', () => {
      type Contracts = GenericRendererInvokeContract<{
        GetData: IRendererInvokeContract<{ id: string }, { value: number; timestamp: number }>
        DoAction: IRendererInvokeContract<{ action: string }, void>
      }>

      type GetDataResponse = RendererInvokeResponseType<Contracts, 'GetData'>
      type DoActionResponse = RendererInvokeResponseType<Contracts, 'DoAction'>

      const getDataRes: GetDataResponse = { value: 42, timestamp: Date.now() }
      const doActionRes: DoActionResponse = undefined as void

      expect(getDataRes.value).toBe(42)
      expect(doActionRes).toBeUndefined()
    })
  })

  describe('RendererInvokeHandler', () => {
    it('defines async handler function with proper types', async () => {
      type Contracts = GenericRendererInvokeContract<{
        Calculate: IRendererInvokeContract<{ a: number; b: number }, { sum: number }>
      }>

      const handler: RendererInvokeHandler<Contracts, 'Calculate'> = async (request, context) => {
        expect(request.a).toBeTypeOf('number')
        expect(request.b).toBeTypeOf('number')
        expect(context.sourceWindowId).toBeTypeOf('number')
        return { sum: request.a + request.b }
      }

      const result = await handler({ a: 5, b: 3 }, { sourceWindowId: 1 })
      expect(result.sum).toBe(8)
    })

    it('handles void request types', async () => {
      type Contracts = GenericRendererInvokeContract<{
        GetTimestamp: IRendererInvokeContract<void, { timestamp: number }>
      }>

      const handler: RendererInvokeHandler<Contracts, 'GetTimestamp'> = async (
        request,
        context
      ) => {
        expect(request).toBeUndefined()
        expect(context.sourceWindowId).toBeTypeOf('number')
        return { timestamp: Date.now() }
      }

      const result = await handler(undefined as void, { sourceWindowId: 2 })
      expect(result.timestamp).toBeTypeOf('number')
    })

    it('handles void response types', async () => {
      type Contracts = GenericRendererInvokeContract<{
        LogMessage: IRendererInvokeContract<{ message: string }, void>
      }>

      const handler: RendererInvokeHandler<Contracts, 'LogMessage'> = async (request, context) => {
        expect(request.message).toBeTypeOf('string')
        expect(context.sourceWindowId).toBeTypeOf('number')
        return undefined as void
      }

      const result = await handler({ message: 'test' }, { sourceWindowId: 3 })
      expect(result).toBeUndefined()
    })
  })

  describe('RendererInvokeHandlerType', () => {
    it('maps all contract keys to handler functions', () => {
      type Contracts = GenericRendererInvokeContract<{
        GetName: IRendererInvokeContract<{ id: number }, { name: string }>
        SetValue: IRendererInvokeContract<{ key: string; value: number }, void>
      }>

      const handlers: RendererInvokeHandlerType<Contracts> = {
        GetName: async (request, context) => {
          expect(request.id).toBeTypeOf('number')
          expect(context.sourceWindowId).toBeTypeOf('number')
          return { name: `User ${request.id}` }
        },
        SetValue: async (request, context) => {
          expect(request.key).toBeTypeOf('string')
          expect(request.value).toBeTypeOf('number')
          expect(context.sourceWindowId).toBeTypeOf('number')
          return undefined as void
        },
      }

      expect(handlers.GetName).toBeTypeOf('function')
      expect(handlers.SetValue).toBeTypeOf('function')
    })
  })

  describe('defineRendererInvokeHandlers', () => {
    it('returns handlers with full type checking', () => {
      type Contracts = GenericRendererInvokeContract<{
        Echo: IRendererInvokeContract<{ text: string }, { echo: string }>
        Add: IRendererInvokeContract<{ x: number; y: number }, { result: number }>
      }>

      const handlers = defineRendererInvokeHandlers<Contracts>({
        Echo: async (request, context) => {
          expect(context.sourceWindowId).toBeTypeOf('number')
          return { echo: request.text }
        },
        Add: async (request, context) => {
          expect(context.sourceWindowId).toBeTypeOf('number')
          return { result: request.x + request.y }
        },
      })

      expect(handlers.Echo).toBeTypeOf('function')
      expect(handlers.Add).toBeTypeOf('function')
    })

    it('preserves handler implementations', async () => {
      type Contracts = GenericRendererInvokeContract<{
        Multiply: IRendererInvokeContract<{ a: number; b: number }, { product: number }>
      }>

      const handlers = defineRendererInvokeHandlers<Contracts>({
        Multiply: async (request) => ({ product: request.a * request.b }),
      })

      const result = await handlers.Multiply({ a: 6, b: 7 }, { sourceWindowId: 1 })
      expect(result.product).toBe(42)
    })
  })

  describe('AbstractRegisterRendererInvoke', () => {
    // Clear instances before each test
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(AbstractRegisterRendererInvoke as any).instances = {}
    })

    it('registers handler class instance', () => {
      type TestContracts = GenericRendererInvokeContract<{
        Test: IRendererInvokeContract<{ value: string }, { result: string }>
      }>

      class TestHandler extends AbstractRegisterRendererInvoke {
        handlers: RendererInvokeHandlerType<TestContracts> = {
          Test: async (request) => ({ result: request.value.toUpperCase() }),
        }
      }

      TestHandler.register()

      // Access private instances to verify registration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (AbstractRegisterRendererInvoke as any).instances
      expect(instances['TestHandler']).toBeInstanceOf(TestHandler)
    })

    it('prevents duplicate registrations of same class', () => {
      type TestContracts = GenericRendererInvokeContract<{
        Alpha: IRendererInvokeContract<void, { id: number }>
      }>

      class AlphaHandler extends AbstractRegisterRendererInvoke {
        handlers: RendererInvokeHandlerType<TestContracts> = {
          Alpha: async () => ({ id: Math.random() }),
        }
      }

      AlphaHandler.register()
      AlphaHandler.register()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (AbstractRegisterRendererInvoke as any).instances
      const instance = instances['AlphaHandler']

      // Should only have one instance
      const instanceCount = Object.keys(instances).filter((k) => k === 'AlphaHandler').length
      expect(instanceCount).toBe(1)
      expect(instance).toBeInstanceOf(AlphaHandler)
    })

    it('supports multiple different handler classes', () => {
      type ContractsA = GenericRendererInvokeContract<{
        ActionA: IRendererInvokeContract<void, { a: number }>
      }>

      type ContractsB = GenericRendererInvokeContract<{
        ActionB: IRendererInvokeContract<void, { b: string }>
      }>

      class HandlerA extends AbstractRegisterRendererInvoke {
        handlers: RendererInvokeHandlerType<ContractsA> = {
          ActionA: async () => ({ a: 1 }),
        }
      }

      class HandlerB extends AbstractRegisterRendererInvoke {
        handlers: RendererInvokeHandlerType<ContractsB> = {
          ActionB: async () => ({ b: 'test' }),
        }
      }

      HandlerA.register()
      HandlerB.register()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (AbstractRegisterRendererInvoke as any).instances
      expect(instances['HandlerA']).toBeInstanceOf(HandlerA)
      expect(instances['HandlerB']).toBeInstanceOf(HandlerB)
      expect(Object.keys(instances).length).toBe(2)
    })

    it('stores handlers for retrieval', () => {
      type MyContracts = GenericRendererInvokeContract<{
        GetConfig: IRendererInvokeContract<{ key: string }, { value: string }>
      }>

      class ConfigHandler extends AbstractRegisterRendererInvoke {
        handlers: RendererInvokeHandlerType<MyContracts> = {
          GetConfig: async (request) => ({ value: `config-${request.key}` }),
        }
      }

      ConfigHandler.register()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (AbstractRegisterRendererInvoke as any).instances
      const instance = instances['ConfigHandler'] as ConfigHandler

      expect(instance.handlers.GetConfig).toBeTypeOf('function')
    })

    it('allows accessing handler implementation', async () => {
      type Contracts = GenericRendererInvokeContract<{
        Transform: IRendererInvokeContract<{ input: string }, { output: string }>
      }>

      class TransformHandler extends AbstractRegisterRendererInvoke {
        handlers: RendererInvokeHandlerType<Contracts> = {
          Transform: async (request) => ({ output: request.input.split('').reverse().join('') }),
        }
      }

      TransformHandler.register()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (AbstractRegisterRendererInvoke as any).instances
      const instance = instances['TransformHandler'] as TransformHandler

      const result = await instance.handlers.Transform({ input: 'hello' }, { sourceWindowId: 1 })
      expect(result.output).toBe('olleh')
    })
  })
})

import { ipcRenderer } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setTraceSink } from './trace'
import { traceBroadcast, traceEvent, traceInvoke } from './trace-renderer'

vi.mock('electron', () => ({
  ipcRenderer: {
    send: vi.fn(),
  },
}))

describe('trace-renderer', () => {
  beforeEach(() => {
    vi.mocked(ipcRenderer.send).mockClear()
    setTraceSink(() => {})
  })

  describe('traceInvoke', () => {
    it('sends start and success traces when enabled', async () => {
      const invoke = vi.fn(async (_channel: string, request: { ok: boolean }) => ({
        received: request.ok,
      }))

      const response = await traceInvoke('Ping', { ok: true }, invoke)

      expect(response).toEqual({ received: true })
      expect(invoke).toHaveBeenCalledWith('Ping', { ok: true })
      expect(ipcRenderer.send).toHaveBeenCalledTimes(2)

      const [startCall, endCall] = vi.mocked(ipcRenderer.send).mock.calls
      expect(startCall[0]).toBe('INSPECTOR:TRACE')
      expect(startCall[1].kind).toBe('invoke')
      expect(startCall[1].status).toBe('ok')
      expect(startCall[1].tsEnd).toBeUndefined()
      expect(startCall[1].trace?.traceId).toBeDefined()
      expect(startCall[1].trace?.spanId).toBeDefined()
      expect(startCall[1].trace?.tsStart).toBeDefined()

      expect(endCall[0]).toBe('INSPECTOR:TRACE')
      expect(endCall[1].status).toBe('ok')
      expect(endCall[1].tsEnd).toBeDefined()
      expect(endCall[1].response).toBeDefined()
      expect(endCall[1].trace?.tsEnd).toBeDefined()
      expect(endCall[1].trace?.traceId).toBe(startCall[1].trace?.traceId)
    })

    it('sends error trace when invoke throws', async () => {
      const invoke = vi.fn(async () => {
        throw new Error('boom')
      })

      await expect(traceInvoke('Ping', { ok: false }, invoke)).rejects.toThrow('boom')
      expect(ipcRenderer.send).toHaveBeenCalledTimes(2)

      const [, endCall] = vi.mocked(ipcRenderer.send).mock.calls
      expect(endCall[1].status).toBe('error')
      expect(endCall[1].error.message).toBe('boom')
    })

    it('does not send traces when disabled', async () => {
      setTraceSink(null)
      const invoke = vi.fn(async () => ({ ok: true }))

      await traceInvoke('Ping', { ok: true }, invoke)

      expect(ipcRenderer.send).not.toHaveBeenCalled()
    })
  })

  describe('traceEvent', () => {
    it('sends event trace when enabled', () => {
      traceEvent('Event', { value: 1 })

      expect(ipcRenderer.send).toHaveBeenCalledTimes(1)
      const [channel, payload] = vi.mocked(ipcRenderer.send).mock.calls[0]
      expect(channel).toBe('INSPECTOR:TRACE')
      expect(payload.kind).toBe('event')
    })

    it('skips event trace for inspector channels', () => {
      traceEvent('INSPECTOR:HELLO', { value: 1 })
      expect(ipcRenderer.send).not.toHaveBeenCalled()
    })
  })

  describe('traceBroadcast', () => {
    it('sends broadcast trace when enabled', () => {
      traceBroadcast('Broadcast', { value: 2 })

      expect(ipcRenderer.send).toHaveBeenCalledTimes(1)
      const [channel, payload] = vi.mocked(ipcRenderer.send).mock.calls[0]
      expect(channel).toBe('INSPECTOR:TRACE')
      expect(payload.kind).toBe('broadcast')
    })

    it('does not send when disabled', () => {
      setTraceSink(null)
      traceBroadcast('Broadcast', { value: 2 })
      expect(ipcRenderer.send).not.toHaveBeenCalled()
    })
  })
})

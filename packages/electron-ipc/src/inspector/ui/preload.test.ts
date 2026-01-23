import '../../test-helpers/electron-mock'
import { contextBridge, ipcRenderer } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('inspector ui preload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes inspector API and wires IPC calls', async () => {
    vi.resetModules()
    vi.mocked(ipcRenderer.invoke).mockResolvedValue({ isTracing: true, traceEnabled: true })

    await import('./preload')

    const exposeCalls = vi.mocked(contextBridge.exposeInMainWorld).mock.calls
    expect(exposeCalls.length).toBe(1)

    const [name, api] = exposeCalls[0]
    expect(name).toBe('inspectorAPI')

    api.hello()
    expect(ipcRenderer.send).toHaveBeenCalledWith(
      'INSPECTOR:HELLO',
      expect.objectContaining({ version: '1.0', timestamp: expect.any(Number) })
    )

    api.sendCommand({ type: 'clear' })
    expect(ipcRenderer.send).toHaveBeenCalledWith('INSPECTOR:COMMAND', {
      command: { type: 'clear' },
    })

    await expect(api.getStatus()).resolves.toEqual({ isTracing: true, traceEnabled: true })

    const initCallback = vi.fn()
    api.onInit(initCallback)
    const initHandler = vi
      .mocked(ipcRenderer.on)
      .mock.calls.find(([channel]) => channel === 'INSPECTOR:INIT')?.[1]
    initHandler?.(undefined, { events: [] })
    expect(initCallback).toHaveBeenCalledWith({ events: [] })
  })

  it('returns null when getStatus fails', async () => {
    vi.resetModules()
    vi.mocked(ipcRenderer.invoke).mockRejectedValue(new Error('boom'))

    await import('./preload')

    const [, api] = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0]
    await expect(api.getStatus()).resolves.toBeNull()
  })
})

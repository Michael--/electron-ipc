/* eslint-disable @typescript-eslint/no-explicit-any */
/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TraceEvent } from '../types'

const callbacks: Record<string, (payload: any) => void> = {}

const inspectorAPI = {
  hello: vi.fn(),
  sendCommand: vi.fn(),
  getStatus: vi.fn(() => Promise.resolve({ bufferCapacity: 5000 })),
  onInit: vi.fn((cb: (payload: any) => void) => {
    callbacks.onInit = cb
  }),
  onEvent: vi.fn((cb: (payload: any) => void) => {
    callbacks.onEvent = cb
  }),
  onEventBatch: vi.fn((cb: (payload: any) => void) => {
    callbacks.onEventBatch = cb
  }),
  onStatus: vi.fn((cb: (payload: any) => void) => {
    callbacks.onStatus = cb
  }),
  onCommandResponse: vi.fn((cb: (payload: any) => void) => {
    callbacks.onCommandResponse = cb
  }),
}

function setupDom() {
  document.body.innerHTML = `
    <main>
      <div id="statusBadge"></div>
      <div id="statusText"></div>
      <button id="pauseBtn"></button>
      <button id="clearBtn"></button>
      <button id="exportBtn"></button>
      <select id="payloadModeSelect"></select>
      <input id="searchInput" />
      <select id="kindFilter"></select>
      <select id="statusFilter"></select>
      <button id="autoScrollBtn"></button>
      <div id="eventCount"></div>
      <div id="droppedCount"></div>
      <div id="gapCount"></div>
      <div id="eventsPerSec"></div>
      <div id="emptyState"></div>
      <table id="eventsTable"><tbody id="eventsBody"></tbody></table>
      <div id="detailPanel"><div id="detailContent"></div></div>
      <button id="closeDetailBtn"></button>
      <button id="pinDetailBtn"></button>
      <input id="serverBufferInput" />
      <button id="applyServerBufferBtn"></button>
      <input id="uiBufferInput" />
      <button id="applyUiBufferBtn"></button>
      <button id="showStatsBtn"></button>
      <div id="statsPanel"><div id="statsContent"></div></div>
      <button id="closeStatsBtn"></button>
    </main>
  `
}

describe('inspector ui renderer', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    setupDom()
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    ;(window as any).inspectorAPI = inspectorAPI
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    for (const key of Object.keys(callbacks)) {
      delete callbacks[key]
    }
  })

  it('initializes and handles init payloads', async () => {
    await import('./renderer')

    expect(inspectorAPI.hello).toHaveBeenCalled()
    expect(inspectorAPI.onInit).toHaveBeenCalled()
    expect(inspectorAPI.onEvent).toHaveBeenCalled()
    expect(inspectorAPI.onEventBatch).toHaveBeenCalled()
    expect(inspectorAPI.onStatus).toHaveBeenCalled()
    expect(inspectorAPI.onCommandResponse).toHaveBeenCalled()

    const event: TraceEvent = {
      id: 'evt-1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: Date.now(),
      source: { webContentsId: 1 },
    }

    callbacks.onInit?.({ events: [event] })

    expect(document.getElementById('eventCount')?.textContent).toBe('1 event')
  })
})

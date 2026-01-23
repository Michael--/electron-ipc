/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TraceEvent } from '../types'
import { elements } from './renderer.dom'
import { state } from './renderer.state'
import * as statsModule from './renderer.stats'
import * as controls from './renderer.controls'

const { pollServerStatus, updateStatistics, updateStats, updateStatsPanel, updateStatus } =
  statsModule

describe('inspector ui renderer stats', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    elements.eventCount = document.createElement('div')
    elements.droppedCount = document.createElement('div')
    elements.pauseBtn = document.createElement('button')
    elements.statusBadge = document.createElement('div')
    elements.statusText = document.createElement('div')
    elements.payloadModeSelect = document.createElement('select')
    elements.eventsPerSec = document.createElement('div')
    elements.statsPanel = document.createElement('div')
    elements.statsContent = document.createElement('div')
    elements.serverBufferInput = document.createElement('input')
    elements.traceToggleBtn = document.createElement('button')

    elements.statsPanel.style.display = 'none'

    // Add option elements for payloadModeSelect
    const modes = ['none', 'redacted', 'full']
    modes.forEach((mode) => {
      const option = document.createElement('option')
      option.value = mode
      elements.payloadModeSelect.appendChild(option)
    })

    state.allEvents = []
    state.detectedGaps = 0
    state.traceEnabled = true
    state.isPaused = false
    state.statsStartTime = Date.now()
    state.statsEventCount = 0
    state.serverBufferSize = 5000
    state.searchQuery = ''
    state.kindFilter = ''
    state.statusFilter = ''
  })

  it('updates event and gap counts', () => {
    updateStats(1)
    expect(elements.eventCount.textContent).toBe('1 event')
    expect(elements.droppedCount.textContent).toBe('')

    state.detectedGaps = 2
    updateStats(3)
    expect(elements.eventCount.textContent).toBe('3 events')
    expect(elements.droppedCount.textContent).toBe('(2 gaps)')
  })

  it('updates status UI and trace toggle', () => {
    const toggleSpy = vi.spyOn(controls, 'updateTraceToggleButton')

    updateStatus(false, 0, 0, 'full', false)
    expect(state.traceEnabled).toBe(false)
    expect(elements.pauseBtn.disabled).toBe(true)
    expect(elements.statusText.textContent).toBe('Trace Off')
    expect(toggleSpy).toHaveBeenCalled()

    updateStatus(true, 0, 0, 'redacted', true)
    expect(state.traceEnabled).toBe(true)
    expect(elements.pauseBtn.disabled).toBe(false)
    expect(elements.statusText.textContent).toBe('Active')
    expect(elements.pauseBtn.textContent).toBe('Pause')
    expect(state.isPaused).toBe(false)
    expect(elements.payloadModeSelect.value).toBe('redacted')

    updateStatus(false, 0, 0, undefined, true)
    expect(elements.statusText.textContent).toBe('Paused')
    expect(elements.pauseBtn.textContent).toBe('Resume')
    expect(state.isPaused).toBe(true)
  })

  it('updates throughput statistics and panel refresh', () => {
    state.statsStartTime = Date.now() - 1000
    state.statsEventCount = 600

    updateStatistics()
    expect(elements.eventsPerSec.textContent).toBe('600/s')
    expect(elements.eventsPerSec.classList.contains('danger')).toBe(true)

    // Check that updateStatsPanel is called by verifying the panel content changes
    elements.statsPanel.style.display = 'flex'
    elements.statsContent.innerHTML = '<p>old content</p>'
    updateStatistics()
    // Panel should be updated with "No data" message since state.allEvents is empty
    expect(elements.statsContent.innerHTML).toContain('No data for current filters')
  })

  it('renders stats panel content for empty and populated metrics', () => {
    updateStatsPanel()
    expect(elements.statsContent.innerHTML).toContain('No data for current filters')

    const event: TraceEvent = {
      id: 'evt-1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      tsEnd: 20,
      durationMs: 20,
      source: { webContentsId: 1 },
      request: { mode: 'none', bytes: 5 },
      response: { mode: 'none', bytes: 5 },
    }

    state.allEvents = [event]
    updateStatsPanel()
    expect(elements.statsContent.innerHTML).toContain('Ping')
    expect(elements.statsContent.innerHTML).toContain('metrics-table')
  })

  it('polls server status and syncs buffer size', async () => {
    ;(window as unknown as { inspectorAPI: unknown }).inspectorAPI = {
      getStatus: vi.fn().mockResolvedValue({
        isTracing: true,
        eventCount: 10,
        droppedCount: 0,
        payloadMode: 'full',
        traceEnabled: true,
        bufferCapacity: 42,
      }),
    }

    await pollServerStatus()

    // Check that updateStatus was called by verifying its effects
    expect(state.traceEnabled).toBe(true)
    expect(elements.pauseBtn.textContent).toBe('Pause')
    expect(elements.statusText.textContent).toBe('Active')
    expect(state.serverBufferSize).toBe(42)
    expect(elements.serverBufferInput.value).toBe('42')
  })
})

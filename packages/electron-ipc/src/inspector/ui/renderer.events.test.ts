/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { elements } from './renderer.dom'
import { state } from './renderer.state'

const updateAutoScrollButton = vi.fn()
const updatePinButton = vi.fn()
const updateTraceToggleButton = vi.fn()
const renderNow = vi.fn()
const scheduleRender = vi.fn()
const updateStatistics = vi.fn()
const updateStats = vi.fn()
const updateStatsPanel = vi.fn()
const closeDetailPanel = vi.fn()

vi.mock('./renderer.controls', () => ({
  updateAutoScrollButton: (...args: unknown[]) => updateAutoScrollButton(...args),
  updatePinButton: (...args: unknown[]) => updatePinButton(...args),
  updateTraceToggleButton: (...args: unknown[]) => updateTraceToggleButton(...args),
}))

vi.mock('./renderer.render', () => ({
  renderNow: (...args: unknown[]) => renderNow(...args),
  scheduleRender: (...args: unknown[]) => scheduleRender(...args),
}))

vi.mock('./renderer.stats', () => ({
  updateStatistics: (...args: unknown[]) => updateStatistics(...args),
  updateStats: (...args: unknown[]) => updateStats(...args),
  updateStatsPanel: (...args: unknown[]) => updateStatsPanel(...args),
}))

vi.mock('./renderer.detail', () => ({
  closeDetailPanel: (...args: unknown[]) => closeDetailPanel(...args),
}))

const { setupEventListeners } = await import('./renderer.events')

describe('inspector ui renderer events', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    elements.traceToggleBtn = document.createElement('button')
    elements.pauseBtn = document.createElement('button')
    elements.clearBtn = document.createElement('button')
    elements.exportBtn = document.createElement('button')
    elements.payloadModeSelect = document.createElement('select')
    elements.searchInput = document.createElement('input')
    elements.kindFilter = document.createElement('select')
    elements.statusFilter = document.createElement('select')
    elements.traceRowFilter = document.createElement('select')
    elements.closeDetailBtn = document.createElement('button')
    elements.applyServerBufferBtn = document.createElement('button')
    elements.applyUiBufferBtn = document.createElement('button')
    elements.showStatsBtn = document.createElement('button')
    elements.closeStatsBtn = document.createElement('button')
    elements.pinDetailBtn = document.createElement('button')
    elements.autoScrollBtn = document.createElement('button')
    elements.statusBadge = document.createElement('div')
    elements.statusText = document.createElement('div')
    elements.gapCount = document.createElement('div')
    elements.serverBufferInput = document.createElement('input')
    elements.uiBufferInput = document.createElement('input')
    elements.statsPanel = document.createElement('div')
    elements.detailPanel = document.createElement('div')

    elements.statsPanel.style.display = 'none'
    elements.gapCount.style.display = 'none'

    document.body.appendChild(elements.detailPanel)

    const addOptions = (select: HTMLSelectElement, values: string[]) => {
      values.forEach((value) => {
        const option = document.createElement('option')
        option.value = value
        option.textContent = value
        select.appendChild(option)
      })
    }

    addOptions(elements.payloadModeSelect, ['none', 'redacted', 'full'])
    addOptions(elements.kindFilter, ['event', 'invoke'])
    addOptions(elements.statusFilter, ['ok', 'error'])
    addOptions(elements.traceRowFilter, ['all', 'errors'])

    state.traceEnabled = true
    state.isPaused = false
    state.searchQuery = ''
    state.kindFilter = ''
    state.statusFilter = ''
    state.traceRowFilter = 'errors'
    state.serverBufferSize = 5000
    state.uiMaxEvents = 10000
    state.allEvents = []
    state.statsEventCount = 0
    state.statsStartTime = Date.now()
    state.lastSeqNumber = 0
    state.detectedGaps = 0
    state.isDetailPinned = false
    state.autoScrollEnabled = true
    ;(window as unknown as { inspectorAPI: unknown }).inspectorAPI = {
      sendCommand: vi.fn(),
    }

    updateAutoScrollButton.mockReset()
    updatePinButton.mockReset()
    updateTraceToggleButton.mockReset()
    renderNow.mockReset()
    scheduleRender.mockReset()
    updateStatistics.mockReset()
    updateStats.mockReset()
    updateStatsPanel.mockReset()
    closeDetailPanel.mockReset()
  })

  it('toggles trace and pause commands', () => {
    setupEventListeners()

    elements.traceToggleBtn.click()
    expect(state.traceEnabled).toBe(false)
    expect(updateTraceToggleButton).toHaveBeenCalled()
    expect(window.inspectorAPI.sendCommand).toHaveBeenCalledWith({
      type: 'setTracingEnabled',
      enabled: false,
    })

    elements.pauseBtn.click()
    expect(state.isPaused).toBe(true)
    expect(elements.pauseBtn.textContent).toBe('Resume')
    expect(elements.statusBadge.classList.contains('paused')).toBe(true)

    elements.pauseBtn.click()
    expect(state.isPaused).toBe(false)
    expect(elements.pauseBtn.textContent).toBe('Pause')
    expect(elements.statusBadge.classList.contains('active')).toBe(true)
  })

  it('clears state and updates stats', () => {
    setupEventListeners()

    state.allEvents = [{ id: '1' } as never]
    state.statsEventCount = 5
    state.detectedGaps = 2
    elements.gapCount.style.display = 'inline-block'

    elements.clearBtn.click()

    expect(window.inspectorAPI.sendCommand).toHaveBeenCalledWith({ type: 'clear' })
    expect(state.allEvents.length).toBe(0)
    expect(state.statsEventCount).toBe(0)
    expect(state.detectedGaps).toBe(0)
    expect(elements.gapCount.style.display).toBe('none')
    expect(renderNow).toHaveBeenCalled()
    expect(updateStats).toHaveBeenCalledWith(0)
  })

  it('updates filters and schedules renders', () => {
    setupEventListeners()

    elements.searchInput.value = 'Ping'
    elements.searchInput.dispatchEvent(new Event('input'))
    expect(state.searchQuery).toBe('ping')
    expect(scheduleRender).toHaveBeenCalled()

    elements.kindFilter.value = 'event'
    elements.kindFilter.dispatchEvent(new Event('change'))
    expect(state.kindFilter).toBe('event')

    elements.statusFilter.value = 'error'
    elements.statusFilter.dispatchEvent(new Event('change'))
    expect(state.statusFilter).toBe('error')

    elements.traceRowFilter.value = 'all'
    elements.traceRowFilter.dispatchEvent(new Event('change'))
    expect(state.traceRowFilter).toBe('all')

    elements.payloadModeSelect.value = 'full'
    elements.payloadModeSelect.dispatchEvent(new Event('change'))
    expect(window.inspectorAPI.sendCommand).toHaveBeenCalledWith({
      type: 'setPayloadMode',
      mode: 'full',
    })

    elements.exportBtn.click()
    expect(window.inspectorAPI.sendCommand).toHaveBeenCalledWith({ type: 'export', format: 'json' })

    elements.closeDetailBtn.click()
    expect(closeDetailPanel).toHaveBeenCalled()
  })

  it('applies server and UI buffer changes', () => {
    setupEventListeners()

    elements.serverBufferInput.value = '200'
    elements.applyServerBufferBtn.click()
    expect(window.inspectorAPI.sendCommand).toHaveBeenCalledWith({
      type: 'setBufferSize',
      size: 200,
    })
    expect(state.serverBufferSize).toBe(200)

    state.allEvents = new Array(150).fill({ id: 'evt' } as never)
    elements.uiBufferInput.value = '100'
    elements.applyUiBufferBtn.click()
    expect(state.uiMaxEvents).toBe(100)
    expect(state.allEvents.length).toBe(100)
    expect(renderNow).toHaveBeenCalled()
    expect(updateStats).toHaveBeenCalledWith(100)
    expect(updateStatistics).toHaveBeenCalled()
  })

  it('toggles stats panel and detail pinning', () => {
    setupEventListeners()

    elements.showStatsBtn.click()
    expect(elements.statsPanel.style.display).toBe('flex')
    expect(updateStatsPanel).toHaveBeenCalled()

    elements.closeStatsBtn.click()
    expect(elements.statsPanel.style.display).toBe('none')

    elements.pinDetailBtn.click()
    expect(state.isDetailPinned).toBe(true)
    expect(updatePinButton).toHaveBeenCalled()

    elements.autoScrollBtn.click()
    expect(state.autoScrollEnabled).toBe(false)
    expect(updateAutoScrollButton).toHaveBeenCalled()
  })

  it('closes the detail panel on escape', () => {
    setupEventListeners()
    elements.detailPanel.classList.add('visible')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeDetailPanel).toHaveBeenCalled()
  })
})

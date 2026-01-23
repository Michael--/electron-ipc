/* eslint-disable no-console */

import { elements } from './renderer.dom'
import {
  updateAutoScrollButton,
  updatePinButton,
  updateTraceToggleButton,
} from './renderer.controls'
import { closeDetailPanel } from './renderer.detail'
import { renderNow, scheduleRender } from './renderer.render'
import { updateStatistics, updateStats, updateStatsPanel } from './renderer.stats'
import { normalizeBufferSize } from './renderer.utils'
import { state, trimToUiLimit } from './renderer.state'

export function applyFilters() {
  state.renderRowsDirty = true
  scheduleRender()
}

export function setupEventListeners() {
  elements.traceToggleBtn.addEventListener('click', () => {
    const nextEnabled = !state.traceEnabled
    state.traceEnabled = nextEnabled
    updateTraceToggleButton()
    window.inspectorAPI.sendCommand({ type: 'setTracingEnabled', enabled: nextEnabled })
  })

  elements.pauseBtn.addEventListener('click', () => {
    state.isPaused = !state.isPaused
    if (state.isPaused) {
      window.inspectorAPI.sendCommand({ type: 'pause' })
      elements.pauseBtn.textContent = 'Resume'
      elements.statusBadge.classList.remove('active')
      elements.statusBadge.classList.add('paused')
      elements.statusText.textContent = 'Paused'
    } else {
      window.inspectorAPI.sendCommand({ type: 'resume' })
      elements.pauseBtn.textContent = 'Pause'
      elements.statusBadge.classList.remove('paused')
      elements.statusBadge.classList.add('active')
      elements.statusText.textContent = 'Active'
    }
  })

  elements.clearBtn.addEventListener('click', () => {
    window.inspectorAPI.sendCommand({ type: 'clear' })
    state.allEvents = []
    state.statsEventCount = 0
    state.statsStartTime = Date.now()
    state.lastSeqNumber = 0
    state.detectedGaps = 0
    elements.gapCount.style.display = 'none'
    elements.gapCount.textContent = ''
    applyFilters()
    renderNow()
    updateStats(0)
  })

  elements.exportBtn.addEventListener('click', () => {
    window.inspectorAPI.sendCommand({ type: 'export', format: 'json' })
  })

  elements.payloadModeSelect.addEventListener('change', (e) => {
    const mode = (e.target as HTMLSelectElement).value as 'none' | 'redacted' | 'full'
    window.inspectorAPI.sendCommand({ type: 'setPayloadMode', mode })
  })

  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
    applyFilters()
  })

  elements.kindFilter.addEventListener('change', (e) => {
    state.kindFilter = (e.target as HTMLSelectElement).value
    applyFilters()
  })

  elements.statusFilter.addEventListener('change', (e) => {
    state.statusFilter = (e.target as HTMLSelectElement).value
    applyFilters()
  })

  elements.traceRowFilter.addEventListener('change', (e) => {
    state.traceRowFilter = (e.target as HTMLSelectElement).value as typeof state.traceRowFilter
    state.renderRowsDirty = true
    scheduleRender()
  })

  elements.closeDetailBtn.addEventListener('click', () => {
    closeDetailPanel()
  })

  elements.applyServerBufferBtn.addEventListener('click', () => {
    const newSize = normalizeBufferSize(elements.serverBufferInput, state.serverBufferSize)
    if (newSize !== null && newSize !== state.serverBufferSize) {
      window.inspectorAPI.sendCommand({ type: 'setBufferSize', size: newSize })
      state.serverBufferSize = newSize
      console.log(`[Inspector] Server buffer size set to ${newSize}`)
    }
  })

  elements.applyUiBufferBtn.addEventListener('click', () => {
    const newSize = normalizeBufferSize(elements.uiBufferInput, state.uiMaxEvents)
    if (newSize !== null && newSize !== state.uiMaxEvents) {
      state.uiMaxEvents = newSize
      const shouldRender = trimToUiLimit()
      if (shouldRender) {
        renderNow()
      }
      updateStats(state.allEvents.length)
      updateStatistics()
      console.log(`[Inspector UI] Max events set to ${newSize}`)
    }
  })

  elements.showStatsBtn.addEventListener('click', () => {
    const isVisible = elements.statsPanel.style.display !== 'none'
    elements.statsPanel.style.display = isVisible ? 'none' : 'flex'
    if (!isVisible) {
      updateStatsPanel()
    }
  })

  elements.closeStatsBtn.addEventListener('click', () => {
    elements.statsPanel.style.display = 'none'
  })

  elements.pinDetailBtn.addEventListener('click', () => {
    state.isDetailPinned = !state.isDetailPinned
    updatePinButton()
  })

  elements.autoScrollBtn.addEventListener('click', () => {
    state.autoScrollEnabled = !state.autoScrollEnabled
    updateAutoScrollButton()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.detailPanel.classList.contains('visible')) {
      closeDetailPanel()
    }
  })
}

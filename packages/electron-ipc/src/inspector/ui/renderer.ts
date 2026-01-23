/// <reference lib="dom" />

/**
 * Inspector UI Renderer
 *
 * Entry point for the inspector UI
 */

import type { InspectorAPI } from './preload'
import type { TraceRowFilter } from './trace-grouping'
import { elements, getBodyNode, initElements } from './renderer.dom'
import { applyFilters, setupEventListeners } from './renderer.events'
import { handleScroll, scheduleRender } from './renderer.render'
import { appendEvent, appendEventBatch, state } from './renderer.state'
import {
  updateAutoScrollButton,
  updatePinButton,
  updateTraceToggleButton,
} from './renderer.controls'
import { pollServerStatus, updateStatistics, updateStats, updateStatus } from './renderer.stats'
import { downloadJSON } from './renderer.utils'

declare global {
  interface Window {
    inspectorAPI: InspectorAPI
  }
}

function init() {
  const bodyNode = getBodyNode()
  if (!bodyNode) {
    console.error('[Inspector UI] BODY node not found!')
    return
  }

  initElements(bodyNode)

  elements.serverBufferInput.value = String(state.serverBufferSize)
  elements.uiBufferInput.value = String(state.uiMaxEvents)
  state.traceRowFilter = elements.traceRowFilter.value as TraceRowFilter

  state.virtualScrollContainer = elements.main
  if (state.virtualScrollContainer) {
    state.virtualScrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  }

  setInterval(updateStatistics, 1000)

  setInterval(pollServerStatus, 2000)
  pollServerStatus()

  if (!window.inspectorAPI) {
    console.error('[Inspector UI] window.inspectorAPI is not available!')
    return
  }

  window.inspectorAPI.hello()

  setupEventListeners()
  updatePinButton()
  updateAutoScrollButton()
  updateTraceToggleButton()

  window.inspectorAPI.onInit((payload) => {
    state.allEvents = payload.events || []
    if (state.allEvents.length > state.uiMaxEvents) {
      state.allEvents = state.allEvents.slice(-state.uiMaxEvents)
    }
    applyFilters()
    updateStats(state.allEvents.length)
  })

  window.inspectorAPI.onEvent((payload) => {
    if (!state.isPaused) {
      const shouldRender = appendEvent(payload.event)
      state.statsEventCount++
      if (shouldRender) {
        scheduleRender()
      }
      updateStats(state.allEvents.length)
    }
  })

  window.inspectorAPI.onEventBatch?.((payload) => {
    if (!state.isPaused && payload.events && payload.events.length > 0) {
      const shouldRender = appendEventBatch(payload.events)
      state.statsEventCount += payload.events.length
      if (shouldRender) {
        scheduleRender()
      }
      updateStats(state.allEvents.length)
    }
  })

  window.inspectorAPI.onStatus((payload) => {
    updateStatus(
      payload.isTracing,
      payload.eventCount,
      payload.droppedCount,
      payload.payloadMode,
      payload.traceEnabled
    )
  })

  window.inspectorAPI.onCommandResponse((payload) => {
    if (!payload.success) {
      console.error('Command failed:', payload.error)
      alert(`Command failed: ${payload.error}`)
    } else if (payload.data && typeof payload.data === 'object' && 'data' in payload.data) {
      downloadJSON(payload.data.data as string)
    }
  })
}

if (document.readyState === 'complete') {
  init()
} else {
  window.addEventListener('load', init)
}

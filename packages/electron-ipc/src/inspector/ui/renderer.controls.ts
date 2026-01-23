import { elements } from './renderer.dom'
import { state } from './renderer.state'

export function updatePinButton() {
  elements.pinDetailBtn.textContent = state.isDetailPinned ? 'Pinned' : 'Pin'
  elements.pinDetailBtn.classList.toggle('toggle-active', state.isDetailPinned)
}

export function updateAutoScrollButton() {
  elements.autoScrollBtn.textContent = state.autoScrollEnabled
    ? 'Auto-scroll: On'
    : 'Auto-scroll: Off'
  elements.autoScrollBtn.classList.toggle('toggle-active', state.autoScrollEnabled)
}

export function updateTraceToggleButton() {
  elements.traceToggleBtn.textContent = state.traceEnabled ? 'Tracing: On' : 'Tracing: Off'
  elements.traceToggleBtn.classList.toggle('toggle-active', state.traceEnabled)
}

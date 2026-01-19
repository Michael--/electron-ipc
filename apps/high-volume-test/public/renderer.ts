/**
 * Renderer for High-Volume Test App
 */

// Type declaration for the exposed API
import type { ApiType } from '../dist/ipc-api'

declare global {
  interface Window {
    api: ApiType
  }
}

const elements = {
  mode: document.getElementById('mode') as HTMLSelectElement,
  eventsPerSecond: document.getElementById('eventsPerSecond') as HTMLInputElement,
  duration: document.getElementById('duration') as HTMLInputElement,
  payloadSize: document.getElementById('payloadSize') as HTMLInputElement,
  startBtn: document.getElementById('startBtn') as HTMLButtonElement,
  stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
  status: document.getElementById('status') as HTMLDivElement,
  generated: document.getElementById('generated') as HTMLDivElement,
  errored: document.getElementById('errored') as HTMLDivElement,
  avgLatency: document.getElementById('avgLatency') as HTMLDivElement,
}

let statsInterval: number | null = null

/**
 * Start test
 */
elements.startBtn.addEventListener('click', async () => {
  const mode = elements.mode.value as 'burst' | 'sustained' | 'mixed'
  const eventsPerSecond = parseInt(elements.eventsPerSecond.value)
  const duration = parseInt(elements.duration.value)
  const payloadSize = parseInt(elements.payloadSize.value)

  try {
    const response = await window.api.invokecontrolStart({
      mode,
      eventsPerSecond,
      duration,
      payloadSize,
    })

    if (response.started) {
      elements.startBtn.disabled = true
      elements.stopBtn.disabled = false
      elements.status.textContent = 'Running'
      elements.status.style.color = '#4ade80'

      // Start polling stats
      startStatsPolling()
    }
  } catch (error) {
    alert(`Failed to start test: ${(error as Error).message}`)
  }
})

/**
 * Stop test
 */
elements.stopBtn.addEventListener('click', async () => {
  try {
    await window.api.invokecontrolStop({})
    stopTest()
  } catch (error) {
    alert(`Failed to stop test: ${(error as Error).message}`)
  }
})

/**
 * Preset buttons
 */
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = (btn as HTMLButtonElement).dataset.preset

    switch (preset) {
      case 'light':
        elements.mode.value = 'sustained'
        elements.eventsPerSecond.value = '50'
        elements.duration.value = '10'
        elements.payloadSize.value = '0'
        break
      case 'medium':
        elements.mode.value = 'sustained'
        elements.eventsPerSecond.value = '200'
        elements.duration.value = '30'
        elements.payloadSize.value = '0'
        break
      case 'heavy':
        elements.mode.value = 'sustained'
        elements.eventsPerSecond.value = '500'
        elements.duration.value = '60'
        elements.payloadSize.value = '0'
        break
      case 'extreme':
        elements.mode.value = 'sustained'
        elements.eventsPerSecond.value = '1000'
        elements.duration.value = '10'
        elements.payloadSize.value = '0'
        break
      case 'burst':
        elements.mode.value = 'burst'
        elements.eventsPerSecond.value = '5000'
        elements.duration.value = '1'
        elements.payloadSize.value = '0'
        break
      case 'stress':
        elements.mode.value = 'mixed'
        elements.eventsPerSecond.value = '2000'
        elements.duration.value = '30'
        elements.payloadSize.value = '100'
        break
    }
  })
})

/**
 * Start polling stats
 */
function startStatsPolling() {
  if (statsInterval) return

  statsInterval = window.setInterval(async () => {
    try {
      const stats = await window.api.invokecontrolStatus(undefined)

      elements.generated.textContent = stats.generated.toLocaleString()
      elements.errored.textContent = stats.errored.toLocaleString()
      elements.avgLatency.textContent = `${stats.avgLatency.toFixed(2)} ms`

      if (!stats.running && statsInterval) {
        stopTest()
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
    }
  }, 250)
}

/**
 * Stop test
 */
function stopTest() {
  if (statsInterval) {
    clearInterval(statsInterval)
    statsInterval = null
  }

  elements.startBtn.disabled = false
  elements.stopBtn.disabled = true
  elements.status.textContent = 'Completed'
  elements.status.style.color = '#94a3b8'
}

console.log('[HighVolume] Renderer initialized')

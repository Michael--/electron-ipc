/**
 * Renderer process - demonstrates electron-ipc usage
 */

import type { ApiType } from '../../dist/ipc-api.generated.js'

// Type declaration for api exposed by preload
declare global {
  interface Window {
    api: ApiType
  }
}

const { api } = window

/**
 * Formats a timestamp to readable string
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

/**
 * Updates an output div with formatted text
 */
function updateOutput(elementId: string, text: string): void {
  const element = document.getElementById(elementId)
  if (element) {
    element.textContent = text
    element.classList.remove('empty')
  }
}

/**
 * Adds a notification to the event container
 */
function addNotification(title: string, message: string, level: string): void {
  const container = document.getElementById('eventContainer')
  if (!container) return

  const notification = document.createElement('div')
  notification.className = `notification ${level}`
  notification.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
  `

  container.appendChild(notification)

  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transition = 'opacity 0.3s'
    setTimeout(() => notification.remove(), 300)
  }, 5000)
}

/**
 * Initialize button handlers
 */
function init(): void {
  // Ping button
  const pingBtn = document.getElementById('pingBtn')
  pingBtn?.addEventListener('click', async () => {
    try {
      const response = await api.invokeping({ message: 'Hello from renderer!' })
      updateOutput('pingOutput', `${response.reply}\nTime: ${formatTime(response.timestamp)}`)
      console.log('Ping response:', response)
    } catch (error) {
      console.error('Ping error:', error)
      updateOutput('pingOutput', `Error: ${error}`)
    }
  })

  // Get Data buttons
  const setupDataButton = (buttonId: string, dataId: number) => {
    const btn = document.getElementById(buttonId)
    btn?.addEventListener('click', async () => {
      try {
        updateOutput('dataOutput', 'Loading...')
        const response = await api.invokegetData({ id: dataId })
        updateOutput('dataOutput', JSON.stringify(response, null, 2))
        console.log('Data response:', response)
      } catch (error) {
        console.error('Get data error:', error)
        updateOutput('dataOutput', `Error: ${error}`)
      }
    })
  }

  setupDataButton('getData1', 1)
  setupDataButton('getData2', 2)
  setupDataButton('getData3', 3)

  // Trigger event buttons
  const setupEventButton = (buttonId: string, delay: number) => {
    const btn = document.getElementById(buttonId)
    btn?.addEventListener('click', async () => {
      try {
        const response = await api.invoketriggerNotification({ delay })
        console.log('Event scheduled:', response)
        if (response.scheduled) {
          addNotification('Info', `Notification scheduled with ${delay}ms delay`, 'info')
        }
      } catch (error) {
        console.error('Trigger event error:', error)
        addNotification('Error', `Failed to schedule notification: ${error}`, 'error')
      }
    })
  }

  setupEventButton('triggerEvent', 500)
  setupEventButton('triggerEvent2', 2000)

  // Listen for notification events from main process
  const unsubscribe = api.onnotification((event) => {
    console.log('Received notification event:', event)
    addNotification(event.title, event.message, event.level)
  })

  // Clean up listener on page unload
  window.addEventListener('beforeunload', () => {
    unsubscribe()
  })

  console.log('✅ Renderer initialized')
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

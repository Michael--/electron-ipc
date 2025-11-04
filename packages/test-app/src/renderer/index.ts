/**
 * Renderer process code
 *
 * This demonstrates usage of the electron-ipc generated API
 */

// Declare the electronAPI on window
declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<unknown>
    }
  }
}

// eslint-disable-next-line no-console
console.log('Renderer process started')

// Example usage of exposed API
if (window.electronAPI) {
  // eslint-disable-next-line no-console
  console.log('Electron API is available')
}

export {}

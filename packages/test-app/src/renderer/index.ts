/**
 * Renderer process code
 *
 * This demonstrates usage of the electron-ipc generated API
 */

// eslint-disable-next-line no-console
console.log('Renderer process started')

if (window.api) {
  // eslint-disable-next-line no-console
  console.log('API is available on window.api')
  window.api.onAbout(() => {
    // eslint-disable-next-line no-console
    console.log('Received About event from main process')
  })
  window.api.onPing((payload) => {
    // eslint-disable-next-line no-console
    console.log(`Received Ping event from main process with payload: ${payload}`)
  })
}

export {}

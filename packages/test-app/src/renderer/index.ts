/**
 * Renderer process code
 *
 * This demonstrates usage of the electron-ipc generated API
 */

// eslint-disable-next-line no-console
console.log('Renderer process started');

// Example usage of exposed API
declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<unknown>;
    };
  }
}

if (window.electronAPI) {
  // eslint-disable-next-line no-console
  console.log('Electron API is available');
}

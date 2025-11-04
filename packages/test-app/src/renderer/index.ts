/**
 * Renderer process code
 * 
 * This demonstrates usage of the electron-ipc generated API
 */

console.log('Renderer process started');

// Example usage of exposed API
if (window.electronAPI) {
  console.log('Electron API is available');
}

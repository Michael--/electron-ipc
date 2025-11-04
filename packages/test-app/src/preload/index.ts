import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - runs in isolated context
 * 
 * This is where we'll expose the generated IPC API to the renderer
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder - generated IPC methods will be added here
  ping: () => ipcRenderer.invoke('ping'),
});

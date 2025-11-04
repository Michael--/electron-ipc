import { contextBridge } from 'electron'
import { api } from './api-generated'

/**
 * Preload script - runs in isolated context
 *
 * This is where we expose the generated IPC API to the renderer
 */

contextBridge.exposeInMainWorld('electronAPI', api)

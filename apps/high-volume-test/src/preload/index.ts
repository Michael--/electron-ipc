/**
 * Preload script for High-Volume Test App
 */

import { exposeApi } from '../../dist/ipc-api'

// Expose IPC API to renderer
exposeApi()

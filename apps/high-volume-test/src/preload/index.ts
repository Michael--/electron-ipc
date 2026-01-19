/**
 * Preload script for High-Volume Test App
 */

import { exposeApi } from '../main/ipc-api.generated'

// Expose IPC API to renderer
exposeApi()

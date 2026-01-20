/**
 * electron-ipc - TypeScript code generator for type-safe Electron IPC
 *
 * This is the main entry point for the electron-ipc library.
 * It exports all interfaces, types, and generator functions.
 */

// Auto-initialize Inspector handlers (silent no-op if not in main process)
import './inspector/auto-init'

// Export interfaces
export * from './interfaces'

/**
 * Core interfaces for electron-ipc
 *
 * This file exports all TypeScript interfaces, types, and classes
 * for defining and handling IPC communication contracts.
 */

// Export base types and utilities
export * from './types'

// Export contract interfaces and types
export * from './broadcast-contracts'
export * from './event-contracts'
export * from './invoke-contracts'
export * from './stream-contracts'

// Export combined IPC contracts (for backwards compatibility)
export * from './ipc-contracts'

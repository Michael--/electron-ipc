/**
 * Type-safe IPC (Inter-Process Communication) contracts for Electron applications.
 *
 * This module provides a collection of contract types and utilities for secure, type-safe
 * communication between Electron's main and renderer processes.
 *
 * Communication patterns:
 * - **Invoke**: Bidirectional request-response (see invoke-contracts.ts)
 * - **Events**: Unidirectional renderer → main notifications (see event-contracts.ts)
 * - **Broadcasts**: Unidirectional main → renderer updates (see broadcast-contracts.ts)
 * - **Streams**: Efficient large data transfers (see stream-contracts.ts)
 * - **RendererInvoke**: Renderer-to-renderer via main (see renderer-invoke-contracts.ts)
 *
 * For detailed usage and examples, see the individual contract modules.
 */

// Re-export all types and functions from the modular files
export * from './broadcast-contracts'
export * from './event-contracts'
export * from './invoke-contracts'
export * from './renderer-invoke-contracts'
export * from './stream-contracts'
export * from './types'
export * from './validation'

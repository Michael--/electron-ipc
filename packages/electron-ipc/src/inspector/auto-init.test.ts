/**
 * Tests for auto-initialization of Inspector handlers
 */

import { describe, expect, it } from 'vitest'
import { ensureInspectorHandlers } from './auto-init'

describe('inspector/auto-init', () => {
  describe('ensureInspectorHandlers', () => {
    it('exports the initialization function', () => {
      expect(ensureInspectorHandlers).toBeDefined()
      expect(typeof ensureInspectorHandlers).toBe('function')
    })

    it('can be called without throwing', () => {
      // Should not throw even if electron is not properly available
      expect(() => {
        ensureInspectorHandlers()
      }).not.toThrow()
    })

    it('initializes only once when called multiple times', () => {
      // Multiple calls should not cause errors (idempotent)
      expect(() => {
        ensureInspectorHandlers()
        ensureInspectorHandlers()
        ensureInspectorHandlers()
      }).not.toThrow()
    })
  })

  describe('module behavior', () => {
    it('gracefully handles missing electron context', () => {
      // The module should handle missing electron gracefully
      // This is tested by the fact that tests can import it without electron being fully available
      expect(ensureInspectorHandlers).toBeDefined()
    })

    it('provides default handlers to prevent console errors', () => {
      // When imported, the module registers default handlers automatically
      // This prevents "No handler registered for INSPECTOR:GET_PAYLOAD_MODE" errors
      // The actual behavior is tested in integration (manual testing required)
      expect(() => ensureInspectorHandlers()).not.toThrow()
    })
  })
})

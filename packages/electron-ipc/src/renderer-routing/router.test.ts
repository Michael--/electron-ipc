/**
 * Tests for RendererInvokeRouter
 */

import '../test-helpers/electron-mock'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RendererInvokeRouter, resetRendererInvokeRouter } from './router'

describe('RendererInvokeRouter', () => {
  let router: RendererInvokeRouter

  beforeEach(() => {
    router = new RendererInvokeRouter()
  })

  afterEach(() => {
    router.cleanup()
    resetRendererInvokeRouter()
  })

  it('should initialize without errors', () => {
    expect(router).toBeDefined()
  })

  it('should provide getStats() method', () => {
    const stats = router.getStats()
    expect(stats).toHaveProperty('pendingRequests')
    expect(stats).toHaveProperty('requests')
    expect(stats.pendingRequests).toBe(0)
    expect(stats.requests).toHaveLength(0)
  })

  it('should cleanup pending requests', () => {
    router.cleanup()
    const stats = router.getStats()
    expect(stats.pendingRequests).toBe(0)
  })
})

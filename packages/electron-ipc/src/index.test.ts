import { describe, expect, it } from 'vitest'
import { VERSION } from './index'

describe('electron-ipc', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBeDefined()
    expect(typeof VERSION).toBe('string')
  })

  it('VERSION should match package version', () => {
    expect(VERSION).toBe('0.1.0')
  })
})

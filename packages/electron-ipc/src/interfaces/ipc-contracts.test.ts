import { describe, expect, it } from 'vitest'
import * as ipcContracts from './ipc-contracts'
import { defineEventHandlers } from './event-contracts'
import { defineInvokeHandlers } from './invoke-contracts'
import { defineStreamDownloadHandlers } from './stream-contracts'

describe('ipc-contracts re-exports', () => {
  it('exposes common contract helpers', () => {
    expect(ipcContracts.defineEventHandlers).toBe(defineEventHandlers)
    expect(ipcContracts.defineInvokeHandlers).toBe(defineInvokeHandlers)
    expect(ipcContracts.defineStreamDownloadHandlers).toBe(defineStreamDownloadHandlers)
  })
})

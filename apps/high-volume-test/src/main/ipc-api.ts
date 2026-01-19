/**
 * IPC Contracts for High-Volume Testing
 */

import {
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
} from '@number10/electron-ipc'

/**
 * Invoke contracts for high-volume testing
 */
export type InvokeContracts = GenericInvokeContract<{
  /**
   * Simple ping test
   */
  testPing: IInvokeContract<{ message: string }, { echo: string; timestamp: number }>

  /**
   * Heavy payload test
   */
  testHeavy: IInvokeContract<{ size: number; data?: string }, { processed: boolean; size: number }>

  /**
   * Error simulation test
   */
  testError: IInvokeContract<{ shouldFail: boolean }, { success: boolean }>

  /**
   * Start high-volume test
   */
  controlStart: IInvokeContract<
    {
      mode: 'burst' | 'sustained' | 'mixed'
      eventsPerSecond: number
      duration: number
      payloadSize?: number
    },
    {
      started: boolean
      testId: string
    }
  >

  /**
   * Stop high-volume test
   */
  controlStop: IInvokeContract<{ testId?: string }, { stopped: boolean }>

  /**
   * Get test status
   */
  controlStatus: IInvokeContract<
    void,
    {
      running: boolean
      generated: number
      errored: number
      avgLatency: number
    }
  >
}>

/**
 * Event contracts
 */
export type EventContracts = GenericRendererEventContract<{
  /**
   * Test event
   */
  testEvent: IRendererEventContract<{ counter: number; timestamp: number }>
}>

/**
 * Broadcast contracts
 */
export type BroadcastContracts = GenericBroadcastContract<{
  /**
   * Test broadcast
   */
  testBroadcast: IBroadcastContract<{ message: string; id: number; data?: string }>
}>

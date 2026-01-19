import {
  GenericBroadcastContract,
  GenericInvokeContract,
  IBroadcastContract,
  IInvokeContract,
} from '@number10/electron-ipc'

/**
 * Invoke contracts - request/response patterns
 */
export type InvokeContracts = GenericInvokeContract<{
  /**
   * Ping - responds with a pong message
   */
  ping: IInvokeContract<{ message: string }, { reply: string; timestamp: number }>

  /**
   * Get data - returns mock data based on ID
   */
  getData: IInvokeContract<{ id: number }, { id: number; data: string; processed: boolean }>

  /**
   * Trigger notification - schedules a notification event
   */
  triggerNotification: IInvokeContract<{ delay: number }, { scheduled: boolean }>
}>

/**
 * Event contracts - one-way messages from main to renderer
 */
export type EventContracts = GenericBroadcastContract<{
  /**
   * Notification event sent from main process
   */
  notification: IBroadcastContract<{
    title: string
    message: string
    level: 'info' | 'warning' | 'error' | 'success'
  }>
}>

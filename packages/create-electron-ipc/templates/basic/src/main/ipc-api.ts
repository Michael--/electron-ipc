import {
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
} from '@number10/electron-ipc'

/**
 * InvokeContracts: Defines bidirectional IPC contracts for request-response communication between renderer and main processes.
 * @interface
 */
export type InvokeContracts = GenericInvokeContract<{
  /**
   * Add called by renderer and get the result back from main process.
   * @type {object}
   * @property {number} a - The first number to add.
   * @property {number} b - The second number to add.
   * @returns {number} - The sum of the two numbers.
   */
  Add: IInvokeContract<{ a: number; b: number }, number>
}>

/**
 * IPCEventContracts: Defines unidirectional IPC contracts for events sent from renderer to main process without direct responses.
 * @interface
 */
export type EventContracts = GenericRendererEventContract<{
  /**
   * Signals the main process to quit the application.
   * @type {object}
   * @property {void} request - No request data.
   */
  Quit: IRendererEventContract<void>
}>

/**
 * BroadcastContracts: Defines unidirectional IPC contracts for data/events sent from main to renderer process.
 * @type
 */
export type BroadcastContracts = GenericBroadcastContract<{
  /**
   * Event triggered for 'About' dialog or information.
   * @type {object}
   * @property {void} payload - No payload, used to trigger the display of 'About' information.
   */
  About: IBroadcastContract<void>
}>

import {
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
} from 'electron-ipc'

/**
 * InvokeContracts: Defines bidirectional IPC contracts for request-response communication between renderer and main processes.
 * @interface
 */
export type InvokeContracts = GenericInvokeContract<{
  /**
   * AddNumbers called by renderer and get the result back from main process.
   * @type {object}
   * @property {number} a - The first number to add.
   * @property {number} b - The second number to add.
   * @returns {number} - The sum of the two numbers.
   */
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>

  /**
   * GetAppInfo retrieves application metadata without any request parameters.
   * @returns {object} Application information including name and version.
   */
  GetAppInfo: IInvokeContract<void, { name: string; version: string }>
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

  /**
   * Logs a message in the main process console.
   * @type {object}
   * @property {string} request - The message to log.
   */
  LogMessage: IRendererEventContract<{ level: 'info' | 'warn' | 'error'; message: string }>
}>

/**
 * BroadcastContracts: Defines unidirectional IPC contracts for data/events sent from main to renderer process.
 * @type
 */
export type BroadcastContracts = GenericBroadcastContract<{
  /**
   * Ping event to check connectivity or responsiveness.
   * @type {object}
   * @property {number} payload - A numeric payload representing the ping count or identifier.
   */
  Ping: IBroadcastContract<number>

  /**
   * Event triggered for 'About' dialog or information.
   * @type {object}
   * @property {void} payload - No payload, used to trigger the display of 'About' information.
   */
  About: IBroadcastContract<void>
}>

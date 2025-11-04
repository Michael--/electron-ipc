import { createBroadcastFor, IBroadcastContract } from 'electron-ipc'

/**
 * IBroadcastContracts: Defines unidirectional IPC contracts for data/events sent from main to renderer process.
 * @interface
 */
export interface ITestBroadcastContracts {
  /**
   * Event triggered for 'About' dialog or information.
   * @type {object}
   * @property {void} payload - No payload, used to trigger the display of 'About' information.
   */
  About: IBroadcastContract<void>
}

// ----------------------------------------------------------------------------
// send: type safe handler
// add type safe accessing to ITestBroadcastContracts
export const mainBroadcast = createBroadcastFor<ITestBroadcastContracts>()

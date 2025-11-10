import {
  GenericStreamDownloadContract,
  GenericStreamInvokeContract,
  GenericStreamUploadContract,
  IStreamDownloadContract,
  IStreamInvokeContract,
  IStreamUploadContract,
} from '@number10/electron-ipc'

/**
 * StreamInvokeContracts: Defines bidirectional IPC contracts where the response is a stream.
 * @interface
 */
export type StreamInvokeContracts = GenericStreamInvokeContract<{
  /**
   * GetLargeData streams large data from main to renderer.
   * @type {object}
   * @property {string} request - The ID of the data to retrieve.
   * @property {string} stream - Each chunk of data.
   */
  GetLargeData: IStreamInvokeContract<{ id: string }, string>
}>

/**
 * StreamUploadContracts: Defines unidirectional IPC contracts for streaming data from renderer to main.
 * @interface
 */
export type StreamUploadContracts = GenericStreamUploadContract<{
  /**
   * UploadFile streams file data from renderer to main.
   * @type {object}
   * @property {string} request - File name or metadata
   * @property {Uint8Array} data - Each chunk of file data.
   */
  UploadFile: IStreamUploadContract<{ fileName: string }, Uint8Array>
}>

/**
 * StreamDownloadContracts: Defines unidirectional IPC contracts for streaming data from main to renderer.
 * @interface
 */
export type StreamDownloadContracts = GenericStreamDownloadContract<{
  /**
   * DownloadLogs streams log data from main to renderer.
   * @type {object}
   * @property {object} request - Log filter criteria
   * @property {string} data - Each chunk of log data.
   */
  DownloadLogs: IStreamDownloadContract<{ level?: 'info' | 'warn' | 'error' }, string>

  /**
   * StreamVideo downloads and streams video data via main process.
   * @type {object}
   * @property {object} request - Video URL to download
   * @property {Uint8Array} data - Video data chunks.
   */
  StreamVideo: IStreamDownloadContract<{ url: string }, Uint8Array>
}>

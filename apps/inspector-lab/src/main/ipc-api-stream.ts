import {
  GenericStreamDownloadContract,
  GenericStreamInvokeContract,
  GenericStreamUploadContract,
  IStreamDownloadContract,
  IStreamInvokeContract,
  IStreamUploadContract,
} from '@number10/electron-ipc'

export type StreamInvokeContracts = GenericStreamInvokeContract<{
  Ticks: IStreamInvokeContract<
    { count: number; delayMs: number; payloadSize?: number; failAt?: number },
    { seq: number; payload: string }
  >
}>

export type StreamUploadContracts = GenericStreamUploadContract<{
  Chunks: IStreamUploadContract<{ label: string }, { seq: number; payload: string }>
}>

export type StreamDownloadContracts = GenericStreamDownloadContract<{
  Snapshots: IStreamDownloadContract<
    { count: number; delayMs: number; payloadSize?: number },
    { seq: number; payload: string }
  >
}>

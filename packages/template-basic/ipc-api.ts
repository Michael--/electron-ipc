import {
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericStreamDownloadContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
  IStreamDownloadContract,
} from '@number10/electron-ipc'

export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>

export type EventContracts = GenericRendererEventContract<{
  LogMessage: IRendererEventContract<{ level: 'info' | 'warn' | 'error'; message: string }>
}>

export type BroadcastContracts = GenericBroadcastContract<{
  Ping: IBroadcastContract<number>
}>

export type StreamDownloadContracts = GenericStreamDownloadContract<{
  DownloadLogs: IStreamDownloadContract<{ sinceMs: number }, string>
}>

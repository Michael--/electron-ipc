import {
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericRendererInvokeContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
  IRendererInvokeContract,
} from '@number10/electron-ipc'

export type InvokeContracts = GenericInvokeContract<{
  GetWindowInfo: IInvokeContract<
    void,
    { id: number; role: string; title: string; webContentsId: number }
  >
  GetAllWindows: IInvokeContract<
    void,
    { id: number; role: string; title: string; webContentsId: number }[]
  >
}>

export type EventContracts = GenericRendererEventContract<{
  BroadcastToAll: IRendererEventContract<{ message: string }>
  BroadcastToRole: IRendererEventContract<{ role: string; message: string }>
  LogMessage: IRendererEventContract<{ level: 'info' | 'warn' | 'error'; message: string }>
  RequestWindowList: IRendererEventContract<void>
}>

export type BroadcastContracts = GenericBroadcastContract<{
  Announcement: IBroadcastContract<{
    fromRole: string
    fromId: number
    target: 'all' | 'role'
    message: string
  }>
  WindowList: IBroadcastContract<{
    windows: { id: number; role: string; title: string; webContentsId: number }[]
  }>
}>

export type RendererInvokeContracts = GenericRendererInvokeContract<{
  AddLogEntry: IRendererInvokeContract<
    {
      level: 'info' | 'warn' | 'error'
      message: string
      sourceRole: string
      sourceId: number
    },
    { success: boolean; entryId: string }
  >
  GetLogCount: IRendererInvokeContract<void, { count: number }>
  ClearLogs: IRendererInvokeContract<void, { cleared: number }>
}>

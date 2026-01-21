import {
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
} from '@number10/electron-ipc'
import type { TraceKind, TraceStatus } from '@number10/electron-ipc/inspector'

export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, { sum: number }>
  Fail: IInvokeContract<{ message?: string }, { ok: false }>
  Slow: IInvokeContract<
    { delayMs: number; payloadSize?: number },
    { waitedMs: number; payload?: string }
  >
  TriggerBroadcast: IInvokeContract<
    { count: number; delayMs?: number; payloadSize?: number },
    { sent: number }
  >
  EmitTraceStatus: IInvokeContract<
    { kind: TraceKind; status: TraceStatus; channel: string; durationMs?: number },
    { ok: true }
  >
}>

export type EventContracts = GenericRendererEventContract<{
  Log: IRendererEventContract<{ level: 'info' | 'warn' | 'error'; message: string }>
}>

export type BroadcastContracts = GenericBroadcastContract<{
  Pulse: IBroadcastContract<{ id: number; note?: string }>
}>

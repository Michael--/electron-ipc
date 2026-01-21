import { BroadcastContracts, EventContracts, InvokeContracts } from '@gen/lab-api'
import {
  StreamDownloadContracts,
  StreamInvokeContracts,
  StreamUploadContracts,
} from '@gen/lab-stream-api'
import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  AbstractRegisterStreamDownload,
  AbstractRegisterStreamHandler,
  AbstractRegisterStreamUpload,
  defineEventHandlers,
  defineInvokeHandlers,
  defineStreamDownloadHandlers,
  defineStreamInvokeHandlers,
  defineStreamUploadHandlers,
} from '@number10/electron-ipc'
import {
  createTraceContext,
  createTraceEnvelope,
  emitTrace,
  enableIpcInspector,
} from '@number10/electron-ipc/inspector'
import type { TraceKind, TraceStatus } from '@number10/electron-ipc/inspector'
import { createBroadcastToAll, getWindowRegistry } from '@number10/electron-ipc/window-manager'
import { app, BrowserWindow } from 'electron'
import path from 'path'

// Prevent Electron warning about unsupported NODE_OPTIONS.
delete process.env.NODE_OPTIONS

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildPayload(size?: number): string {
  if (!size || size <= 0) return ''
  return 'x'.repeat(size)
}

function emitSyntheticTrace(
  sourceId: number,
  payload: { kind: TraceKind; status: TraceStatus; channel: string; durationMs?: number }
): void {
  const traceContext = createTraceContext()
  const tsStart = Date.now()
  const tsEnd = payload.durationMs ? tsStart + payload.durationMs : undefined
  const direction =
    payload.kind === 'broadcast' || payload.kind === 'streamDownload'
      ? 'main→renderer'
      : 'renderer→main'

  const base = {
    id: traceContext.spanId,
    kind: payload.kind,
    channel: payload.channel,
    direction,
    status: payload.status,
    tsStart,
    tsEnd,
    durationMs: payload.durationMs,
    trace: createTraceEnvelope(traceContext, tsStart, tsEnd),
  }

  if (payload.kind === 'broadcast') {
    emitTrace({
      ...base,
      target: { webContentsId: sourceId },
    })
    return
  }

  const isStreamKind =
    payload.kind === 'streamDownload' ||
    payload.kind === 'streamInvoke' ||
    payload.kind === 'streamUpload'

  if (isStreamKind) {
    emitTrace({
      ...base,
      streamId: traceContext.spanId,
      streamType:
        payload.kind === 'streamDownload'
          ? 'download'
          : payload.kind === 'streamUpload'
            ? 'upload'
            : 'invoke',
      chunkCount: 0,
      totalBytes: 0,
      source: { webContentsId: sourceId },
    })
    return
  }

  emitTrace({
    ...base,
    source: { webContentsId: sourceId },
  })
}

class RegisterInvokeHandlers extends AbstractRegisterHandler {
  handlers = defineInvokeHandlers<InvokeContracts>({
    AddNumbers: async (_event, payload) => {
      return { sum: payload.a + payload.b }
    },
    Fail: async (_event, payload) => {
      const message = payload.message ?? 'Intentional failure'
      throw new Error(message)
    },
    Slow: async (_event, payload) => {
      await delay(payload.delayMs)
      const responsePayload = payload.payloadSize ? buildPayload(payload.payloadSize) : undefined
      return { waitedMs: payload.delayMs, payload: responsePayload }
    },
    TriggerBroadcast: async (_event, payload) => {
      const broadcastAll = createBroadcastToAll<BroadcastContracts>()
      for (let i = 0; i < payload.count; i += 1) {
        broadcastAll('Pulse', { id: i + 1, note: buildPayload(payload.payloadSize) })
        if (payload.delayMs) {
          await delay(payload.delayMs)
        }
      }
      return { sent: payload.count }
    },
    EmitTraceStatus: async (event, payload) => {
      emitSyntheticTrace(event.sender.id, payload)
      return { ok: true }
    },
  })
}

class RegisterEventHandlers extends AbstractRegisterEvent {
  events = defineEventHandlers<EventContracts>({
    Log: (_event, payload) => {
      if (payload.level === 'error') console.error(payload.message)
      else if (payload.level === 'warn') console.warn(payload.message)
      else console.log(payload.message)
    },
  })
}

class RegisterStreamInvokeHandlers extends AbstractRegisterStreamHandler {
  handlers = defineStreamInvokeHandlers<StreamInvokeContracts>({
    Ticks: (_event, payload) => {
      return new globalThis.ReadableStream({
        async start(controller) {
          for (let i = 1; i <= payload.count; i += 1) {
            if (payload.failAt && i === payload.failAt) {
              controller.error(new Error(`Stream failed at ${i}`))
              return
            }
            controller.enqueue({
              seq: i,
              payload: buildPayload(payload.payloadSize),
            })
            await delay(payload.delayMs)
          }
          controller.close()
        },
      })
    },
  })
}

class RegisterStreamUploadHandlers extends AbstractRegisterStreamUpload {
  handlers = defineStreamUploadHandlers<StreamUploadContracts>({
    Chunks: (payload, onData, onEnd, onError) => {
      console.log(`[Upload] ${payload.label} started`)
      onData((chunk) => {
        console.log(`[Upload] ${payload.label} chunk ${chunk.seq}`)
      })
      onEnd(() => {
        console.log(`[Upload] ${payload.label} complete`)
      })
      onError((err) => {
        console.error(`[Upload] ${payload.label} error`, err)
      })
    },
  })
}

class RegisterStreamDownloadHandlers extends AbstractRegisterStreamDownload {
  handlers = defineStreamDownloadHandlers<StreamDownloadContracts>({
    Snapshots: (payload) => {
      return new globalThis.ReadableStream({
        async start(controller) {
          for (let i = 1; i <= payload.count; i += 1) {
            controller.enqueue({
              seq: i,
              payload: buildPayload(payload.payloadSize),
            })
            await delay(payload.delayMs)
          }
          controller.close()
        },
      })
    },
  })
}

function registerHandlers() {
  RegisterInvokeHandlers.register()
  RegisterEventHandlers.register()
  RegisterStreamInvokeHandlers.register()
  RegisterStreamUploadHandlers.register()
  RegisterStreamDownloadHandlers.register()
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  getWindowRegistry().register(mainWindow, 'main')
  registerHandlers()

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(() => {
  enableIpcInspector({ openOnStart: true })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  AbstractRegisterStreamDownload,
  IPCEventType,
  IPCHandlerType,
  IPCStreamDownloadHandlerType,
} from '@number10/electron-ipc'
import type { IpcMainInvokeEvent } from 'electron'
import { app, BrowserWindow } from 'electron'
import { EventContracts, InvokeContracts, StreamDownloadContracts } from './ipc-api'
import { mainBroadcast } from './ipc-api-main-broadcast'

class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (
      _event: IpcMainInvokeEvent,
      params: { a: number; b: number }
    ): Promise<number> => params.a + params.b,
  }
}

class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    LogMessage: (
      _event: IpcMainInvokeEvent,
      payload: { level: 'info' | 'warn' | 'error'; message: string }
    ): void => {
      // eslint-disable-next-line no-console
      if (payload.level === 'error') console.error(payload.message)
      // eslint-disable-next-line no-console
      else if (payload.level === 'warn') console.warn(payload.message)
      // eslint-disable-next-line no-console
      else console.log(payload.message)
    },
  }
}

class RegisterStreamDownload extends AbstractRegisterStreamDownload {
  handlers: IPCStreamDownloadHandlerType<StreamDownloadContracts> = {
    DownloadLogs: (_request: { sinceMs: number }): ReadableStream<string> => {
      return new globalThis.ReadableStream({
        start(controller) {
          controller.enqueue(`[${new Date().toISOString()}] Sample log line`)
          controller.close()
        },
      })
    },
  }
}

RegisterHandler.register()
RegisterEvent.register()
RegisterStreamDownload.register()

/**
 * Example: Send broadcast to a window
 */
export function sendPing(mainWindow: BrowserWindow) {
  mainBroadcast.Ping(mainWindow, Date.now())
}

export function quitApp() {
  app.quit()
}

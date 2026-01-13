import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  AbstractRegisterStreamDownload,
  IPCEventType,
  IPCHandlerType,
  IPCStreamDownloadHandlerType,
} from '@number10/electron-ipc'
import { app, BrowserWindow } from 'electron'
import {
  BroadcastContracts,
  EventContracts,
  InvokeContracts,
  StreamDownloadContracts,
} from './ipc-api'
import { mainBroadcast } from './ipc-broadcast.generated'

class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, params) => params.a + params.b,
  }
}

class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    LogMessage: (_event, payload) => {
      if (payload.level === 'error') console.error(payload.message)
      else if (payload.level === 'warn') console.warn(payload.message)
      else console.log(payload.message)
    },
  }
}

class RegisterStreamDownload extends AbstractRegisterStreamDownload {
  handlers: IPCStreamDownloadHandlerType<StreamDownloadContracts> = {
    DownloadLogs: async (_request) => {
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

export function sendPing(mainWindow: BrowserWindow) {
  mainBroadcast.Ping(mainWindow, Date.now())
}

export function quitApp() {
  app.quit()
}

import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  AbstractRegisterStreamDownload,
  IPCEventType,
  IPCHandlerType,
  IPCStreamDownloadHandlerType,
} from '@number10/electron-ipc'
import { app } from 'electron'
import { EventContracts, InvokeContracts, StreamDownloadContracts } from './ipc-api'
// import { mainBroadcast } from './ipc-api-main-broadcast' // Uncomment after code generation

class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, params) => params.a + params.b,
  }
}

class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    LogMessage: (_event, payload) => {
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
    DownloadLogs: (_request) => {
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

// export function sendPing(mainWindow: BrowserWindow) {
//   mainBroadcast.Ping(mainWindow, Date.now())
// }

export function quitApp() {
  app.quit()
}

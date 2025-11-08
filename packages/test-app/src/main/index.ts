import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  AbstractRegisterStreamHandler,
  IPCEventType,
  IPCHandlerType,
} from '@number10/electron-ipc'
import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { mainBroadcast } from './broadcast-generated'
import { EventContracts, InvokeContracts, StreamInvokeContracts } from './ipc-api'

let eventHandlerInitialized = false

/// create type safe accessing to BroadcastContracts, this is the alternative way to send broadcast events
// const mainBroadcast = createBroadcast<BroadcastContracts>()

function initializeEventHandler() {
  // check if already initialized
  if (eventHandlerInitialized) return
  eventHandlerInitialized = true

  // implement all handler
  class RegisterHandler extends AbstractRegisterHandler {
    handlers: IPCHandlerType<InvokeContracts> = {
      AddNumbers: async (_event, v) => {
        // console.log(`AddNumbers: ${v.a} + ${v.b}`)
        return v.a + v.b
      },
      GetAppInfo: async () => {
        try {
          const packageJsonPath = path.join(process.cwd(), 'package.json')
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
          return {
            name: packageJson.name,
            version: packageJson.version,
          }
        } catch (error) {
          // Fallback to app methods if package.json can't be read
          return {
            name: app.getName(),
            version: app.getVersion(),
          }
        }
      },
    }
  }

  // implement all events
  class RegisterEvent extends AbstractRegisterEvent {
    events: IPCEventType<EventContracts> = {
      Quit: (_event, _v) => {
        console.warn(`Quit`)
        app.quit()
      },
      LogMessage: (_event, v) => {
        // eslint-disable-next-line no-console
        if (v.level === 'error') console.error(`[Renderer] ${v.message}`)
        // eslint-disable-next-line no-console
        else if (v.level === 'warn') console.warn(`[Renderer] ${v.message}`)
        // eslint-disable-next-line no-console
        else console.log(`[Renderer] ${v.message}`)
      },
    }
  }

  // implement stream handlers
  class RegisterStreamHandler extends AbstractRegisterStreamHandler {
    handlers: IPCStreamHandlerType<StreamInvokeContracts> = {
      GetLargeData: (_event, request) => {
        // Use globalThis.ReadableStream for Web Streams API compatibility
        return new globalThis.ReadableStream({
          async start(controller) {
            // Send 10 messages over 10 seconds
            for (let i = 1; i <= 10; i++) {
              const message = `[${new Date().toLocaleTimeString()}] Stream message ${i}/10 for ${request.id}`
              controller.enqueue(message)

              // Wait 1 second before next message
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }

            controller.close()
          },
        })
      },
    }
  }

  // register handler and events
  RegisterHandler.register()
  RegisterEvent.register()
  RegisterStreamHandler.register()
}

/**
 * Main process entry point
 */

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  initializeEventHandler()

  // Load the index.html from dist/renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Example: Send 'About' event to renderer after load
    if (mainWindow) {
      mainBroadcast.About(mainWindow)
    }

    // send ping event every second for demo purposes
    let pingCount = 0
    setInterval(() => {
      if (mainWindow) {
        mainBroadcast.Ping(mainWindow, pingCount++)
      }
    }, 1000)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

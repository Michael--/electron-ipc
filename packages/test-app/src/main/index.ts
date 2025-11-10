import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  AbstractRegisterStreamDownload,
  AbstractRegisterStreamHandler,
  AbstractRegisterStreamUpload,
  IPCEventType,
  IPCHandlerType,
  IPCStreamDownloadHandlerType,
  IPCStreamHandlerType,
  IPCStreamUploadHandlerType,
} from '@number10/electron-ipc'
import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { mainBroadcast } from './api-broadcast-generated'
import { EventContracts, InvokeContracts } from './ipc-api'
import {
  StreamDownloadContracts,
  StreamInvokeContracts,
  StreamUploadContracts,
} from './ipc-api-stream'

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

  // implement stream upload handlers (Renderer → Main)
  class RegisterStreamUpload extends AbstractRegisterStreamUpload {
    handlers: IPCStreamUploadHandlerType<StreamUploadContracts> = {
      UploadFile: (request, onData, onEnd, onError) => {
        // eslint-disable-next-line no-console
        console.log(`[Upload] Started receiving file: ${request.fileName}`)

        // Set up the data handler
        onData((chunk: Uint8Array) => {
          // eslint-disable-next-line no-console
          console.log(`[Upload] Received chunk: ${chunk.length} bytes`)
          // Here you would process the chunk (e.g., write to file, validate, etc.)
        })

        // Set up the end handler
        onEnd(() => {
          // eslint-disable-next-line no-console
          console.log(`[Upload] Completed receiving file: ${request.fileName}`)
        })

        // Set up the error handler
        onError((err) => {
          // eslint-disable-next-line no-console
          console.error('[Upload] Error:', err)
        })
      },
    }
  }

  // implement stream download handlers (Main → Renderer)
  class RegisterStreamDownload extends AbstractRegisterStreamDownload {
    handlers: IPCStreamDownloadHandlerType<StreamDownloadContracts> = {
      DownloadLogs: (request) => {
        const level = request.level || 'info'
        // eslint-disable-next-line no-console
        console.log(`[DownloadLogs] Streaming logs with level filter: ${level}`)

        // Return a ReadableStream that sends 10 log entries over 10 seconds
        return new globalThis.ReadableStream({
          async start(controller) {
            for (let i = 1; i <= 10; i++) {
              const logEntry = `[${new Date().toLocaleTimeString()}] [${level.toUpperCase()}] Log entry ${i}/10 - System operational`
              controller.enqueue(logEntry)

              // Wait 1 second before next log
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }

            controller.close()
          },
        })
      },
      StreamVideo: (request) => {
        const url = request.url
        // eslint-disable-next-line no-console
        console.log(`[StreamVideo] Fetching video from: ${url}`)

        // Return ReadableStream directly (not Promise)
        return new globalThis.ReadableStream({
          async start(controller) {
            try {
              const response = await fetch(url)
              if (!response.ok || !response.body) {
                controller.error(
                  new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
                )
                return
              }

              const contentLength = response.headers.get('content-length')
              // eslint-disable-next-line no-console
              console.log(`[StreamVideo] Response OK, streaming ${contentLength} bytes`)

              const reader = response.body.getReader()
              const chunkSize = 256 * 1024 // 256KB chunks for better MP4 compatibility
              let buffer: Uint8Array[] = []
              let bufferSize = 0

              // eslint-disable-next-line no-constant-condition
              while (true) {
                const { done, value } = await reader.read()

                if (done) {
                  // Send remaining buffered data
                  if (bufferSize > 0) {
                    const combined = new Uint8Array(bufferSize)
                    let offset = 0
                    for (const chunk of buffer) {
                      combined.set(chunk, offset)
                      offset += chunk.length
                    }
                    controller.enqueue(combined)
                    // eslint-disable-next-line no-console
                    console.log(`[StreamVideo] Sent final chunk: ${combined.length} bytes`)
                  }

                  // eslint-disable-next-line no-console
                  console.log('[StreamVideo] Stream complete')
                  controller.close()
                  break
                }

                // Buffer chunks until we reach target size
                buffer.push(value)
                bufferSize += value.length

                if (bufferSize >= chunkSize) {
                  // Combine buffered chunks
                  const combined = new Uint8Array(bufferSize)
                  let offset = 0
                  for (const chunk of buffer) {
                    combined.set(chunk, offset)
                    offset += chunk.length
                  }

                  controller.enqueue(combined)
                  // eslint-disable-next-line no-console
                  console.log(`[StreamVideo] Sent chunk: ${combined.length} bytes`)

                  // Reset buffer
                  buffer = []
                  bufferSize = 0
                }
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('[StreamVideo] Error:', err)
              controller.error(err)
            }
          },
        })
      },
    }
  }

  // register handler and events
  RegisterHandler.register()
  RegisterEvent.register()
  RegisterStreamHandler.register()
  RegisterStreamUpload.register()
  RegisterStreamDownload.register()
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
      sandbox: true,
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

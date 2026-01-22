import { BroadcastContracts, EventContracts, InvokeContracts } from '@gen/ipc-api'
import {
  StreamDownloadContracts,
  StreamInvokeContracts,
  StreamUploadContracts,
} from '@gen/ipc-stream-api'
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
  withEventValidation,
  withInvokeValidation,
  withStreamDownloadValidation,
  withStreamInvokeValidation,
  withStreamUploadValidation,
} from '@number10/electron-ipc'
import {
  closeInspector,
  enableIpcInspector,
  getInspectorWindow,
} from '@number10/electron-ipc/inspector'
import { validatorFromSafeParse } from '@number10/electron-ipc/validation'
import { createBroadcastToAll, getWindowRegistry } from '@number10/electron-ipc/window-manager'
import { app, BrowserWindow, Menu } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'

// Prevent Electron warning about unsupported NODE_OPTIONS.
delete process.env.NODE_OPTIONS

let eventHandlerInitialized = false

/// create type safe accessing to BroadcastContracts, this is the alternative way to send broadcast events
// const mainBroadcast = createBroadcast<BroadcastContracts>()

const voidValidator = validatorFromSafeParse(z.void().safeParse)
const addNumbersRequestValidator = validatorFromSafeParse(
  z.object({ a: z.number(), b: z.number() }).safeParse
)
const addNumbersResponseValidator = validatorFromSafeParse(z.number().safeParse)
const appInfoResponseValidator = validatorFromSafeParse(
  z.object({ name: z.string(), version: z.string() }).safeParse
)
const logMessageValidator = validatorFromSafeParse(
  z.object({ level: z.enum(['info', 'warn', 'error']), message: z.string() }).safeParse
)

const streamInvokeRequestValidator = validatorFromSafeParse(z.object({ id: z.string() }).safeParse)
const streamInvokeDataValidator = validatorFromSafeParse(z.string().safeParse)

const uploadRequestValidator = validatorFromSafeParse(z.object({ fileName: z.string() }).safeParse)
const uploadDataValidator = validatorFromSafeParse(
  z.custom<Uint8Array<ArrayBufferLike>>(
    (value) => value instanceof Uint8Array,
    'Expected Uint8Array'
  ).safeParse
)

const downloadLogsRequestValidator = validatorFromSafeParse(
  z.object({ level: z.enum(['info', 'warn', 'error']).optional() }).safeParse
)
const downloadLogsDataValidator = validatorFromSafeParse(z.string().safeParse)
const streamVideoRequestValidator = validatorFromSafeParse(
  z.object({ url: z.string().url() }).safeParse
)
const streamVideoDataValidator = validatorFromSafeParse(
  z.custom<Uint8Array<ArrayBufferLike>>(
    (value) => value instanceof Uint8Array,
    'Expected Uint8Array'
  ).safeParse
)

function initializeEventHandler() {
  // check if already initialized
  if (eventHandlerInitialized) return
  eventHandlerInitialized = true

  // implement all handler
  class RegisterHandler extends AbstractRegisterHandler {
    handlers = defineInvokeHandlers<InvokeContracts>({
      AddNumbers: withInvokeValidation(
        { request: addNumbersRequestValidator, response: addNumbersResponseValidator },
        async (_event, v) => {
          // console.log(`AddNumbers: ${v.a} + ${v.b}`)
          return v.a + v.b
        }
      ),
      GetAppInfo: withInvokeValidation(
        { request: voidValidator, response: appInfoResponseValidator },
        async (_event, _request) => {
          try {
            const packageJsonPath = path.join(process.cwd(), 'package.json')
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
            return {
              name: packageJson.name,
              version: packageJson.version,
            }
          } catch {
            // Fallback to app methods if package.json can't be read
            return {
              name: app.getName(),
              version: app.getVersion(),
            }
          }
        }
      ),
    })
  }

  // implement all events
  class RegisterEvent extends AbstractRegisterEvent {
    events = defineEventHandlers<EventContracts>({
      Quit: withEventValidation(voidValidator, (_event, _request) => {
        console.warn(`Quit`)
        app.quit()
      }),
      LogMessage: withEventValidation(logMessageValidator, (_event, v) => {
        if (v.level === 'error') console.error(`[Renderer] ${v.message}`)
        else if (v.level === 'warn') console.warn(`[Renderer] ${v.message}`)
        // eslint-disable-next-line no-console
        else console.log(`[Renderer] ${v.message}`)
      }),
    })
  }

  // implement stream handlers
  class RegisterStreamHandler extends AbstractRegisterStreamHandler {
    handlers = defineStreamInvokeHandlers<StreamInvokeContracts>({
      GetLargeData: withStreamInvokeValidation(
        { request: streamInvokeRequestValidator, data: streamInvokeDataValidator },
        (_event, request) => {
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
        }
      ),
    })
  }

  // implement stream upload handlers (Renderer → Main)
  class RegisterStreamUpload extends AbstractRegisterStreamUpload {
    handlers = defineStreamUploadHandlers<StreamUploadContracts>({
      UploadFile: withStreamUploadValidation(
        { request: uploadRequestValidator, data: uploadDataValidator },
        (request, onData, onEnd, onError) => {
          // eslint-disable-next-line no-console
          console.log(`[Upload] Started receiving file: ${request.fileName}`)

          // Set up the data handler
          onData((chunk) => {
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
            console.error('[Upload] Error:', err)
          })
        }
      ),
    })
  }

  // implement stream download handlers (Main → Renderer)
  class RegisterStreamDownload extends AbstractRegisterStreamDownload {
    handlers = defineStreamDownloadHandlers<StreamDownloadContracts>({
      DownloadLogs: withStreamDownloadValidation(
        { request: downloadLogsRequestValidator, data: downloadLogsDataValidator },
        (request) => {
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
        }
      ),
      StreamVideo: withStreamDownloadValidation(
        { request: streamVideoRequestValidator, data: streamVideoDataValidator },
        (request) => {
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
                console.error('[StreamVideo] Error:', err)
                controller.error(err)
              }
            },
          })
        }
      ),
    })
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
let secondaryWindow: BrowserWindow | null = null

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

  // Register as main window
  getWindowRegistry().register(mainWindow, 'main')

  initializeEventHandler()

  // Load the index.html from dist/renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Example: Send 'About' event to renderer once per 20s
    // Using new broadcast API to send to ALL windows
    const broadcastAll = createBroadcastToAll<BroadcastContracts>()
    setInterval(() => {
      broadcastAll('About')
    }, 20000)

    // Send ping event every second for demo purposes to ALL windows
    let pingCount = 0
    setInterval(() => {
      broadcastAll('Ping', pingCount++)
    }, 1000)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createSecondaryWindow(): void {
  secondaryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Secondary Window',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Register as secondary window
  getWindowRegistry().register(secondaryWindow, 'secondary')

  // Load same content (would typically be different)
  secondaryWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  if (process.env.NODE_ENV === 'development') {
    secondaryWindow.webContents.openDevTools()
  }

  secondaryWindow.on('closed', () => {
    secondaryWindow = null
  })
}

function toggleInspectorWindow() {
  const inspectorWindow = getInspectorWindow()
  if (inspectorWindow) {
    if (inspectorWindow.isVisible()) {
      closeInspector()
    } else {
      inspectorWindow.show()
      inspectorWindow.focus()
    }
    return
  }

  enableIpcInspector({ openOnStart: true })
}

app.whenReady().then(() => {
  enableIpcInspector({ openOnStart: false }) // to ensure capture any early IPC messages
  createWindow()

  // Create application menu with Window Management demo
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Open Secondary Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (!secondaryWindow) {
              createSecondaryWindow()
            } else {
              secondaryWindow.focus()
            }
          },
        },
        {
          label: 'Show Window Registry Info',
          click: () => {
            const registry = getWindowRegistry()
            const windows = registry.getAll()
            const info = windows
              .map(
                (w) =>
                  `ID: ${w.id}, Role: ${w.role}, Created: ${new Date(w.createdAt).toLocaleTimeString()}`
              )
              .join('\n')
            // eslint-disable-next-line no-console
            console.log('Window Registry:\n' + info)
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle IPC Inspector',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: toggleInspectorWindow,
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Alt+I' },
      ],
    },
  ])
  Menu.setApplicationMenu(menu)

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

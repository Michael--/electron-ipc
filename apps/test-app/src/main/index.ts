import {
  BroadcastContracts,
  EventContracts,
  InvokeContracts,
  RendererInvokeContracts,
} from '@gen/ipc-api'
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
import { initRendererInvokeRouter } from '@number10/electron-ipc/renderer-routing'
import { zodAdapter } from '@number10/electron-ipc/validation'
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

const voidValidator = zodAdapter.zodValidator(z.void())
const addNumbersRequestValidator = zodAdapter.zodValidator(
  z.object({ a: z.number(), b: z.number() })
)
const addNumbersResponseValidator = zodAdapter.zodValidator(z.number())
const appInfoResponseValidator = zodAdapter.zodValidator(
  z.object({ name: z.string(), version: z.string() })
)
const openLoggerWindowResponseValidator = zodAdapter.zodValidator(z.boolean())
const logMessageValidator = zodAdapter.zodValidator(
  z.object({ level: z.enum(['info', 'warn', 'error']), message: z.string() })
)

// Validator for ValidateUser demo
const validateUserRequestValidator = zodAdapter.zodValidator(
  z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    age: z.number().min(1, 'Age must be a positive number').max(150, 'Age must be under 150'),
  })
)
const validateUserResponseValidator = zodAdapter.zodValidator(
  z.object({
    valid: z.literal(true),
    data: z.object({
      name: z.string(),
      age: z.number(),
    }),
  })
)

const streamInvokeRequestValidator = zodAdapter.zodValidator(z.object({ id: z.string() }))
const streamInvokeDataValidator = zodAdapter.zodValidator(z.string())

const uploadRequestValidator = zodAdapter.zodValidator(z.object({ fileName: z.string() }))
const uploadDataValidator = zodAdapter.zodValidator(
  z.custom<Uint8Array<ArrayBufferLike>>(
    (value) => value instanceof Uint8Array,
    'Expected Uint8Array'
  )
)

const downloadLogsRequestValidator = zodAdapter.zodValidator(
  z.object({ level: z.enum(['info', 'warn', 'error']).optional() })
)
const downloadLogsDataValidator = zodAdapter.zodValidator(z.string())
const streamVideoRequestValidator = zodAdapter.zodValidator(z.object({ url: z.string().url() }))
const streamVideoDataValidator = zodAdapter.zodValidator(
  z.custom<Uint8Array<ArrayBufferLike>>(
    (value) => value instanceof Uint8Array,
    'Expected Uint8Array'
  )
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
      ValidateUser: withInvokeValidation(
        { request: validateUserRequestValidator, response: validateUserResponseValidator },
        async (_event, userData) => {
          // This handler demonstrates validation error handling
          // The validators will throw IPCValidationError if input is invalid
          return {
            valid: true as const,
            data: userData,
          }
        }
      ),
      OpenLoggerWindow: withInvokeValidation(
        { request: voidValidator, response: openLoggerWindowResponseValidator },
        async (_event, _request) => {
          if (!loggerWindow) {
            createLoggerWindow()
            return true
          } else {
            loggerWindow.focus()
            return true
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

  // Initialize renderer-to-renderer routing
  initRendererInvokeRouter()
}

/**
 * Main process entry point
 */

let mainWindow: BrowserWindow | null = null
let secondaryWindow: BrowserWindow | null = null
let loggerWindow: BrowserWindow | null = null

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
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
    query: { role: 'main' },
  })

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
  secondaryWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
    query: { role: 'secondary' },
  })

  if (process.env.NODE_ENV === 'development') {
    secondaryWindow.webContents.openDevTools()
  }

  secondaryWindow.on('closed', () => {
    secondaryWindow = null
  })
}

function createLoggerWindow(): void {
  loggerWindow = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Logger Window',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Register as logger window
  getWindowRegistry().register(loggerWindow, 'logger')

  // Load same content (would typically be different)
  loggerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
    query: { role: 'logger' },
  })

  if (process.env.NODE_ENV === 'development') {
    loggerWindow.webContents.openDevTools()
  }

  loggerWindow.on('closed', () => {
    loggerWindow = null
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
          label: 'Open Logger Window',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            if (!loggerWindow) {
              createLoggerWindow()
            } else {
              loggerWindow.focus()
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

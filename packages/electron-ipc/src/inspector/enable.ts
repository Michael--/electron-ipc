import type { IpcMainEvent } from 'electron'
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import type {
  InspectorCommand,
  InspectorCommandPayload,
  InspectorHelloPayload,
} from './inspector-contracts'
import { getInspectorServer } from './server'
import { setTraceSink } from './trace'
import type { InspectorOptions } from './types'
import { DEFAULT_INSPECTOR_OPTIONS } from './types'

/**
 * Inspector window instance
 */
let inspectorWindow: BrowserWindow | null = null

/**
 * Enables the IPC Inspector
 *
 * This function:
 * - Creates the inspector window (if openOnStart is true)
 * - Registers IPC handlers for inspector communication
 * - Sets up the trace sink to feed events to the inspector server
 * - Registers with the window registry (if available)
 *
 * @param options - Inspector configuration options
 * @returns The inspector window (if created), or null
 */
export function enableIpcInspector(options: InspectorOptions = {}): BrowserWindow | null {
  const config = { ...DEFAULT_INSPECTOR_OPTIONS, ...options }

  // eslint-disable-next-line no-console
  console.log('[Inspector] enableIpcInspector called with options:', options)
  // eslint-disable-next-line no-console
  console.log('[Inspector] merged config:', config)

  // Only enable in development by default
  if (!config.enabled) {
    // eslint-disable-next-line no-console
    console.log('[Inspector] Disabled - config.enabled is false')
    return null
  }

  // Get or create inspector server
  const server = getInspectorServer(config)

  // Set up trace sink to feed events to server
  setTraceSink((event) => {
    server.push(event)
  })

  // Register IPC handlers
  registerIpcHandlers(server)

  // Create inspector window if requested
  if (config.openOnStart) {
    // eslint-disable-next-line no-console
    console.log('[Inspector] Creating inspector window...')
    inspectorWindow = createInspectorWindow(config)
    return inspectorWindow
  }

  // eslint-disable-next-line no-console
  console.log('[Inspector] openOnStart is false, not creating window')

  // Register keyboard shortcut to open inspector
  if (config.shortcut) {
    registerShortcut(config.shortcut, config)
  }

  return null
}

/**
 * Creates the inspector window
 *
 * @param _options - Inspector options (currently unused)
 * @returns The created inspector window
 */
function createInspectorWindow(_options: Required<InspectorOptions>): BrowserWindow {
  // eslint-disable-next-line no-console
  console.log('[Inspector] createInspectorWindow called')

  // If window already exists and is not destroyed, focus it
  if (inspectorWindow && !inspectorWindow.isDestroyed()) {
    // eslint-disable-next-line no-console
    console.log('[Inspector] Window already exists, focusing')
    inspectorWindow.focus()
    return inspectorWindow
  }

  // eslint-disable-next-line no-console
  console.log('[Inspector] Creating new BrowserWindow...')

  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'IPC Inspector',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Need access to Node APIs in preload
      preload: join(__dirname, 'ui', 'preload.js'),
    },
  })

  // eslint-disable-next-line no-console
  console.log('[Inspector] BrowserWindow created')

  // Enable DevTools for the inspector itself
  window.webContents.openDevTools({ mode: 'detach' })

  // Register with window manager if available
  try {
    // Dynamic import to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getWindowRegistry } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../window-manager/registry') as typeof import('../window-manager/registry')
    getWindowRegistry().register(window, 'inspector')
    // eslint-disable-next-line no-console
    console.log('[Inspector] Registered with window manager')
  } catch {
    // eslint-disable-next-line no-console
    console.log('[Inspector] Window manager not available')
    // Window manager not available, continue without it
  }

  // Subscribe to inspector server
  const server = getInspectorServer()
  server.subscribe(window)
  // eslint-disable-next-line no-console
  console.log('[Inspector] Subscribed to server')

  // Load inspector UI
  const uiPath = join(__dirname, 'ui', 'index.html')
  // eslint-disable-next-line no-console
  console.log('[Inspector] Loading UI from:', uiPath)
  window.loadFile(uiPath)

  // Clean up on close
  window.on('closed', () => {
    // eslint-disable-next-line no-console
    console.log('[Inspector] Window closed')
    inspectorWindow = null
  })

  inspectorWindow = window
  return window
}

/**
 * Registers IPC handlers for inspector communication
 *
 * @param server - The inspector server instance
 */
function registerIpcHandlers(server: ReturnType<typeof getInspectorServer>): void {
  // HELLO: Inspector UI connects
  ipcMain.on('INSPECTOR:HELLO', (event: IpcMainEvent, payload: InspectorHelloPayload) => {
    // eslint-disable-next-line no-console
    console.log('[Inspector] UI connected:', payload)

    // Send initial snapshot now that renderer is ready
    const subscriber = server.getSubscriber(event.sender)
    if (subscriber) {
      // eslint-disable-next-line no-console
      console.log('[Inspector] Sending INIT to BrowserWindow', subscriber.window.id)
      server.sendInit(subscriber)
    } else {
      // eslint-disable-next-line no-console
      console.error('[Inspector] No subscriber found for webContents', event.sender.id)
    }
  })

  // COMMAND: Inspector UI sends commands
  ipcMain.on('INSPECTOR:COMMAND', (event: IpcMainEvent, payload: InspectorCommandPayload) => {
    const { command } = payload

    try {
      const result = handleCommand(server, command)

      // Send response
      event.sender.send('INSPECTOR:COMMAND_RESPONSE', {
        success: true,
        data: result,
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Inspector] Command failed:', error)

      event.sender.send('INSPECTOR:COMMAND_RESPONSE', {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}

/**
 * Handles inspector commands
 *
 * @param server - Inspector server
 * @param command - Command to execute
 * @returns Command result
 */
function handleCommand(
  server: ReturnType<typeof getInspectorServer>,
  command: InspectorCommand
): unknown {
  switch (command.type) {
    case 'clear':
      server.clear()
      return { cleared: true }

    case 'pause':
      server.pause()
      return { paused: true }

    case 'resume':
      server.resume()
      return { resumed: true }

    case 'setPayloadMode':
      server.setPayloadMode(command.mode)
      return { mode: command.mode }

    case 'export':
      if (command.format === 'json') {
        return { data: server.exportJson() }
      }
      throw new Error(`Unsupported export format: ${command.format}`)

    default:
      throw new Error(`Unknown command: ${(command as InspectorCommand).type}`)
  }
}

/**
 * Registers keyboard shortcut to open inspector
 *
 * @param shortcut - Keyboard shortcut (Electron accelerator format)
 * @param _config - Inspector configuration (currently unused in body)
 */
function registerShortcut(shortcut: string, _config: Required<InspectorOptions>): void {
  // Note: globalShortcut requires app to be ready
  app.whenReady().then(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { globalShortcut } = require('electron') as typeof import('electron')

      globalShortcut.register(shortcut, () => {
        if (!inspectorWindow || inspectorWindow.isDestroyed()) {
          inspectorWindow = createInspectorWindow(_config)
        } else {
          inspectorWindow.focus()
        }
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Inspector] Failed to register shortcut:', error)
    }
  })
}

/**
 * Gets the inspector window if it exists
 */
export function getInspectorWindow(): BrowserWindow | null {
  return inspectorWindow && !inspectorWindow.isDestroyed() ? inspectorWindow : null
}

/**
 * Closes the inspector window
 */
export function closeInspector(): void {
  if (inspectorWindow && !inspectorWindow.isDestroyed()) {
    inspectorWindow.close()
  }
  inspectorWindow = null
}

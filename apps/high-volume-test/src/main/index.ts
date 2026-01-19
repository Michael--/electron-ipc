/**
 * High-Volume Test App - Main Process
 *
 * Generates configurable high-volume IPC events for Inspector testing
 */

import {
  closeInspector,
  enableIpcInspector,
  getInspectorWindow,
} from '@number10/electron-ipc/inspector'
import { getWindowRegistry } from '@number10/electron-ipc/window-manager'
import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
const inspectorOptions = {
  enabled: true,
  maxEvents: 10000,
  payloadMode: 'redacted',
} as const

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'High-Volume Inspector Test',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Register window with window manager
  getWindowRegistry().register(mainWindow, 'main')

  // Load the app
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function openInspectorWindow() {
  enableIpcInspector({
    ...inspectorOptions,
    openOnStart: true,
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

  openInspectorWindow()
}

function setupMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
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
}

/**
 * Initialize app
 */
app.whenReady().then(() => {
  // Enable Inspector with higher limits
  openInspectorWindow()

  // Setup IPC handlers
  setupIpcHandlers()

  createWindow()
  setupMenu()

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

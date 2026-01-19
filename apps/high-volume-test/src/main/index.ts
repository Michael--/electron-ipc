/**
 * High-Volume Test App - Main Process
 *
 * Generates configurable high-volume IPC events for Inspector testing
 */

import { enableIpcInspector } from '@number10/electron-ipc/inspector'
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null

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

  // Load the app
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Initialize app
 */
app.whenReady().then(() => {
  // Enable Inspector with higher limits
  enableIpcInspector({
    enabled: true,
    openOnStart: true,
    maxEvents: 10000, // Higher limit for testing
    payloadMode: 'redacted',
  })

  // Setup IPC handlers
  setupIpcHandlers()

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

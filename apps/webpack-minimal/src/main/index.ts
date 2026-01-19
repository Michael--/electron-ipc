/* eslint-disable no-console */
import {
  AbstractRegisterHandler,
  createBroadcast,
  defineInvokeHandlers,
} from '@number10/electron-ipc'
import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import type { EventContracts, InvokeContracts } from './ipc-api'

/**
 * Main window instance
 */
let mainWindow: BrowserWindow | null = null

/**
 * Create typed broadcast sender
 */
const broadcast = createBroadcast<EventContracts>()

/**
 * Register IPC handlers using electron-ipc
 */
class RegisterHandler extends AbstractRegisterHandler {
  handlers = defineInvokeHandlers<InvokeContracts>({
    ping: async (_event, request) => {
      console.log('📨 Received ping:', request.message)
      return {
        reply: `Pong! You said: "${request.message}"`,
        timestamp: Date.now(),
      }
    },
    getData: async (_event, request) => {
      console.log('📊 Get data request for ID:', request.id)

      // Simulate some processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      return {
        id: request.id,
        data: `Data for ID ${request.id}: ${Math.random().toString(36).substring(7)}`,
        processed: true,
      }
    },
    triggerNotification: async (_event, request) => {
      console.log('🔔 Notification scheduled with delay:', request.delay)

      if (!mainWindow) {
        console.error('❌ No main window available')
        return { scheduled: false }
      }

      // Send notification after delay using typed broadcast
      setTimeout(() => {
        if (mainWindow) {
          broadcast('notification', mainWindow, {
            title: 'Scheduled Notification',
            message: `This notification was triggered ${request.delay}ms ago!`,
            level: 'success',
          })
          console.log('✅ Notification sent to renderer')
        }
      }, request.delay)

      return { scheduled: true }
    },
  })
}

/**
 * Initialize IPC handlers
 */
function registerHandlers(): void {
  RegisterHandler.register()
  console.log('✅ IPC handlers registered')
}

/**
 * Creates the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  console.log('✅ Main window created')
}

/**
 * App ready event
 */
app.whenReady().then(() => {
  registerHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

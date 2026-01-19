import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import type { EventContracts, InvokeContracts } from './ipc-api.js'

/**
 * Main window instance
 */
let mainWindow: BrowserWindow | null = null

/**
 * Register IPC handlers
 */
function registerHandlers(): void {
  // Ping handler
  ipcMain.handle('ping', async (_event, request: InvokeContracts['ping']['request']) => {
    console.log('📨 Received ping:', request.message)
    const response: InvokeContracts['ping']['response'] = {
      reply: `Pong! You said: "${request.message}"`,
      timestamp: Date.now(),
    }
    return response
  })

  // Get data handler
  ipcMain.handle('getData', async (_event, request: InvokeContracts['getData']['request']) => {
    console.log('📊 Get data request for ID:', request.id)

    // Simulate some processing
    await new Promise((resolve) => setTimeout(resolve, 100))

    const response: InvokeContracts['getData']['response'] = {
      id: request.id,
      data: `Data for ID ${request.id}: ${Math.random().toString(36).substring(7)}`,
      processed: true,
    }
    return response
  })

  // Trigger notification handler
  ipcMain.handle(
    'triggerNotification',
    async (_event, request: InvokeContracts['triggerNotification']['request']) => {
      console.log('🔔 Notification scheduled with delay:', request.delay)

      if (!mainWindow) {
        console.error('❌ No main window available')
        return { scheduled: false }
      }

      // Send notification after delay
      setTimeout(() => {
        if (mainWindow) {
          const payload: EventContracts['notification']['payload'] = {
            title: 'Scheduled Notification',
            message: `This notification was triggered ${request.delay}ms ago!`,
            level: 'success',
          }
          mainWindow.webContents.send('notification', payload)
          console.log('✅ Notification sent to renderer')
        }
      }, request.delay)

      const response: InvokeContracts['triggerNotification']['response'] = {
        scheduled: true,
      }
      return response
    }
  )

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

import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { mainBroadcast } from './ipc-api'

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

  // Load the index.html from dist/renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Example: Send 'About' event to renderer after load
    if (mainWindow) {
      mainBroadcast('About', mainWindow, undefined)
    }

    // send ping event every second for demo purposes
    let pingCount = 0
    setInterval(() => {
      if (mainWindow) {
        mainBroadcast('Ping', mainWindow, pingCount++)
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

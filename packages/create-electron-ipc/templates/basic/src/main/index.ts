import type { BroadcastContracts, EventContracts, InvokeContracts } from '@gen/ipc-api'
import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  defineEventHandlers,
  defineInvokeHandlers,
__VALIDATION_HELPER_IMPORTS__
} from '@number10/electron-ipc'
import {
  enableIpcInspector,
  getInspectorWindow,
} from '@number10/electron-ipc/inspector'
import { createBroadcastToAll, getWindowRegistry } from '@number10/electron-ipc/window-manager'
import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
__VALIDATION_LIBRARY_IMPORTS__

// Prevent Electron warning about unsupported NODE_OPTIONS.
delete process.env.NODE_OPTIONS

// Suppress harmless Autofill DevTools protocol warnings
process.on('warning', (warning) => {
  if (warning.message?.includes('Autofill')) {
    return
  }
  console.warn(warning)
})

const inspectorEnabled = __INSPECTOR_ENABLED__

__VALIDATION_HANDLERS__

class RegisterHandler extends AbstractRegisterHandler {
  handlers = defineInvokeHandlers<InvokeContracts>({
    Add: addHandler,
  })
}

class RegisterEvent extends AbstractRegisterEvent {
  events = defineEventHandlers<EventContracts>({
    Quit: quitHandler,
  })
}

let mainWindow: BrowserWindow | null = null

function toggleInspectorWindow(): void {
  const inspectorWindow = getInspectorWindow()
  if (inspectorWindow) {
    if (inspectorWindow.isVisible()) {
      inspectorWindow.hide()
    } else {
      inspectorWindow.show()
      inspectorWindow.focus()
    }
  } else {
    enableIpcInspector({ openOnStart: true })
  }
}

function buildMenu(): void {
  const broadcastAll = createBroadcastToAll<BroadcastContracts>()
  const appMenu: Electron.MenuItemConstructorOptions = {
    label: '__PRODUCT_NAME__',
    submenu: [
      {
        label: 'About',
        click: () => {
          broadcastAll('About')
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        },
      },
    ],
  }

  const viewMenu: Electron.MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
    ],
  }

  if (inspectorEnabled) {
    const appSubmenu = appMenu.submenu as Electron.MenuItemConstructorOptions[]
    appSubmenu.splice(1, 0, {
      label: 'Toggle IPC Inspector',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: toggleInspectorWindow,
    })
    const viewSubmenu = viewMenu.submenu as Electron.MenuItemConstructorOptions[]
    viewSubmenu.unshift({
      label: 'Toggle IPC Inspector',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: toggleInspectorWindow,
    })
    viewSubmenu.splice(1, 0, { type: 'separator' })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate([appMenu, viewMenu]))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    title: '__PRODUCT_NAME__',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  getWindowRegistry().register(mainWindow, 'main')

  RegisterHandler.register()
  RegisterEvent.register()

  const devServerUrl = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  buildMenu()
}

void app.whenReady().then(() => {
  if (inspectorEnabled) {
    enableIpcInspector({ openOnStart: false })
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

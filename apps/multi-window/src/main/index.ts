import type { BroadcastContracts, EventContracts, InvokeContracts } from '@gen/ipc-api'
import {
  AbstractRegisterEvent,
  AbstractRegisterHandler,
  defineEventHandlers,
  defineInvokeHandlers,
} from '@number10/electron-ipc'
import {
  closeInspector,
  enableIpcInspector,
  getInspectorWindow,
} from '@number10/electron-ipc/inspector'
import { initRendererInvokeRouter } from '@number10/electron-ipc/renderer-routing'
import {
  broadcastToApp,
  createBroadcastToRole,
  getWindowRegistry,
} from '@number10/electron-ipc/window-manager'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'path'

// Prevent Electron warning about unsupported NODE_OPTIONS.
delete process.env.NODE_OPTIONS

let handlersInitialized = false
let secondaryCount = 0

const broadcastAll = broadcastToApp<BroadcastContracts>()

function getWindowInfoFromEvent(event: IpcMainEvent | IpcMainInvokeEvent) {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) {
    return {
      id: -1,
      role: 'unknown',
      title: 'Unknown Window',
      webContentsId: event.sender.id,
    }
  }

  const meta = getWindowRegistry().getById(window.id)

  return {
    id: window.id,
    role: meta?.role ?? 'unknown',
    title: window.getTitle(),
    webContentsId: window.webContents.id,
  }
}

function getWindowList() {
  return getWindowRegistry()
    .getAll()
    .map((meta) => ({
      id: meta.id,
      role: meta.role,
      title: meta.window.getTitle(),
      webContentsId: meta.window.webContents.id,
    }))
}

function enableInspectorBackend() {
  enableIpcInspector({ openOnStart: false, shortcut: undefined })
}

function openInspectorWindow() {
  enableIpcInspector({ openOnStart: true })
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

function initializeHandlers() {
  if (handlersInitialized) return
  handlersInitialized = true

  class RegisterHandler extends AbstractRegisterHandler {
    handlers = defineInvokeHandlers<InvokeContracts>({
      GetWindowInfo: async (event) => getWindowInfoFromEvent(event),
      GetAllWindows: async () => getWindowList(),
    })
  }

  class RegisterEvent extends AbstractRegisterEvent {
    events = defineEventHandlers<EventContracts>({
      BroadcastToAll: (event, payload) => {
        const sender = getWindowInfoFromEvent(event)
        broadcastAll('Announcement', {
          fromRole: sender.role,
          fromId: sender.id,
          target: 'all',
          message: payload.message,
        })
      },
      BroadcastToRole: (event, payload) => {
        const sender = getWindowInfoFromEvent(event)
        const broadcastToRole = createBroadcastToRole<BroadcastContracts>(payload.role)
        broadcastToRole('Announcement', {
          fromRole: sender.role,
          fromId: sender.id,
          target: 'role',
          message: payload.message,
        })
      },
      LogMessage: (event, payload) => {
        const sender = getWindowInfoFromEvent(event)
        const prefix = `[${sender.role} #${sender.id}]`
        if (payload.level === 'error') console.error(prefix, payload.message)
        else if (payload.level === 'warn') console.warn(prefix, payload.message)
        // eslint-disable-next-line no-console
        else console.log(prefix, payload.message)
      },
      RequestWindowList: () => {
        broadcastAll('WindowList', { windows: getWindowList() })
      },
    })
  }

  // Initialize renderer-to-renderer routing
  initRendererInvokeRouter()

  RegisterHandler.register()
  RegisterEvent.register()
}

function createAppWindow(role: 'main' | 'secondary' | 'logger'): BrowserWindow {
  const index = role === 'secondary' ? ++secondaryCount : 0
  const title =
    role === 'main' ? 'Multi-Window Main' : role === 'logger' ? 'Logger' : `Secondary ${index}`

  const window = new BrowserWindow({
    width: role === 'main' ? 1200 : role === 'logger' ? 800 : 900,
    height: role === 'main' ? 860 : role === 'logger' ? 600 : 700,
    title,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  getWindowRegistry().register(window, role)

  window.loadFile(join(__dirname, '../renderer/index.html'), {
    query: {
      role,
      index: String(index),
    },
  })

  if (process.env.NODE_ENV === 'development') {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  return window
}

function setupMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New Secondary Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createAppWindow('secondary'),
        },
        {
          label: 'New Logger Window',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => createAppWindow('logger'),
        },
        { type: 'separator' },
        { role: 'quit' },
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
}

app.whenReady().then(() => {
  initializeHandlers()
  enableInspectorBackend()

  createAppWindow('main')
  createAppWindow('secondary')
  createAppWindow('logger')

  openInspectorWindow()
  setupMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow('main')
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

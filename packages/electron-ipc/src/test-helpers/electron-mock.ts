import { vi } from 'vitest'
import type { Mock } from 'vitest'

type DeepPartial<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]?: T[K] extends (...args: any[]) => any
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const mergeMock = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key]
    if (isPlainObject(current) && isPlainObject(value)) {
      mergeMock(current, value)
    } else {
      target[key] = value
    }
  }
}

export const ipcMainMock: {
  handle: Mock
  removeHandler: Mock
  on: Mock
  removeListener: Mock
} = {
  handle: vi.fn(),
  removeHandler: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

export const browserWindowMock: {
  fromWebContents: Mock
} = {
  fromWebContents: vi.fn(),
}

export const ipcRendererMock: {
  send: Mock
  invoke: Mock
  on: Mock
} = {
  send: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
}

export const contextBridgeMock: {
  exposeInMainWorld: Mock
} = {
  exposeInMainWorld: vi.fn(),
}

type ElectronMockBase = {
  ipcMain: typeof ipcMainMock
  BrowserWindow: typeof browserWindowMock
  ipcRenderer: typeof ipcRendererMock
  contextBridge: typeof contextBridgeMock
}

export const electronMock: ElectronMockBase & Record<string, unknown> = {
  ipcMain: ipcMainMock,
  BrowserWindow: browserWindowMock,
  ipcRenderer: ipcRendererMock,
  contextBridge: contextBridgeMock,
}

vi.mock('electron', () => electronMock)

export const extendElectronMock = <
  T extends DeepPartial<ElectronMockBase> & Record<string, unknown>,
>(
  extension: T
) => {
  mergeMock(electronMock, extension)
  return electronMock as ElectronMockBase & T
}

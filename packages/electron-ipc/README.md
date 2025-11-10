# electron-ipc

<p align="center">
  <img src="./assets/logo-light.svg" width="200" alt="Electron IPC Logo">
</p>

TypeScript code generator for type-safe Electron IPC communication.

## Overview

This library provides a code generation approach to create type-safe IPC communication between Electron's main and renderer processes.

## Installation

```bash
npm install electron-ipc
```

## Quick Start

Here's a minimal example to get you started:

```typescript
// 1. Define contracts (ipc-api.ts)
import { GenericInvokeContract, GenericRendererEventContract } from 'electron-ipc'

export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>

export type EventContracts = GenericRendererEventContract<{
  LogMessage: IRendererEventContract<string>
}>
```

```bash
# 2. Generate API
npx electron-ipc-generate \
  --input=./src/main/ipc-api.ts \
  --output=./src/preload/api.ts \
  --invoke=InvokeContracts \
  --event=EventContracts \
  --api-name=myApi
```

```typescript
// 3. Use in renderer
const result = await window.myApi.invokeAddNumbers({ a: 1, b: 2 })
window.myApi.sendLogMessage('Hello from renderer!')
```

```typescript
// 4. Handle in main process
import {
  AbstractRegisterHandler,
  AbstractRegisterEvent,
  IPCHandlerType,
  IPCEventType,
} from 'electron-ipc'
import { InvokeContracts, EventContracts } from './ipc-api'

class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, params) => params.a + params.b,
  }
}

class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    LogMessage: (_event, message) => console.log(message),
  }
}

RegisterHandler.register()
RegisterEvent.register()
```

## Communication Patterns

electron-ipc supports four main communication patterns:

### 1. Define IPC Contracts

Create a TypeScript file defining your IPC contracts (e.g., `src/main/ipc-api.ts`):

```typescript
import {
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericBroadcastContract,
  GenericStreamInvokeContract,
  GenericStreamUploadContract,
  GenericStreamDownloadContract,
} from '@number10/electron-ipc'

export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
  GetAppInfo: IInvokeContract<void, { name: string; version: string }>
}>

export type EventContracts = GenericRendererEventContract<{
  Quit: IRendererEventContract<void>
  LogMessage: IRendererEventContract<{ level: 'info' | 'warn' | 'error'; message: string }>
}>

export type BroadcastContracts = GenericBroadcastContract<{
  Ping: IBroadcastContract<number>
  About: IBroadcastContract<void>
}>

export type StreamInvokeContracts = GenericStreamInvokeContract<{
  GetLargeData: IStreamInvokeContract<{ offset: number }, string>
}>

export type StreamUploadContracts = GenericStreamUploadContract<{
  UploadFile: IStreamUploadContract<{ filename: string }, Uint8Array>
}>

export type StreamDownloadContracts = GenericStreamDownloadContract<{
  DownloadLogs: IStreamDownloadContract<{ since: Date }, string>
}>
```

### 2. Generate API Code

Run the generator to create type-safe IPC functions:

```bash
npx electron-ipc-generate \
  --input=./src/main/ipc-api.ts \
  --output=./src/preload/api-generated.ts \
  --invoke=InvokeContracts \
  --event=EventContracts \
  --send=BroadcastContracts \
  --stream-invoke=StreamInvokeContracts \
  --stream-upload=StreamUploadContracts \
  --stream-download=StreamDownloadContracts \
  --main-broadcast-output=./src/main/broadcast-generated.ts \
  --api-name=myApi
```

### 3. Setup Preload Script

In your preload script (e.g., `src/preload/index.ts`), expose the generated API to the renderer process:

```typescript
import { exposeMyApi, MyApiType } from './api-generated'

declare global {
  interface Window {
    myApi: MyApiType
  }
}

exposeMyApi()
```

The `exposeMyApi()` function uses Electron's `contextBridge` to securely expose the type-safe API to the renderer process. The `MyApiType` provides full TypeScript IntelliSense for `window.myApi`.

### 4. Use in Renderer

The API is now available in the renderer process with full type safety:

````typescript
```typescript
// Invoke methods (request-response)
const result = await window.myApi.invokeAddNumbers({ a: 1, b: 2 })

// Send events (fire-and-forget)
window.myApi.sendLogMessage({ level: 'info', message: 'Hello!' })

// Listen to broadcasts
window.myApi.onPing((count) => console.log('Ping:', count))

// Stream invoke (request with streaming response)
const stream = await window.myApi.invokeStreamGetLargeData({ offset: 0 })
const reader = stream.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log('Received:', value)
````

// Stream upload (upload data to main)
const uploadStream = window.myApi.uploadStreamUploadFile({ filename: 'data.txt' })
const writer = uploadStream.getWriter()
await writer.write(new Uint8Array([1, 2, 3, 4, 5]))
await writer.close()

// Stream download (receive stream from main)
const downloadStream = window.myApi.downloadStreamDownloadLogs({ since: new Date() })
const downloadReader = downloadStream.getReader()
while (true) {
const { done, value } = await downloadReader.read()
if (done) break
console.log('Log:', value)
}

````

### 5. Handle in Main Process

Implement handlers for invoke contracts, events, and streams in your main process (e.g., `src/main/index.ts`):

```typescript
import {
  AbstractRegisterHandler,
  AbstractRegisterEvent,
  AbstractRegisterStreamHandler,
  AbstractRegisterStreamUpload,
  AbstractRegisterStreamDownload,
  IPCHandlerType,
  IPCEventType,
} from '@number10/electron-ipc'
import {
  InvokeContracts,
  EventContracts,
  StreamInvokeContracts,
  StreamUploadContracts,
  StreamDownloadContracts,
} from './ipc-api'

// Implement invoke handlers (request-response)
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, params) => {
      return params.a + params.b
    },
    GetAppInfo: async () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
      }
    },
  }
}

// Implement event handlers (renderer → main)
class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    Quit: () => {
      app.quit()
    },
    LogMessage: (_event, payload) => {
      if (payload.level === 'error') console.error(payload.message)
      else if (payload.level === 'warn') console.warn(payload.message)
      else console.log(payload.message)
    },
  }
}

// Implement stream invoke handlers (request with streaming response)
class RegisterStreamHandler extends AbstractRegisterStreamHandler {
  handlers: IPCStreamHandlerType<StreamInvokeContracts> = {
    GetLargeData: async (_event, { offset }) => {
      // Return a ReadableStream
      return createReadableStreamFromLargeData(offset)
    },
  }
}

// Implement stream upload handlers (renderer → main)
class RegisterStreamUpload extends AbstractRegisterStreamUpload {
  handlers: IPCStreamUploadHandlerType<StreamUploadContracts> = {
    UploadFile: async (_event, { filename }, stream) => {
      // Handle the uploaded stream
      const reader = stream.getReader()
      const chunks = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      // Process uploaded data...
    },
  }
}

// Implement stream download handlers (main → renderer)
class RegisterStreamDownload extends AbstractRegisterStreamDownload {
  handlers: IPCStreamDownloadHandlerType<StreamDownloadContracts> = {
    DownloadLogs: async (_event, { since }) => {
      // Return a ReadableStream for logs
      return createLogStream(since)
    },
  }
}

// Register all handlers and events
RegisterHandler.register()
RegisterEvent.register()
RegisterStreamHandler.register()
RegisterStreamUpload.register()
RegisterStreamDownload.register()
````

**Sending broadcasts from main to renderer:**

Use the generated broadcast API to send events to the renderer process:

```typescript
import { mainBroadcast } from './broadcast-generated'

// Send broadcasts to specific window
mainBroadcast.Ping(mainWindow, 42)
mainBroadcast.About(mainWindow)
```

The generated `mainBroadcast` object provides type-safe methods for each broadcast contract. Each method takes the target `BrowserWindow` as the first parameter, followed by the payload (if any).

## Features

✅ **Full Type Safety** - Compile-time validation across all IPC communication  
✅ **Auto-Generated API** - No manual IPC boilerplate code required  
✅ **IntelliSense Support** - Auto-completion in all processes (main, preload, renderer)  
✅ **Four Communication Patterns** - Invoke (request-response), Events (fire-and-forget), Broadcasts (main → renderer), Streams (large data/real-time)  
✅ **Context Bridge Integration** - Secure IPC through Electron's `contextBridge`  
✅ **TypeScript Strict Mode** - Designed for maximum type safety

## CLI Options

The generator supports the following command-line options:

- `--input=<path>` - Path to file containing IPC contract definitions
- `--output=<path>` - Path where generated preload API code will be written
- `--invoke=<name>` - Type name for invoke contracts (request-response)
- `--event=<name>` - Type name for event contracts (renderer → main)
- `--send=<name>` - Type name for broadcast contracts (main → renderer)
- `--stream-invoke=<name>` - Type name for stream invoke contracts (request-response with streaming)
- `--stream-upload=<name>` - Type name for stream upload contracts (renderer → main)
- `--stream-download=<name>` - Type name for stream download contracts (main → renderer)
- `--main-broadcast-output=<path>` - Path where main process broadcast API will be generated

At least one contract type must be specified.

## Documentation

For detailed documentation, architecture, and advanced usage, see:

- [📚 Complete Documentation](https://github.com/Michael--/electron-ipc/tree/main/docs) - Comprehensive guide with examples and best practices
- [🏗️ Architecture Guide](https://github.com/Michael--/electron-ipc/blob/main/docs/ARCHITECTURE.md) - Technical details about the code generator design

## Assets

This package includes logo assets for branding and documentation:

- `assets/logo-light.svg` - Light theme logo (transparent background)
- `assets/logo-dark.svg` - Dark theme logo (dark background)

Both logos are available in SVG format and can be used in documentation, websites, or any other branding materials.

## License

MIT

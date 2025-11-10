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

## Usage

### 1. Define IPC Contracts

Create a TypeScript file defining your IPC contracts (e.g., `src/main/ipc-api.ts`):

```typescript
import {
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericBroadcastContract,
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
  --main-broadcast-output=./src/main/broadcast-generated.ts
```

### 3. Setup Preload Script

In your preload script (e.g., `src/preload/index.ts`), expose the generated API to the renderer process:

```typescript
import { ApiType, exposeApi } from './api-generated'

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()
```

The `exposeApi()` function uses Electron's `contextBridge` to securely expose the type-safe API to the renderer process. The `ApiType` provides full TypeScript IntelliSense for `window.api`.

### 4. Use in Renderer

The API is now available in the renderer process with full type safety:

```typescript
// Invoke methods (request-response)
const result = await window.api.invokeAddNumbers({ a: 1, b: 2 })

// Send events (fire-and-forget)
window.api.sendLogMessage({ level: 'info', message: 'Hello!' })

// Listen to broadcasts
window.api.onPing((count) => console.log('Ping:', count))
```

### 5. Handle in Main Process

Implement handlers for invoke contracts and events in your main process (e.g., `src/main/index.ts`):

```typescript
import {
  AbstractRegisterHandler,
  AbstractRegisterEvent,
  IPCHandlerType,
  IPCEventType,
} from '@number10/electron-ipc'
import { InvokeContracts, EventContracts } from './ipc-api'

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

// Register all handlers and events
RegisterHandler.register()
RegisterEvent.register()
```

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
✅ **Three Communication Patterns** - Invoke (request-response), Events (fire-and-forget), Broadcasts (main → renderer)  
✅ **Context Bridge Integration** - Secure IPC through Electron's `contextBridge`  
✅ **TypeScript Strict Mode** - Designed for maximum type safety

## CLI Options

The generator supports the following command-line options:

- `--input=<path>` - Path to file containing IPC contract definitions
- `--output=<path>` - Path where generated preload API code will be written
- `--invoke=<name>` - Type name for invoke contracts (request-response)
- `--event=<name>` - Type name for event contracts (renderer → main)
- `--send=<name>` - Type name for broadcast contracts (main → renderer)
- `--main-broadcast-output=<path>` - Path where main process broadcast API will be generated

At least one contract type (`--invoke`, `--event`, or `--send`) must be specified.

## Documentation

For detailed documentation, architecture, and advanced usage, see:

- [Project Documentation](https://github.com/Michael--/electron-ipc/tree/main/docs)
- [Architecture Guide](https://github.com/Michael--/electron-ipc/blob/main/docs/ARCHITECTURE.md)

## Assets

This package includes logo assets for branding and documentation:

- `assets/logo-light.svg` - Light theme logo (transparent background)
- `assets/logo-dark.svg` - Dark theme logo (dark background)

Both logos are available in SVG format and can be used in documentation, websites, or any other branding materials.

## License

MIT

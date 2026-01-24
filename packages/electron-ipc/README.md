# @number10/electron-ipc

<p align="center">
  <img src="./assets/logo-light.svg" width="200" alt="Electron IPC Logo">
</p>

TypeScript code generator for type-safe Electron IPC communication with streaming support.

[![npm version](https://img.shields.io/npm/v/@number10/electron-ipc.svg)](https://www.npmjs.com/package/@number10/electron-ipc)
[![npm downloads](https://img.shields.io/npm/dm/@number10/electron-ipc.svg)](https://www.npmjs.com/package/@number10/electron-ipc)
[![node version](https://img.shields.io/node/v/@number10/electron-ipc.svg)](https://www.npmjs.com/package/@number10/electron-ipc)
[![electron version](https://img.shields.io/badge/electron-%3E%3D28-9FEAF9)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Docs: **[Full Documentation](https://michael--.github.io/electron-ipc/)** | [npm](https://www.npmjs.com/package/@number10/electron-ipc) | [GitHub](https://github.com/Michael--/electron-ipc) | [Changelog](../../CHANGELOG.md)

## Why it helps

- Define contracts once and generate main/preload/renderer APIs (plus React hooks).
- Change a signature and TypeScript flags every mismatch immediately.
- Keep large data flows safe with stream contracts.
- Add runtime validation with modern adapters (Zod 4.x/Valibot).

## 🚀 Quick Start

### New Project (Recommended)

Scaffold a complete Electron app with IPC contracts pre-configured:

```bash
# macOS/Linux
npm create @number10/electron-ipc

# Windows (use npx with forward-slash /)
npx @number10/create-electron-ipc

# pnpm (all platforms, use forward-slash /)
pnpm dlx @number10/create-electron-ipc
```

> **Windows Note:** Always use forward-slash `/` in the package name, not backslash `\`.

This gives you:

- ✅ Electron + Vite + React + TypeScript
- ✅ IPC contracts ready to use
- ✅ ESLint + Prettier configured
- ✅ Optional IPC Inspector
- ✅ Optional validation (Zod/Valibot)

### Existing Project

## Manual Setup (60 seconds)

```bash
npm install @number10/electron-ipc
```

```typescript
// 1. Define contracts (src/main/ipc-api.ts)
import { GenericInvokeContract, GenericRendererEventContract } from '@number10/electron-ipc'

export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>

export type EventContracts = GenericRendererEventContract<{
  LogMessage: IRendererEventContract<string>
}>
```

```yaml
# 2. Create configuration file (ipc-config.yaml)
apis:
  - name: myApi
    input: ./src/main/ipc-api.ts
    output: ./src/preload/api-generated.ts
    reactHooksOutput: ./src/preload/api-hooks.ts # Optional
    contracts:
      invoke: InvokeContracts
      event: EventContracts
```

```bash
# 3. Generate API
npx electron-ipc-generate --config=./ipc-config.yaml
```

```typescript
// 4. Expose in preload (src/preload/index.ts)
import { exposeMyApi, MyApiType } from './api-generated'

declare global {
  interface Window {
    myApi: MyApiType
  }
}

exposeMyApi()
```

```typescript
// 5. Use in renderer
const result = await window.myApi.invokeAddNumbers({ a: 1, b: 2 })
window.myApi.sendLogMessage('Hello from renderer!')
```

```typescript
// 6. Handle in main process
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

## Overview

This library provides a code generation approach to create type-safe IPC communication between Electron's main and renderer processes. It supports traditional request/response patterns, events, broadcasts, and streaming for large data transfers.

## Features

- ✅ **Type-Safe Communication**: Full TypeScript support with compile-time type checking
- ✅ **Five Communication Patterns**: Invoke, Event, Broadcast, Streaming, and Renderer-to-Renderer
- ✅ **Renderer-to-Renderer IPC**: Type-safe communication between renderer processes
- ✅ **Streaming Support**: Handle large data transfers efficiently using Web Streams API
- ✅ **React Hooks**: Automatic generation of React hooks for all contract types
- ✅ **Modern Validation Adapters**: First-class support for Zod 4.x and Valibot
- ✅ **Runtime Validation**: Standardized error handling with error deserialization
- ✅ **Error Deserialization**: Reconstruct structured validation errors in renderer
- ✅ **YAML Configuration**: Clean, maintainable configuration for multiple APIs
- ✅ **Generator Workflows**: `--watch` and `--check` modes for dev and CI
- ✅ **Window Manager**: Multi-window broadcast helpers and registry
- ✅ **IPC Inspector**: Visual tracing and debugging tool (dev-only)
- ✅ **Cross-Platform**: Full support for Windows, macOS, and Linux
- ✅ **Zero Runtime Overhead (Default)**: Type safety at compile time unless validation is enabled

## Communication Patterns

electron-ipc supports five main communication patterns:

### 1. Define IPC Contracts

Create a TypeScript file defining your IPC contracts (e.g., `src/main/ipc-api.ts`):

```typescript
import {
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericBroadcastContract,
  GenericRendererInvokeContract,
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

export type RendererInvokeContracts = GenericRendererInvokeContract<{
  GetDashboardData: IRendererInvokeContract<{ query: string }, { data: unknown[]; total: number }>
  UpdateSettings: IRendererInvokeContract<{ theme: 'light' | 'dark' }, { success: boolean }>
}>

export type RendererInvokeContracts = GenericRendererInvokeContract<{
  GetDashboardData: IRendererInvokeContract<{ query: string }, { data: unknown[]; total: number }>
  UpdateSettings: IRendererInvokeContract<{ theme: 'light' | 'dark' }, { success: boolean }>
}>

export type StreamInvokeContracts = GenericStreamInvokeContract<{
  GetLargeData: IStreamInvokeContract<{ offset: number }, string>
}>

export type StreamUploadContracts = GenericStreamUploadContract<{
  UploadFile: IStreamUploadContract<{ filename: string }, Uint8Array>
}>

export type StreamDownloadContracts = GenericStreamDownloadContract<{
  DownloadLogs: IStreamDownloadContract<{ sinceMs: number }, string>
}>
```

### 2. Create Configuration File

Create a YAML configuration file (e.g., `ipc-config.yaml`) to define your API generation settings:

```yaml
apis:
  - name: myApi
    input: ./src/main/ipc-api.ts
    output: ./src/preload/api-generated.ts
    contracts:
      invoke: InvokeContracts
      event: EventContracts
      send: BroadcastContracts
      rendererInvoke: RendererInvokeContracts

  # You can define multiple APIs in the same file
  - name: streamApi
    input: ./src/main/ipc-api-stream.ts
    output: ./src/preload/stream-api-generated.ts
    contracts:
      streamInvoke: StreamInvokeContracts
      streamUpload: StreamUploadContracts
      streamDownload: StreamDownloadContracts
```

### 3. Generate API Code

Run the generator with your configuration file:

```bash
npx electron-ipc-generate --config=./ipc-config.yaml
```

### 4. Setup Preload Script

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

### 5. Use in Renderer

The API is now available in the renderer process with full type safety:

```typescript
// Invoke methods (request-response)
const result = await window.myApi.invokeAddNumbers({ a: 1, b: 2 })

// Send events (fire-and-forget)
window.myApi.sendLogMessage({ level: 'info', message: 'Hello!' })

// Listen to broadcasts
window.myApi.onPing((count) => console.log('Ping:', count))

// Renderer-to-Renderer invoke (call another window)
const dashboardData = await window.myApi.rendererInvokeGetDashboardData('dashboard', {
  query: 'sales',
})
console.log('Dashboard data:', dashboardData.data, 'Total:', dashboardData.total)

// Stream invoke (request with streaming response)
const stopStream = window.myApi.invokeStreamGetLargeData(
  { offset: 0 },
  {
    onData: (chunk) => console.log('Received:', chunk),
    onEnd: () => console.log('Stream complete'),
    onError: (err) => console.error(err),
  }
)

// Stream upload (upload data to main)
const uploadStream = window.myApi.uploadUploadFile({ filename: 'data.txt' })
await uploadStream.write(new Uint8Array([1, 2, 3, 4, 5]))
await uploadStream.close()

// Stream download (receive stream from main)
const stopDownload = window.myApi.downloadDownloadLogs(
  { sinceMs: Date.now() },
  (log) => console.log('Log:', log),
  () => console.log('Download complete'),
  (err) => console.error(err)
)

// Note: Date is not serializable; use timestamps or ISO strings instead.

// Optional: stop stream early
// stopStream()
// stopDownload()
```

### 6. Handle in Main Process

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
    UploadFile: ({ filename }, onData, onEnd, onError) => {
      const chunks: Uint8Array[] = []
      onData((chunk) => {
        chunks.push(chunk)
      })
      onEnd(() => {
        // Process uploaded data...
        console.log(`Upload complete for ${filename} (${chunks.length} chunks)`)
      })
      onError((err) => {
        console.error(`Upload failed for ${filename}`, err)
      })
    },
  }
}

// Implement stream download handlers (main → renderer)
class RegisterStreamDownload extends AbstractRegisterStreamDownload {
  handlers: IPCStreamDownloadHandlerType<StreamDownloadContracts> = {
    DownloadLogs: async ({ sinceMs }, _event) => {
      // Return a ReadableStream for logs
      return createLogStream(sinceMs)
    },
  }
}

// Register all handlers and events
RegisterHandler.register()
RegisterEvent.register()
RegisterStreamHandler.register()
RegisterStreamUpload.register()
RegisterStreamDownload.register()

// Initialize renderer-to-renderer routing (for multi-window apps)
import { initRendererInvokeRouter } from '@number10/electron-ipc/renderer-routing'
initRendererInvokeRouter()
```

### 7. Handle Renderer-to-Renderer Requests (Multi-Window Apps)

For renderer-to-renderer communication, register handlers in the target renderer:

```typescript
// dashboard-window/renderer.ts

// Register handler for GetDashboardData
const cleanup = window.myApi.handleGetDashboardData(async (request, context) => {
  console.log(`Request from ${context.sourceRole} (window #${context.sourceWindowId})`)

  // Process request
  const data = await queryDatabase(request.query)

  return {
    data,
    total: data.length,
  }
})

// Clean up on window close
window.addEventListener('beforeunload', () => cleanup())
```

**Note:** Requires `initRendererInvokeRouter()` in main process and windows registered with `WindowRegistry`:

```typescript
import { getWindowRegistry } from '@number10/electron-ipc/window-manager'

const dashboardWindow = createDashboardWindow()
getWindowRegistry().register(dashboardWindow, 'dashboard')
```

**Optional: typed handler helpers**

You can keep handlers in plain objects and still get full typing:

```typescript
import {
  defineEventHandlers,
  defineInvokeHandlers,
  defineStreamDownloadHandlers,
} from '@number10/electron-ipc'

const invokeHandlers = defineInvokeHandlers<InvokeContracts>({
  AddNumbers: async (_event, params) => params.a + params.b,
  GetVersion: async () => app.getVersion(),
})

const eventHandlers = defineEventHandlers<EventContracts>({
  Quit: () => app.quit(),
  LogMessage: (_event, message) => console.log(message),
})

const downloadHandlers = defineStreamDownloadHandlers<StreamDownloadContracts>({
  DownloadLogs: async ({ sinceMs }, _event) => createLogStream(sinceMs),
})

class RegisterHandler extends AbstractRegisterHandler {
  handlers = invokeHandlers
}

class RegisterEvent extends AbstractRegisterEvent {
  events = eventHandlers
}

class RegisterStreamDownload extends AbstractRegisterStreamDownload {
  handlers = downloadHandlers
}
```

**Optional: Runtime validation with modern adapters**

If you want runtime checks, wrap handlers with validators using the modern adapters for Zod 4.x or Valibot. This keeps your contracts unchanged but validates at runtime.

```typescript
import { z } from 'zod'
import { zodAdapter, withInvokeValidation } from '@number10/electron-ipc/validation'
import { defineInvokeHandlers } from '@number10/electron-ipc'

// Create validators using modern adapter
const requestValidator = zodAdapter.zodValidator(z.object({ a: z.number(), b: z.number() }))
const responseValidator = zodAdapter.zodValidator(z.number())

const invokeHandlers = defineInvokeHandlers<InvokeContracts>({
  AddNumbers: withInvokeValidation(
    { request: requestValidator, response: responseValidator },
    async (_event, { a, b }) => a + b
  ),
})
```

```typescript
import { defineStreamUploadHandlers, withStreamUploadValidation } from '@number10/electron-ipc'
import { zodAdapter } from '@number10/electron-ipc/validation'

const uploadHandlers = defineStreamUploadHandlers<StreamUploadContracts>({
  UploadFile: withStreamUploadValidation(
    {
      request: requestValidator,
      data: zodAdapter.zodValidator(z.instanceof(Uint8Array)),
    },
    (_request, onData, onEnd, onError) => {
      onError((err) => console.error(err))
      onData((chunk) => {
        // Handle validated chunks
      })
      onEnd(() => {
        // Finalize upload
      })
    }
  ),
})
```

**With Valibot:**

```typescript
import { number, object, safeParse } from 'valibot'
import { valibotAdapter, withInvokeValidation } from '@number10/electron-ipc/validation'

const requestValidator = valibotAdapter.valibotValidator(
  object({ a: number(), b: number() }),
  safeParse
)
const responseValidator = valibotAdapter.valibotValidator(number(), safeParse)
```

**Note:** For stream invoke/download handlers, pass `{ data: validator }` to validate each stream chunk.

**Sending broadcasts from main to renderer:**

Use the generated broadcast API to send events to the renderer process:

```typescript
import { mainBroadcast } from './broadcast-generated'

// Send broadcasts to specific window
mainBroadcast.Ping(mainWindow, 42)
mainBroadcast.About(mainWindow)
```

The generated `mainBroadcast` object provides type-safe methods for each broadcast contract. Each method takes the target `BrowserWindow` as the first parameter, followed by the payload (if any).

## Configuration

### YAML Configuration File

The recommended way to configure the generator is using a YAML configuration file. This provides a clean, maintainable way to manage multiple APIs and their settings.

#### Basic Configuration

```yaml
# ipc-config.yaml
apis:
  - name: myApi
    input: ./src/main/ipc-api.ts
    output: ./src/preload/api-generated.ts
    contracts:
      invoke: InvokeContracts
      event: EventContracts
```

#### Full Configuration Example

```yaml
# ipc-config.yaml
# $schema: ./node_modules/@number10/electron-ipc/ipc-config.schema.json  # For IntelliSense

apis:
  # Main API with standard contracts
  - name: api
    input: ./src/main/ipc-api.ts
    output: ./src/preload/api-generated.ts
    reactHooksOutput: ./src/renderer/hooks/api-hooks.ts # Optional React hooks
    mainBroadcastOutput: ./src/main/broadcast-generated.ts # Optional main broadcast API
    tsconfig: ./tsconfig.json # Optional: for path aliases/re-exports
    contracts:
      invoke: InvokeContracts # Request-response pattern
      event: EventContracts # Renderer → Main events
      send: BroadcastContracts # Main → Renderer broadcasts
      rendererInvoke: RendererInvokeContracts # Renderer → Renderer (multi-window)

  # Stream API for large data transfer
  - name: streamApi
    input: ./src/main/ipc-api-stream.ts
    output: ./src/preload/stream-api-generated.ts
    contracts:
      streamInvoke: StreamInvokeContracts # Request with streaming response
      streamUpload: StreamUploadContracts # Upload stream from renderer
      streamDownload: StreamDownloadContracts # Download stream to renderer
```

#### Configuration Schema

Each API definition supports the following properties:

| Property                   | Type   | Required | Description                                        |
| -------------------------- | ------ | -------- | -------------------------------------------------- |
| `name`                     | string | ✅       | Name of the API (used for `expose{Name}` function) |
| `input`                    | string | ✅       | Path to TypeScript file with IPC contracts         |
| `output`                   | string | ✅       | Output path for generated API code                 |
| `reactHooksOutput`         | string | ❌       | Optional path for generated React hooks            |
| `mainBroadcastOutput`      | string | ❌       | Optional path for main broadcast API               |
| `tsconfig`                 | string | ❌       | Optional tsconfig path for path aliases/re-exports |
| `contracts`                | object | ✅       | Contract type mappings (at least one required)     |
| `contracts.invoke`         | string | ❌       | Type name for invoke contracts                     |
| `contracts.event`          | string | ❌       | Type name for event contracts                      |
| `contracts.send`           | string | ❌       | Type name for broadcast contracts                  |
| `contracts.rendererInvoke` | string | ❌       | Type name for renderer-to-renderer contracts       |
| `contracts.streamInvoke`   | string | ❌       | Type name for stream invoke contracts              |
| `contracts.streamUpload`   | string | ❌       | Type name for stream upload contracts              |
| `contracts.streamDownload` | string | ❌       | Type name for stream download contracts            |

#### Usage

```bash
# Generate all APIs defined in the config file
npx electron-ipc-generate --config=./ipc-config.yaml

# Watch mode (auto-regenerate on changes)
npx electron-ipc-generate --config=./ipc-config.yaml --watch

# CI mode (verify outputs without writing)
npx electron-ipc-generate --config=./ipc-config.yaml --check
```

#### IntelliSense Support

Add the JSON schema reference to your YAML file for IntelliSense in VS Code:

```yaml
$schema: ./node_modules/@number10/electron-ipc/ipc-config.schema.json

apis:
  - name: api
    # ... IntelliSense will provide auto-completion here
```

## Features

✅ **Full Type Safety** - Compile-time validation across all IPC communication  
✅ **Auto-Generated API** - No manual IPC boilerplate code required  
✅ **IntelliSense Support** - Auto-completion in all processes (main, preload, renderer)  
✅ **Five Communication Patterns** - Invoke (request-response), Events (fire-and-forget), Broadcasts (main → renderer), Renderer-to-Renderer (multi-window), Streams (large data/real-time)  
✅ **Context Bridge Integration** - Secure IPC through Electron's `contextBridge`  
✅ **TypeScript Strict Mode** - Designed for maximum type safety  
✅ **YAML Configuration** - Clean, maintainable multi-API setup  
✅ **React Hooks Generation** - Optional React hooks for seamless integration

## Documentation

For detailed documentation, architecture, and advanced usage, see:

- [📚 Complete Documentation](https://michael--.github.io/electron-ipc/) - Full guides, examples, and API reference
- [🏗️ Architecture Guide](https://michael--.github.io/electron-ipc/guide/architecture) - Technical details about the code generator design
- [🪟 Window Manager](https://michael--.github.io/electron-ipc/guide/window-manager) - Multi-window support and broadcasts
- [🔄 Renderer-to-Renderer IPC](https://michael--.github.io/electron-ipc/guide/renderer-to-renderer) - Type-safe communication between renderer processes
- [🔍 IPC Inspector](https://michael--.github.io/electron-ipc/guide/inspector) - Dev-only IPC tracing and debugging

## Examples & Templates

See the [documentation](https://michael--.github.io/electron-ipc/examples/electron-vite) for integration guides:

- [Electron + Vite](https://michael--.github.io/electron-ipc/examples/electron-vite)
- [Electron Forge](https://michael--.github.io/electron-ipc/examples/electron-forge)
- Working examples in repository: `apps/test-app`, `apps/multi-window`, `apps/*-minimal`

## Migration from v1.x

### Breaking Changes

**1. YAML Configuration Required**

CLI arguments are no longer supported. Create a YAML configuration file:

```yaml
# ipc-config.yaml
apis:
  - name: myApi
    input: ./src/main/ipc-api.ts
    output: ./src/preload/generated-api.ts
    contracts:
      invoke: InvokeContracts
      event: EventContracts
```

Then run:

```bash
npx electron-ipc-generate --config=./ipc-config.yaml
```

**2. React Hooks Integration**

The separate `electron-ipc-react` package has been removed. React hooks are now generated via:

```yaml
apis:
  - name: myApi
    # ... other config
    reactHooksOutput: ./src/hooks/api-hooks.ts # Add this line
```

**3. Import Path Updates**

Contract types are now re-exported from generated files. Update imports:

```typescript
// Old
import { InvokeContracts } from './ipc-api'

// New (optional, both work)
import { InvokeContracts } from './generated-api'
```

### New Features in v2.0

- ✅ **Streaming Contracts**: Handle large files and real-time data
- ✅ **Renderer-to-Renderer IPC**: Type-safe communication between renderer processes via main routing
- ✅ **Automatic React Hooks**: Generate hooks for all contract types
- ✅ **Modern Validation Adapters**: First-class Zod 4.x and Valibot support
- ✅ **Standardized Error Handling**: IPCValidationError and IPCHandlerError types
- ✅ **Window Manager**: Multi-window broadcast helpers and registry
- ✅ **IPC Inspector**: Visual debugging and tracing tool with renderer-to-renderer support
- ✅ **YAML Configuration**: Clean, maintainable project setup
- ✅ **Windows Support**: Full cross-platform compatibility
- ✅ **Multiple APIs**: Define multiple API configurations in one YAML file

## Assets

This package includes logo assets for branding and documentation:

- `assets/logo-light.svg` - Light theme logo (transparent background)
- `assets/logo-dark.svg` - Dark theme logo (dark background)

Both logos are available in SVG format and can be used in documentation, websites, or any other branding materials.

## License

MIT

# Electron IPC Code Generator

Type-safe IPC communication generator for Electron applications with streaming support.

## Overview

This monorepo contains a TypeScript code generator that creates type-safe IPC (Inter-Process Communication) APIs for Electron applications. It eliminates boilerplate code and ensures type safety across main, preload, and renderer processes.

**The Key Benefit:** When you change an IPC contract interface, TypeScript immediately shows compile errors everywhere the contract is used incorrectly - before you even run the code. No runtime surprises!

## Architecture

### Packages

- **`electron-ipc`** - Publishable npm package containing the code generator
- **`test-app`** - Electron application for testing the generator

### How It Works

1. **Define IPC Contracts** in your main process using TypeScript interfaces
2. **Run the Generator** via YAML configuration to create type-safe API code
3. **Use Generated API** in preload/renderer with full TypeScript support

## IPC Contract Types

The generator supports four types of IPC communication:

### 1. Invoke (Renderer ↔ Main, Request/Response)

Renderer calls main process and waits for response:

```typescript
export type InvokeContracts = GenericInvokeContract<{
  GetVersion: IInvokeContract<void, string>
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>
```

**Why these wrapper types?** `GenericInvokeContract` and `IInvokeContract` enforce a strict structure with `request` and `response` properties. This structured format is required so the generator can reliably parse and generate type-safe code. You cannot deviate from this pattern - it ensures the generator knows exactly what types to extract.

**Generated method names:** The generator prefixes invoke methods with `invoke`:

- `AddNumbers` → `window.api.invokeAddNumbers(params)`
- `GetVersion` → `window.api.invokeGetVersion()`

### 2. Event (Renderer → Main)

Renderer sends events to main process without expecting a response:

```typescript
export type EventContracts = GenericRendererEventContract<{
  Quit: IRendererEventContract<void>
  LogMessage: IRendererEventContract<string>
}>
```

**Why these wrapper types?** `GenericRendererEventContract` and `IRendererEventContract` enforce the structure with a `request` property. This is necessary for the generator to extract the payload type correctly.

**Generated method names:** The generator prefixes event methods with `send`:

- `Quit` → `window.api.sendQuit()`
- `LogMessage` → `window.api.sendLogMessage(message)`

### 3. Broadcast (Main → Renderer)

Main process sends data/events to renderer (one-way only):

```typescript
export type BroadcastContracts = GenericBroadcastContract<{
  Ping: IBroadcastContract<number>
  About: IBroadcastContract<void>
}>
```

**Why these wrapper types?** `GenericBroadcastContract` and `IBroadcastContract` enforce the structure with a `payload` property. This structured format is required so the generator can reliably parse and generate type-safe code, just like the other contract types.

**Generated method names:** The generator prefixes broadcast listeners with `on`:

- `Ping` → `window.api.onPing((count) => ...)`
- `About` → `window.api.onAbout(() => ...)`

### 4. Streams (Large Data & Real-time)

For efficient handling of large data transfers or real-time data streams using Web Streams API:

```typescript
// Stream Invoke: Request-response with streaming response
export type StreamInvokeContracts = GenericStreamInvokeContract<{
  GetLargeData: IStreamInvokeContract<{ offset: number }, string>
}>

// Stream Upload: Renderer uploads data to main
export type StreamUploadContracts = GenericStreamUploadContract<{
  UploadFile: IStreamUploadContract<{ filename: string }, Uint8Array>
}>

// Stream Download: Main streams data to renderer
export type StreamDownloadContracts = GenericStreamDownloadContract<{
  DownloadLogs: IStreamDownloadContract<{ since: Date }, string>
}>
```

**Generated method names:**

- Stream Invoke: `invokeStreamGetLargeData()` → returns `ReadableStream`
- Stream Upload: `uploadStreamUploadFile()` → returns `WritableStream`
- Stream Download: `downloadStreamDownloadLogs()` → returns `ReadableStream`

## Workflow

### 1. Define Contracts

Create IPC contracts in your main process (`src/main/ipc-api.ts`):

```typescript
import {
  createBroadcast,
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  GenericStreamInvokeContract,
  GenericStreamUploadContract,
  GenericStreamDownloadContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
} from '@number10/electron-ipc'

// Invoke: Renderer calls main and gets response
export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
  GetVersion: IInvokeContract<void, string>
}>

// Event: Renderer sends events to main
export type EventContracts = GenericRendererEventContract<{
  Quit: IRendererEventContract<void>
  LogMessage: IRendererEventContract<string>
}>

// Broadcast: Main sends to renderer (one-way)
export type BroadcastContracts = GenericBroadcastContract<{
  Ping: IBroadcastContract<number>
  About: IBroadcastContract<void>
}>

// Streams: Large data and real-time communication
export type StreamInvokeContracts = GenericStreamInvokeContract<{
  GetLargeData: IStreamInvokeContract<{ offset: number }, string>
}>

export type StreamUploadContracts = GenericStreamUploadContract<{
  UploadFile: IStreamUploadContract<{ filename: string }, Uint8Array>
}>

export type StreamDownloadContracts = GenericStreamDownloadContract<{
  DownloadLogs: IStreamDownloadContract<{ since: Date }, string>
}>

// Optional: Create runtime broadcast helper (if not using generated API)
// export const mainBroadcast = createBroadcast<BroadcastContracts>()
```

## Configuration File

For managing IPC APIs, use a YAML configuration file:

```yaml
# ipc-config.yaml
apis:
  - name: api
    input: ./src/main/ipc-api.ts
    output: ./src/preload/api-generated.ts
    contracts:
      invoke: InvokeContracts
      event: EventContracts
      send: BroadcastContracts
    mainBroadcastOutput: ./src/main/broadcast-generated.ts

  - name: streamApi
    input: ./src/main/ipc-api-stream.ts
    output: ./src/preload/api-stream-generated.ts
    contracts:
      streamInvoke: StreamInvokeContracts
      streamUpload: StreamUploadContracts
      streamDownload: StreamDownloadContracts
```

Generate all APIs:

```bash
electron-ipc-generate --config=./ipc-config.yaml
```

Each API gets a unique expose function name (e.g., `exposeApi`, `exposeStreamApi`).

### 3. Use in Preload

Expose the generated API via context bridge (`src/preload/index.ts`):

```typescript
import { exposeMyApi, MyApiType } from './api-generated'

declare global {
  interface Window {
    myApi: MyApiType
  }
}

exposeMyApi()
```

**Alternative:** You can also use the contextBridge directly:

```typescript
import { contextBridge } from 'electron'
import { myApi } from './api-generated'

contextBridge.exposeInMainWorld('myApi', myApi)
```

### 4. Use in Renderer

Access the API with full TypeScript support (`src/renderer/App.tsx`):

````typescript
```typescript
// Invoke: Call main and await response (prefixed with 'invoke')
const result = await window.myApi.invokeAddNumbers({ a: 5, b: 3 }) // result = 8
const version = await window.myApi.invokeGetVersion()

// Event: Send to main (prefixed with 'send')
window.myApi.sendQuit()
window.myApi.sendLogMessage('User clicked button')

// Broadcast: Listen to events from main (prefixed with 'on')
window.myApi.onPing((count) => console.log(`Ping ${count}`))
window.myApi.onAbout(() => console.log('About dialog'))

// Streams: Handle large data and real-time communication
const stream = await window.myApi.invokeStreamGetLargeData({ offset: 0 })
````

const reader = stream.getReader()
while (true) {
const { done, value } = await reader.read()
if (done) break
console.log('Received:', value)
}

const uploadStream = window.myApi.uploadStreamUploadFile({ filename: 'data.txt' })
const writer = uploadStream.getWriter()
await writer.write(new Uint8Array([1, 2, 3, 4, 5]))
await writer.close()

const downloadStream = window.myApi.downloadStreamDownloadLogs({ since: new Date() })
const downloadReader = downloadStream.getReader()
while (true) {
const { done, value } = await downloadReader.read()
if (done) break
console.log('Log:', value)
}

```

**Note:** The generated broadcast API (`mainBroadcastOutput`) is optional but recommended for consistency with the renderer API. Both approaches are type-safe.

### 5. Implement Handlers in Main
      event: EventContracts
      send: BroadcastContracts
    mainBroadcastOutput: ./src/main/broadcast-generated.ts

  - name: streamApi
    input: ./src/main/ipc-api-stream.ts
    output: ./src/preload/api-stream-generated.ts
    contracts:
      streamInvoke: StreamInvokeContracts
      streamUpload: StreamUploadContracts
      streamDownload: StreamDownloadContracts
```

**Note:** The generated broadcast API (`mainBroadcastOutput`) is optional but recommended for consistency with the renderer API. Both approaches are type-safe.

### 5. Implement Handlers in Main

Handle IPC calls in main process (`src/main/index.ts`):

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
import { InvokeContracts, EventContracts, BroadcastContracts } from './ipc-api'

// Implement invoke handlers (request/response)
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, params) => {
      return params.a + params.b
    },
    GetVersion: async () => {
      return app.getVersion()
    },
  }
}

// Implement event handlers (renderer → main)
class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    Quit: () => {
      app.quit()
    },
    LogMessage: (_event, message) => {
      console.log(`Renderer: ${message}`)
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

// Register all handlers
RegisterHandler.register()
RegisterEvent.register()
RegisterStreamHandler.register()
RegisterStreamUpload.register()
RegisterStreamDownload.register()

// Option 1: Use generated main broadcast API (recommended)
import { mainBroadcast } from './broadcast-generated'
mainBroadcast.Ping(mainWindow, 42) // with payload
mainBroadcast.About(mainWindow) // void payload omitted

// Option 2: Use runtime-generated broadcast helper (alternative)
import { createBroadcast } from '@number10/electron-ipc'
const mainBroadcast = createBroadcast<BroadcastContracts>()
mainBroadcast('Ping', mainWindow, 42)
mainBroadcast('About', mainWindow, undefined)
```

**Note:** The generated broadcast API (`mainBroadcastOutput`) is optional but recommended for consistency with the renderer API. Both approaches are type-safe.

## CLI Usage

The generator uses YAML configuration files:

```bash
electron-ipc-generate --config=./ipc-config.yaml
```

### Configuration Format

```yaml
# ipc-config.yaml
apis:
  - name: api # API name (used for expose function)
    input: ./src/main/ipc-api.ts # Source file with contracts
    output: ./src/preload/api-generated.ts # Generated preload API
    contracts:
      invoke: InvokeContracts # Optional: Invoke contract type
      event: EventContracts # Optional: Event contract type
      send: BroadcastContracts # Optional: Broadcast contract type
      streamInvoke: StreamInvokeContracts # Optional: Stream invoke contracts
      streamUpload: StreamUploadContracts # Optional: Stream upload contracts
      streamDownload: StreamDownloadContracts # Optional: Stream download contracts
    mainBroadcastOutput: ./src/main/broadcast-generated.ts # Optional: Main broadcast API
    reactHooksOutput: ./src/preload/api-react-hooks.ts # Optional: Generated React hooks
```

**Note:** At least one contract type must be specified per API. The `mainBroadcastOutput` is optional; if omitted, use the runtime `createBroadcast()` helper instead.

## Benefits

✅ **Four Communication Patterns** - Invoke (request-response), Events (fire-and-forget), Broadcasts (main → renderer), Streams (large data/real-time)
✅ **Compile-Time Type Safety** - Change a contract interface → TypeScript shows errors immediately in all usages  
✅ **No Runtime Surprises** - Catch signature mismatches before running the app  
✅ **IntelliSense Everywhere** - Auto-completion in main, preload, and renderer processes  
✅ **Refactoring Support** - Rename/change contracts → TypeScript guides you to fix all usages  
✅ **Zero Boilerplate** - Auto-generated IPC wrappers and type definitions  
✅ **Single Source of Truth** - IPC contracts defined once, validated everywhere
✅ **React Hooks** - Automatic generation of `useXxx` hooks for renderer

### Example: Type Safety in Action

Change this contract:

```typescript
export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>
```

To this:

```typescript
export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ x: number; y: number }, number> // Changed a,b → x,y
}>
```

TypeScript **immediately** shows compile errors in your handler implementation:

```typescript
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, v) => {
      return v.a + v.b // ❌ Error: Property 'a' does not exist on type '{ x: number; y: number }'
    },
  }
}
```

The same applies to:

- **Renderer calls** - Wrong parameters show errors in React components
- **Broadcast usage** - Type-checked at call site
- **Event handlers** - Payload types validated

No need to run the app to find these bugs! 🎯

## Development Setup

### Prerequisites

- Node.js ≥18.0.0
- pnpm ≥8.15.0
- **Windows only:** Git Bash (for Git hooks)

> **Note for Windows users:** This project uses Husky for Git hooks. Git Bash must be installed and available in your PATH for the pre-commit hooks to work properly.

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm run build

# Run tests
pnpm run test

# Start test app
pnpm run dev
```

### Working on Individual Packages

```bash
# electron-ipc library
cd packages/electron-ipc
pnpm run build
pnpm run watch

# test-app
cd packages/test-app
pnpm run dev
```

### Project Structure

```
electron-ipc/
├── packages/
│   ├── electron-ipc/          # Generator library (publishable)
│   │   ├── src/
│   │   │   ├── generator/     # Code generation logic
│   │   │   ├── interfaces/    # TypeScript interfaces
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── test-app/              # Electron test application (private)
│       ├── src/
│       │   ├── main/          # Main process code
│       │   ├── preload/       # Preload scripts
│       │   └── renderer/      # Renderer process (React)
│       ├── public/            # React components
│       └── package.json
│
├── docs/                      # Detailed documentation
├── package.json               # Workspace root
└── tsconfig.json              # Base TypeScript config
```

## 🛠 Technology Stack

- **TypeScript** - Strict mode, ES2022
- **Vite** - Build tool for library
- **electron-vite** - Build tool for Electron app
- **React** - UI framework for test app
- **Vitest** - Testing framework
- **ESLint** - Code linting (flat config)
- **Prettier** - Code formatting (no semicolons)
- **Husky** - Git hooks
- **ts-morph** - TypeScript AST manipulation
- **yaml** - YAML configuration parsing

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run `pnpm run lint` and `pnpm run test`
4. Commit with conventional commit format:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` code refactoring
   - `test:` testing
   - `chore:` maintenance

## 📝 License

MIT

# Electron IPC Code Generator

Type-safe IPC communication generator for Electron applications.

## Overview

This monorepo contains a TypeScript code generator that creates type-safe IPC (Inter-Process Communication) APIs for Electron applications. It eliminates boilerplate code and ensures type safety across main, preload, and renderer processes.

**The Key Benefit:** When you change an IPC contract interface, TypeScript immediately shows compile errors everywhere the contract is used incorrectly - before you even run the code. No runtime surprises!

## Architecture

### Packages

- **`electron-ipc`** - Publishable npm package containing the code generator
- **`test-app`** - Electron application for testing the generator

### How It Works

1. **Define IPC Contracts** in your main process using TypeScript interfaces
2. **Run the Generator** to create type-safe API code
3. **Use Generated API** in preload/renderer with full TypeScript support

## IPC Contract Types

The generator supports three types of IPC communication:

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
export type IBroadcastContracts = GenericBroadcastContract<{
  Ping: IBroadcastContract<number>
  About: IBroadcastContract<void>
}>
```

**Why these wrapper types?** `GenericBroadcastContract` and `IBroadcastContract` enforce the structure with a `payload` property. This structured format is required so the generator can reliably parse and generate type-safe code, just like the other contract types.

**Generated method names:** The generator prefixes broadcast listeners with `on`:

- `Ping` → `window.api.onPing((count) => ...)`
- `About` → `window.api.onAbout(() => ...)`

## Workflow

### 1. Define Contracts

Create IPC contracts in your main process (`src/main/ipc-api.ts`):

```typescript
import {
  createBroadcast,
  GenericBroadcastContract,
  GenericInvokeContract,
  GenericRendererEventContract,
  IBroadcastContract,
  IInvokeContract,
  IRendererEventContract,
} from 'electron-ipc'

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

// Optional: Create runtime broadcast helper (if not using generated API)
// export const mainBroadcast = createBroadcast<BroadcastContracts>()
```

### 2. Generate API

Run the generator:

```bash
pnpm run generate:api
```

This creates `src/preload/api-generated.ts` with type-safe wrappers.

### 3. Use in Preload

Expose the generated API via context bridge (`src/preload/index.ts`):

```typescript
import { contextBridge } from 'electron'
import { api } from './api-generated'

contextBridge.exposeInMainWorld('api', api)
```

### 4. Use in Renderer

Access the API with full TypeScript support (`src/renderer/App.tsx`):

```typescript
// Invoke: Call main and await response (prefixed with 'invoke')
const result = await window.api.invokeAddNumbers({ a: 5, b: 3 }) // result = 8
const version = await window.api.invokeGetVersion()

// Event: Send to main (prefixed with 'send')
window.api.sendQuit()
window.api.sendLogMessage('User clicked button')

// Broadcast: Listen to events from main (prefixed with 'on')
window.api.onPing((count) => console.log(`Ping ${count}`))
window.api.onAbout(() => console.log('About dialog'))
```

**Note:** The generator automatically adds prefixes to method names:

- Invoke contracts → `invoke` prefix
- Event contracts → `send` prefix
- Broadcast contracts → `on` prefix

This prevents naming conflicts and makes the API usage self-documenting.

### 5. Implement Handlers in Main

Handle IPC calls in main process (`src/main/index.ts`):

```typescript
import {
  AbstractRegisterHandler,
  AbstractRegisterEvent,
  IPCHandlerType,
  IPCEventType,
} from 'electron-ipc'
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

// Register all handlers
RegisterHandler.register()
RegisterEvent.register()

// Option 1: Use generated main broadcast API (recommended)
import { mainBroadcast } from './broadcast-generated'
mainBroadcast.Ping(mainWindow, 42) // with payload
mainBroadcast.About(mainWindow) // void payload omitted

// Option 2: Use runtime-generated broadcast helper (alternative)
import { createBroadcast } from 'electron-ipc'
const mainBroadcast = createBroadcast<BroadcastContracts>()
mainBroadcast('Ping', mainWindow, 42)
mainBroadcast('About', mainWindow, undefined)
```

**Note:** The generated broadcast API (`--main-broadcast-output`) is optional but recommended for consistency with the renderer API. Both approaches are type-safe.

## CLI Usage

The generator is available as a CLI tool:

```bash
electron-ipc-generate \
  --input ./src/main/ipc-api.ts \
  --output ./src/preload/api-generated.ts \
  --invoke InvokeContracts \
  --event EventContracts \
  --send BroadcastContracts \
  --main-broadcast-output ./src/main/broadcast-generated.ts
```

### CLI Options

- `--input=<path>` - Path to file containing IPC contract definitions
- `--output=<path>` - Path where generated API code will be written
- `--invoke=<name>` - Type name for invoke contracts (Renderer ↔ Main, request/response)
- `--event=<name>` - Type name for event contracts (Renderer → Main, no response)
- `--send=<name>` - Type name for send/broadcast contracts (Main → Renderer, one-way)
- `--main-broadcast-output=<path>` - **Optional:** Path where the main process broadcast API will be saved

**Note:** At least one contract type must be specified. If multiple contracts of the same type are specified, the last one wins.

The `--main-broadcast-output` option is optional. If omitted, you can use the runtime `createBroadcast()` helper instead.

## Benefits

✅ **Compile-Time Type Safety** - Change a contract interface → TypeScript shows errors immediately in all usages  
✅ **No Runtime Surprises** - Catch signature mismatches before running the app  
✅ **IntelliSense Everywhere** - Auto-completion in main, preload, and renderer processes  
✅ **Refactoring Support** - Rename/change contracts → TypeScript guides you to fix all usages  
✅ **Zero Boilerplate** - Auto-generated IPC wrappers and type definitions  
✅ **Single Source of Truth** - IPC contracts defined once, validated everywhere

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

## Development Setup### Prerequisites

- Node.js ≥18.0.0
- pnpm ≥8.15.0

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

### Project Structure

```
electron-ipc/
├── packages/
│   ├── electron-ipc/          # Generator library (publishable)
│   │   ├── src/
│   │   │   ├── index.ts       # Public API
│   │   │   ├── generator/     # Code generation logic
│   │   │   └── bin/           # CLI entry point
│   │   └── package.json
│   │
│   └── test-app/              # Electron test environment
│       ├── src/
│       │   ├── main/          # Main process
│       │   ├── preload/       # Preload scripts
│       │   └── renderer/      # React UI
│       └── package.json
│
├── docs/                      # Documentation
├── .husky/                    # Git hooks
└── package.json               # Workspace root
```

## Technology Stack

- **TypeScript** - Strict mode, ES2022
- **Vite** - Build tool for library
- **electron-vite** - Build tool for Electron app
- **React** - UI framework for test app
- **Vitest** - Testing framework
- **ESLint** - Code linting (flat config)
- **Prettier** - Code formatting (no semicolons)
- **Husky** - Git hooks
- **ts-morph** - TypeScript AST manipulation

## Contributing

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

## License

MIT

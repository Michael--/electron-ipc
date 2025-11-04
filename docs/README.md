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

### 1. Invoke (Request/Response)

Main process handles requests and returns responses:

```typescript
interface IInvokeContracts {
  getAppVersion: () => string
  readFile: (path: string) => Promise<string>
}
```

### 2. Event (Main → Renderer)

Main process sends events to renderer:

```typescript
interface IEventContracts {
  onAppReady: () => void
  onUpdate: (version: string) => void
}
```

### 3. Send/Broadcast (Renderer → Main or Main → Renderer)

Bi-directional communication without response:

```typescript
interface ISendContracts {
  logMessage: (message: string) => void
  userAction: (action: string, data: unknown) => void
}
```

## Workflow

### 1. Define Contracts

Create IPC contracts in your main process (`src/main/ipc-api.ts`):

```typescript
import { createInvokeFor, createEventFor, createBroadcastFor } from 'electron-ipc'

interface IAppInvokeContracts {
  getVersion: () => string
  saveFile: (path: string, content: string) => Promise<void>
}

interface IAppEventContracts {
  onReady: () => void
  onError: (error: string) => void
}

interface IAppSendContracts {
  userClick: (x: number, y: number) => void
}

export const mainInvoke = createInvokeFor<IAppInvokeContracts>()
export const mainEvent = createEventFor<IAppEventContracts>()
export const mainSend = createBroadcastFor<IAppSendContracts>()
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
// Invoke
const version = await window.api.getVersion()
await window.api.saveFile('/path/to/file', 'content')

// Listen to events
window.api.onReady(() => console.log('App ready'))
window.api.onError((error) => console.error(error))

// Send messages
window.api.userClick(100, 200)
```

### 5. Implement Handlers in Main

Handle IPC calls in main process (`src/main/index.ts`):

```typescript
import { mainInvoke, mainEvent, mainSend } from './ipc-api'

// Register invoke handlers
mainInvoke.handle('getVersion', () => app.getVersion())
mainInvoke.handle('saveFile', async (path, content) => {
  await fs.writeFile(path, content)
})

// Send events to renderer
mainEvent.emit('onReady')
mainEvent.emit('onError', 'Something went wrong')

// Listen to renderer messages
mainSend.listen('userClick', (x, y) => {
  console.log(`User clicked at ${x}, ${y}`)
})
```

## CLI Usage

The generator is available as a CLI tool:

```bash
electron-ipc-generate \
  --input ./src/main/ipc-api.ts \
  --output ./src/preload/api-generated.ts \
  --contract invoke:IAppInvokeContracts \
  --contract event:IAppEventContracts \
  --contract send:IAppSendContracts
```

### CLI Options

- `--input` - Path to file containing IPC contract definitions
- `--output` - Path where generated API code will be written
- `--contract` - Contract to process (format: `type:InterfaceName`)
  - `invoke:InterfaceName` - Request/response pattern
  - `event:InterfaceName` - Main → Renderer events
  - `send:InterfaceName` - Bidirectional messaging

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
interface IInvokeContracts {
  AddNumbers: (params: { a: number; b: number }) => number
}
```

To this:

```typescript
interface IInvokeContracts {
  AddNumbers: (params: { x: number; y: number }) => number // Changed a,b → x,y
}
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

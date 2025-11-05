# electron-ipc

TypeScript code generator for type-safe Electron IPC communication.

## Status

🚧 **Under Development** - This library is currently in active development.

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
} from 'electron-ipc'

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

In your preload script (e.g., `src/preload/index.ts`), expose the API to the renderer:

```typescript
import { exposeApi, ApiType } from './api-generated'

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()
```

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

Use the generated broadcast API in your main process:

```typescript
import { broadcastPing, broadcastAbout } from './broadcast-generated'

// Send broadcasts to renderer
broadcastPing(42)
broadcastAbout()
```

## Assets

This package includes logo assets for branding and documentation:

- `assets/logo-light.svg` - Light theme logo (transparent background)
- `assets/logo-dark.svg` - Dark theme logo (dark background)

Both logos are available in SVG format and can be used in documentation, websites, or any other branding materials.

## License

MIT

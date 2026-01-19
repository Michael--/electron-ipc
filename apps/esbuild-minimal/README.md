# esbuild-minimal

Minimal Electron application demonstrating **@number10/electron-ipc** with **esbuild** bundler.

## What it demonstrates

✅ Type-safe IPC communication (invoke/handle)  
✅ Event-based messaging (main → renderer)  
✅ Code generation from YAML schema  
✅ esbuild bundler integration  
✅ TypeScript compilation  
✅ Dev mode with watch & hot reload

## Quick Start

```bash
# Install dependencies
pnpm install

# Build and run
pnpm run build
pnpm start

# Or run in dev mode with watch
pnpm run dev
```

## Project Structure

```
src/
├── main/
│   ├── index.ts              # Electron main process
│   ├── ipc-config.yaml       # IPC schema definition
│   ├── ipc-api.ts            # Handler implementations
│   └── ipc-api.generated.ts  # Auto-generated code
├── preload/
│   └── index.ts              # Context bridge setup
└── renderer/
    ├── index.html            # UI
    └── renderer.ts           # Renderer logic
```

## How it works

### 1. Define IPC Schema (YAML)

```yaml
# src/main/ipc-config.yaml
channels:
  ping:
    direction: invoke
    requestSchema: { ... }
    responseSchema: { ... }
```

### 2. Generate TypeScript Code

```bash
pnpm run generate
```

Creates type-safe `ipc-api.generated.ts` with full IntelliSense support.

### 3. Implement Handlers

```typescript
// src/main/ipc-api.ts
export const ipcApi = createIpcMain({
  ping: async (request) => {
    return { reply: `Pong! ${request.message}`, timestamp: Date.now() }
  },
})
```

### 4. Use in Renderer

```typescript
// src/renderer/renderer.ts
const response = await window.ipcApi.invoke.ping({ message: 'Hello!' })
console.log(response.reply) // Type-safe!
```

## esbuild Configuration

The build script ([build.mjs](build.mjs)) bundles three separate entry points:

- **Main process**: Node.js target, CommonJS format
- **Preload script**: Node.js target, with Electron API
- **Renderer**: Browser target, ESM format

### Key Features

- ⚡ Fast builds (~100ms)
- 👀 Watch mode with auto-restart
- 📦 Single executable script
- 🔧 Zero config beyond [build.mjs](build.mjs)

## Available Scripts

| Script                    | Description                    |
| ------------------------- | ------------------------------ |
| `pnpm run generate`       | Generate IPC code from YAML    |
| `pnpm run generate:watch` | Watch mode for YAML changes    |
| `pnpm run build`          | Build all processes            |
| `pnpm run dev`            | Build + watch + start Electron |
| `pnpm start`              | Run built application          |
| `pnpm run clean`          | Remove build artifacts         |
| `pnpm run typecheck`      | TypeScript type checking       |

## Why esbuild?

- **Speed**: 10-100x faster than webpack/rollup
- **Simplicity**: Minimal configuration
- **Native TypeScript**: Built-in TS support
- **Modern**: ESM, tree-shaking out of the box

## Comparison with other bundlers

| Feature           | esbuild | electron-vite | webpack |
| ----------------- | ------- | ------------- | ------- |
| Build speed       | ⚡⚡⚡  | ⚡⚡          | ⚡      |
| Config complexity | Low     | Low           | High    |
| Plugin ecosystem  | Growing | Vite plugins  | Huge    |
| TypeScript        | Native  | Via Vite      | Loader  |

## Next Steps

- Add more IPC channels to [ipc-config.yaml](src/main/ipc-config.yaml)
- Implement handlers in [ipc-api.ts](src/main/ipc-api.ts)
- Extend UI in [renderer.ts](src/renderer/renderer.ts)
- Check out [test-app](../test-app) for advanced features

## Learn More

- [electron-ipc documentation](../../packages/electron-ipc/README.md)
- [esbuild documentation](https://esbuild.github.io/)
- [Electron documentation](https://www.electronjs.org/)

## License

MIT

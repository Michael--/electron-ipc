# webpack-minimal

Minimal Electron application demonstrating **@number10/electron-ipc** with **webpack** bundler.

## What it demonstrates

✅ Type-safe IPC communication (invoke/handle)  
✅ Event-based messaging (main → renderer)  
✅ Code generation from YAML schema  
✅ webpack bundler integration  
✅ TypeScript compilation with ts-loader  
✅ Separate configs for main/preload/renderer

## Quick Start

```bash
# Install dependencies
pnpm install

# Build and run
pnpm run build
pnpm start

# Or run in dev mode with watch
pnpm run dev
# In another terminal:
pnpm start
```

## Project Structure

```
src/
├── main/
│   ├── index.ts              # Electron main process
│   ├── ipc-config.yaml       # IPC schema definition
│   ├── ipc-api.ts            # Contract type definitions
│   └── ipc-api.generated.ts  # Auto-generated code
├── preload/
│   └── index.ts              # Context bridge setup
└── renderer/
    ├── index.html            # UI template
    └── renderer.ts           # Renderer logic

webpack.config.js             # Combined config
webpack.main.config.js        # Main process config
webpack.preload.config.js     # Preload config
webpack.renderer.config.js    # Renderer config
```

## How it works

### 1. Define IPC Schema (YAML)

```yaml
# src/main/ipc-config.yaml
apis:
  - name: api
    input: ./src/main/ipc-api.ts
    output: ./dist/ipc-api.generated.ts
    contracts:
      invoke: InvokeContracts
      send: EventContracts
```

### 2. Define Type Contracts

```typescript
// src/main/ipc-api.ts
export type InvokeContracts = GenericInvokeContract<{
  ping: IInvokeContract<{ message: string }, { reply: string; timestamp: number }>
}>
```

### 3. Generate TypeScript Code

```bash
pnpm run generate
```

Creates type-safe `ipc-api.generated.ts` with full IntelliSense support.

### 4. Implement Handlers

```typescript
// src/main/index.ts
ipcMain.handle('ping', async (_event, request) => {
  return { reply: `Pong! ${request.message}`, timestamp: Date.now() }
})
```

### 5. Use in Renderer

```typescript
// src/renderer/renderer.ts
const response = await window.api.invokeping({ message: 'Hello!' })
console.log(response.reply) // Type-safe!
```

## webpack Configuration

The project uses separate webpack configs for each Electron process:

### Main Process ([webpack.main.config.js](webpack.main.config.js))

- **Target**: `electron-main`
- **Entry**: `src/main/index.ts`
- **Output**: `dist/main/index.js`
- Uses `ts-loader` for TypeScript

### Preload Script ([webpack.preload.config.js](webpack.preload.config.js))

- **Target**: `electron-preload`
- **Entry**: `src/preload/index.ts`
- **Output**: `dist/preload/index.js`

### Renderer Process ([webpack.renderer.config.js](webpack.renderer.config.js))

- **Target**: `electron-renderer`
- **Entry**: `src/renderer/renderer.ts`
- **Output**: `dist/renderer/renderer.js`
- Uses `HtmlWebpackPlugin` for HTML processing

### Combined Config ([webpack.config.js](webpack.config.js))

Exports all three configs as an array for parallel building.

## Available Scripts

| Script                    | Description                       |
| ------------------------- | --------------------------------- |
| `pnpm run generate`       | Generate IPC code from YAML       |
| `pnpm run generate:watch` | Watch mode for YAML changes       |
| `pnpm run build`          | Build all processes (production)  |
| `pnpm run build:dev`      | Build all processes (development) |
| `pnpm run dev`            | Build + watch mode                |
| `pnpm start`              | Run built application             |
| `pnpm run clean`          | Remove build artifacts            |
| `pnpm run typecheck`      | TypeScript type checking          |

## Why webpack?

- **Industry Standard**: Most widely used bundler
- **Rich Ecosystem**: Huge plugin and loader ecosystem
- **Mature**: Battle-tested in production
- **Flexible**: Highly configurable for complex scenarios
- **Community**: Large community and extensive documentation

## Comparison with other bundlers

| Feature           | webpack   | esbuild | electron-vite |
| ----------------- | --------- | ------- | ------------- |
| Build speed       | ⚡        | ⚡⚡⚡  | ⚡⚡          |
| Config complexity | High      | Low     | Low           |
| Plugin ecosystem  | Huge      | Growing | Vite plugins  |
| TypeScript        | ts-loader | Native  | Via Vite      |
| Industry adoption | Very High | Growing | Niche         |

## webpack Advantages

- **Mature tooling**: Well-established, stable
- **Code splitting**: Advanced optimization
- **Tree shaking**: Excellent dead code elimination
- **HMR**: Hot Module Replacement support
- **Source maps**: Great debugging experience

## Next Steps

- Add more IPC channels to [ipc-config.yaml](src/main/ipc-config.yaml)
- Implement handlers in [index.ts](src/main/index.ts)
- Extend UI in [renderer.ts](src/renderer/renderer.ts)
- Check out [esbuild-minimal](../esbuild-minimal) for faster builds
- See [test-app](../test-app) for advanced features

## Learn More

- [electron-ipc documentation](../../packages/electron-ipc/README.md)
- [webpack documentation](https://webpack.js.org/)
- [Electron documentation](https://www.electronjs.org/)

## License

MIT

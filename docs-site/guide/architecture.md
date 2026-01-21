# Architecture

## Code Generator Design

### Why Contract Helper Types?

The generator uses structured wrapper types (`GenericInvokeContract`, `IInvokeContract`, etc.) instead of simple function signatures for a critical reason: **reliable code generation**.

These helper types enforce a specific structure with named properties:

- `GenericInvokeContract<T>` + `IInvokeContract<Request, Response>` → `{ request: Request, response: Response }`
- `GenericRendererEventContract<T>` + `IRendererEventContract<Payload>` → `{ request: Payload }`
- `GenericBroadcastContract<T>` + `IBroadcastContract<Payload>` → `{ payload: Payload }`
- `GenericStreamInvokeContract<T>` + `IStreamInvokeContract<Request, Chunk>` → `{ request: Request, stream: Chunk }`
- `GenericStreamUploadContract<T>` + `IStreamUploadContract<Request, Chunk>` → `{ request: Request, data: Chunk }`
- `GenericStreamDownloadContract<T>` + `IStreamDownloadContract<Request, Chunk>` → `{ request: Request, data: Chunk }`

**Why this is necessary:**

1. **Predictable AST Structure** - The generator can reliably parse TypeScript AST nodes
2. **Type Extraction** - Request/response types are consistently accessible
3. **No Ambiguity** - Cannot deviate from the pattern, ensuring generator compatibility
4. **Future-Proof** - Additional metadata can be added without breaking changes

Without these wrappers, the generator would have to handle countless variations of function signatures, making reliable type extraction impossible.

### Method Name Prefixes

The generator automatically adds prefixes to method names based on contract type:

| Contract Type   | Prefix         | Example                                       |
| --------------- | -------------- | --------------------------------------------- |
| Invoke          | `invoke`       | `AddNumbers` → `invokeAddNumbers()`           |
| Event           | `send`         | `Quit` → `sendQuit()`                         |
| Broadcast       | `on`           | `Ping` → `onPing(callback)`                   |
| Stream Invoke   | `invokeStream` | `GetLargeData` → `invokeStreamGetLargeData()` |
| Stream Upload   | `upload`       | `UploadFile` → `uploadUploadFile()`           |
| Stream Download | `download`     | `DownloadLogs` → `downloadDownloadLogs()`     |

**Benefits:**

- **Self-Documenting** - Method name reveals communication pattern
- **No Naming Conflicts** - Different contract types can use same base name
- **Consistent API** - Predictable naming across all generated methods

Example:

```typescript
// Contract definition
export type InvokeContracts = GenericInvokeContract<{
  GetUser: IInvokeContract<number, User>
}>

// Generated API (automatic 'invoke' prefix)
const user = await window.api.invokeGetUser(123)
```

### Generator Pipeline

1. **Parse TypeScript** - Use ts-morph to analyze IPC contract interfaces
2. **Extract Contract Types** - Identify invoke/event/send contracts
3. **Generate Code** - Create type-safe wrapper functions
4. **Write Output** - Save generated code to preload directory

### Generated Code Structure

For each contract type, the generator creates:

#### Invoke Contracts (Renderer ↔ Main, Request/Response)

```typescript
// Main process - register handler
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, params) => {
      return params.a + params.b
    },
  }
}
RegisterHandler.register()

// Renderer process - call and await
const result = await window.api.invokeAddNumbers({ a: 5, b: 3 })
```

#### Event Contracts (Renderer → Main)

```typescript
// Main process - listen to events
class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    Quit: () => app.quit(),
  }
}
RegisterEvent.register()

// Renderer process - send event
window.api.sendQuit()
```

#### Broadcast Contracts (Main → Renderer, one-way)

```typescript
// Contract definition
export type BroadcastContracts = GenericBroadcastContract<{
  Ping: IBroadcastContract<number>
}>

// Option 1: Generated main broadcast API (recommended)
import { mainBroadcast } from './broadcast-generated'
mainBroadcast.Ping(mainWindow, 42)

// Option 2: Runtime broadcast helper (alternative)
import { createBroadcast } from '@number10/electron-ipc'
const mainBroadcast = createBroadcast<BroadcastContracts>()
mainBroadcast('Ping', mainWindow, 42)

// Renderer process - listen
window.api.onPing((count) => console.log(`Ping ${count}`))
```

### Type Safety Mechanism

The generator ensures **compile-time type safety** through:

1. **Interface Definitions** - Contracts defined as TypeScript interfaces
2. **Generic Constraints** - Type parameters constrain allowed methods and signatures
3. **Generated Types** - Output includes full type definitions with exact signatures
4. **Context Bridge** - Types preserved across process boundary
5. **Immediate Validation** - TypeScript compiler catches mismatches instantly

**Key Advantage:** Change a contract interface → TypeScript shows errors in all implementations before you run the code. No runtime surprises!

Example:

````typescript
Example:

```typescript
// Contract definition
export type InvokeContracts = GenericInvokeContract<{
  GetUser: IInvokeContract<number, User>
}>

// Handler implementation
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    GetUser: async (_event, id) => {
      // TypeScript knows 'id' is number
      // Return type must be User or compile error
      return fetchUser(id)
    },
  }
}
RegisterHandler.register()

// Renderer usage
const user = await window.api.GetUser(123)
// TypeScript knows 'user' is User type
// Passing wrong type → immediate compile error
await window.api.invokeGetUser("123") // ❌ Error: Argument of type 'string' is not assignable to parameter of type 'number'
````

This compile-time validation extends to:

- Parameter types and order
- Return types (including Promise wrapping)
- Optional vs required parameters
- Broadcast payloads
- Event callback signatures

### AST Transformation

````

This compile-time validation extends to:

- Parameter types and order
- Return types (including Promise wrapping)
- Optional vs required parameters
- Broadcast payloads
- Event callback signatures

### AST Transformation

The generator uses ts-morph to:

- Parse interface declarations
- Extract method signatures
- Analyze parameter types
- Generate corresponding IPC handlers
- Preserve JSDoc comments

## Electron Process Architecture

### Main Process

- **Node.js Environment** - Full access to Node APIs and Electron modules
- **Window Management** - Creates and manages BrowserWindow instances
- **IPC Handlers** - Registers handlers for invoke/event/send contracts
- **File System Access** - Can read/write files, access system resources

### Preload Process

- **Bridge Layer** - Sits between main and renderer
- **Context Isolation** - Secure boundary between processes
- **API Exposure** - Exposes selected APIs via contextBridge
- **Type Preservation** - Maintains TypeScript types across boundary

### Renderer Process

- **Browser Environment** - Runs in Chromium with limited Node access
- **React UI** - User interface using React components
- **Type-Safe API** - Access to window.api with full IntelliSense
- **Event Handling** - Listens to events from main process

## Build System

### Library Build (electron-ipc)

**Vite Configuration:**

- Entry points: `src/index.ts` (library) + `src/bin/generate-api.ts` (CLI)
- Output formats: ESM (`.mjs`) + CommonJS (`.cjs`)
- External dependencies: ts-morph, electron
- Type definitions: Generated via vite-plugin-dts

### Electron App Build (test-app)

**electron-vite Configuration:**

- **Main Process**: Bundles TypeScript to Node.js compatible code
- **Preload Process**: Bundles with context isolation support
- **Renderer Process**: Vite + React with HMR support
- Source maps enabled for debugging
- No minification in development

**Other Bundler Examples:**

The repository includes minimal examples with alternative bundlers:
- `apps/esbuild-minimal` - esbuild bundler with custom build script
- `apps/webpack-minimal` - webpack with separate configs for main/preload/renderer
- `apps/parcel-minimal` - Parcel 2.x with zero-config setup

Each demonstrates electron-ipc integration with different build tooling.

## Security Considerations

### Context Isolation

All IPC communication goes through the preload script with `contextBridge.exposeInMainWorld()`. This prevents the renderer from directly accessing Node.js APIs.

### Type Validation

The generator creates type-safe wrappers, but runtime validation should be added for production use:

```typescript
mainInvoke.handle('saveFile', (path, content) => {
  // Validate input
  if (typeof path !== 'string' || typeof content !== 'string') {
    throw new Error('Invalid arguments')
  }
  // Process request
})
````

### CSP (Content Security Policy)

The test app includes CSP headers to prevent XSS attacks:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"
/>
```

## Testing Strategy

### Unit Tests

- **Generator Tests** - Verify AST parsing and code generation
- **API Tests** - Test generated IPC wrappers
- **Vitest** - Fast unit test runner with coverage

### Integration Tests

- **Multiple Test Apps** - Various bundler configurations tested:
  - `apps/test-app` - Full-featured app with electron-vite
  - `apps/multi-window` - Multi-window IPC scenarios
  - `apps/high-volume-test` - Performance and stress testing
  - `apps/esbuild-minimal`, `apps/webpack-minimal`, `apps/parcel-minimal` - Bundler compatibility
- **Electron Spectator** - End-to-end testing (future)
- **Manual Testing** - Via example applications

### Debugging

- **VSCode Integration** - F5 to debug main process
- **Chrome DevTools** - Debug renderer process
- **Source Maps** - Enabled for all processes
- **Breakpoints** - Work in TypeScript source files

## Performance Optimization

### Build Performance

- **Incremental Builds** - TypeScript composite projects
- **Caching** - Vite caches dependencies
- **Parallel Builds** - pnpm runs package builds in parallel

### Runtime Performance

- **Minimal Overhead** - Generated code is lightweight
- **Direct IPC** - No unnecessary abstraction layers
- **Tree Shaking** - Unused code removed in production builds

## Future Enhancements

### Implemented Features

- [x] Runtime validation decorators (`withInvokeValidation`, `withEventValidation`, etc.)
- [x] IPC call logging/debugging (IPC Inspector with trace system)
- [x] Support for streams (Stream Invoke, Stream Upload, Stream Download)
- [x] Multiple window support (Window Manager with registry and role-based broadcasts)

### Planned Features

- P1 (High): Transaction-level tracing and correlation
  Detail: Stable IDs for invoke/stream lifecycles, group related events in the Inspector UI, and expose end-to-end timings.
- P2 (High): Metrics view backed by the ring buffer
  Detail: p50/p95 latency, error rate, payload/byte volume, and stream throughput per channel and contract kind.
- P3 (Medium): Versioned export schema
  Detail: Add a `traceFormatVersion` and optional anonymized export to support reproducible bug reports and future tooling.
- P4 (Medium): Automatic multi-window metadata
  Detail: Enrich traces with windowRole/windowId from the Window Manager without manual user hooks.
- P5 (Low): Automatic error handling
  Detail: Standardize error payloads for invokes and streams; align with logging and validation output.
- P6 (Low): IPC middleware system
  Detail: Pre/post hooks for logging, validation, auth, and metrics without custom boilerplate.
- P7 (Low): Bi-directional invoke
  Detail: Renderer-to-renderer invocation routed via main with clear targeting and failure behavior.

### P1 Detail Plan

#### P1 (High): Transaction-level tracing and correlation

Goal: Provide stable, end-to-end trace IDs for invoke/stream lifecycles, with Inspector grouping and timing visibility.

Plan:

- **Trace envelope** - Define `traceId`, `spanId`, `parentSpanId`, and timestamps in an internal metadata envelope for invoke, stream, event, and broadcast records.
- **ID generation** - Generate `traceId` in the renderer for new user-initiated calls; allow propagation from an existing trace for nested or chained calls.
- **Propagation rules** - Carry trace metadata through invoke requests, stream chunk boundaries, and completion/error events; attach to outgoing broadcasts if triggered from a trace.
- **Ring buffer schema** - Extend the trace record schema (or attach sidecar metadata) to store `traceId` and start/end timestamps without breaking existing consumers.
- **Inspector UI** - Group by `traceId`, show a parent/child tree, compute end-to-end latency, and highlight incomplete or dangling spans.
- **Export compatibility** - Include trace metadata in exports; keep backward compatibility by making the envelope optional and versioned.
- **Tests** - Cover single invoke, nested invoke, and stream lifecycle correlation; verify grouping and timing accuracy.

Current status:

Done:

- Trace envelope fields (`traceId`, `spanId`, `parentSpanId`) are attached to trace events and stored in the ring buffer schema.
- Root trace/span ID generation is in place for invoke/event/broadcast/stream traces.
- Generated APIs accept an optional trace context for manual parent/child propagation.
- Automatic propagation carries trace context across invoke/event/stream payloads and broadcasts.
- Inspector UI groups spans by `traceId`, renders parent/child indentation, shows end-to-end timing, and highlights open spans.
- Exports include `traceFormatVersion` for compatibility tracking.

Partial:

- Stream traces reuse the same span ID across lifecycle events; child spans for per-chunk work are not modeled.
- Basic UI grouping tests cover nested spans and stream lifecycle correlation; end-to-end correlation tests are still missing.

Open:

- None.

Risks / open questions:

- **Cross-process clocks** - Decide on monotonic vs wall-clock timestamps and normalize display for renderer/main drift.
- **Performance impact** - Measure overhead of metadata attachment and UI grouping for high-volume streams.

#### P1 (High): Plugin system for transformations

Goal: Provide a hookable generator pipeline that allows AST and output customization without forking.

Plan:

- **Intermediate model (IR)** - Introduce a stable, typed representation of contracts and generated outputs so plugins avoid raw AST fragility.
- **Hook points** - Expose `parse`, `transform`, and `emit` stages; allow plugins to modify the IR, naming, or output layout.
- **Plugin API** - Define a typed interface with metadata, ordering (before/after), and scoped options; include a `context` with ts-morph project and config.
- **Loading and config** - Support a generator config file that lists plugins and options; resolve relative paths and node_modules packages.
- **Safety and errors** - Fail fast with actionable errors; isolate plugin failures and show which hook and contract caused the error.
- **Compatibility** - Implement built-in transforms as default plugins to validate the system and preserve current output.
- **Tests and examples** - Provide a sample plugin (naming convention or file structure) and test plugin ordering and output stability.

Risks / open questions:

- **API stability** - Decide versioning for the plugin API and IR to avoid breaking third-party plugins.
- **Debuggability** - Define tracing/logging for plugin steps to ease troubleshooting.

### Extensibility Points

- P1 (High): Plugin system for transformations
  Detail: Hookable pipeline stages (parse/transform/emit) to adjust AST, naming, and output shape without forking.
- P2 (High): Custom type validators
  Detail: Adapter layer for Zod/io-ts/Valibot with consistent error payloads across invoke/event/stream.
- P3 (Medium): Custom code generators
  Detail: Support alternative output targets (framework-specific APIs) on top of a stable intermediate model.
- P4 (Low): Alternative transport layers
  Detail: Swap Electron IPC for MessagePort/WebSocket while keeping contracts and types consistent.

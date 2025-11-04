# Architecture

## Code Generator Design

### Generator Pipeline

1. **Parse TypeScript** - Use ts-morph to analyze IPC contract interfaces
2. **Extract Contract Types** - Identify invoke/event/send contracts
3. **Generate Code** - Create type-safe wrapper functions
4. **Write Output** - Save generated code to preload directory

### Generated Code Structure

For each contract type, the generator creates:

#### Invoke Contracts (Request/Response)

```typescript
// Main process
mainInvoke.handle('methodName', (arg1, arg2) => {
  return result
})

// Renderer process
const result = await window.api.methodName(arg1, arg2)
```

#### Event Contracts (Main → Renderer)

```typescript
// Main process
mainEvent.emit('eventName', payload)

// Renderer process
window.api.onEventName((payload) => {
  // Handle event
})
```

#### Send Contracts (Bidirectional)

```typescript
// Main process
mainSend.listen('messageName', (payload) => {
  // Handle message
})
mainSend.send('messageName', payload) // Broadcast to all windows

// Renderer process
window.api.messageName(payload) // Send to main
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

```typescript
// Contract definition
interface IInvokeContracts {
  GetUser: (id: number) => Promise<User>
}

// Handler implementation
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<IInvokeContracts> = {
    GetUser: async (_event, id) => {
      // TypeScript knows 'id' is number
      // Return type must be Promise<User> or compile error
      return fetchUser(id)
    },
  }
}

// Renderer usage
const user = await window.api.GetUser(123)
// TypeScript knows 'user' is User type
// Passing wrong type → immediate compile error
await window.api.GetUser('123') // ❌ Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

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
```

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

- **Electron Spectator** - End-to-end testing (future)
- **Manual Testing** - Via test-app Electron application

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

### Planned Features

- [ ] Runtime validation decorators
- [ ] Automatic error handling
- [ ] IPC call logging/debugging
- [ ] Performance monitoring
- [ ] Support for streams
- [ ] Bi-directional invoke (renderer → main → renderer)
- [ ] Multiple window support
- [ ] IPC middleware system

### Extensibility Points

- Custom code generators
- Plugin system for transformations
- Custom type validators
- Alternative transport layers

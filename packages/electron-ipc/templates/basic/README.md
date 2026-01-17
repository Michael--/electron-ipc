# Basic IPC Template

This is a **self-generating** template demonstrating `@number10/electron-ipc` best practices.

## 🎯 Key Feature: Template Uses Its Own Generator!

This template demonstrates **"eating your own dog food"** - it uses the electron-ipc code generator
to create its own IPC API, showing users the recommended workflow.

## 📁 Structure

### Hand-Written Files (Source of Truth)

- `ipc-api.ts` - **Contract definitions** (InvokeContracts, EventContracts, etc.)
- `ipc-config.yaml` - **Generator configuration**
- `main.ts` - Main process IPC handlers implementation
- `preload.ts` - Preload script (minimal, uses generated code)
- `renderer.ts` - Example renderer usage

### Auto-Generated Files (DO NOT EDIT)

- `ipc-api.generated.ts` - Preload API with type-safe wrappers
- `ipc-api-main-broadcast.ts` - Main process broadcast helpers

## 🚀 Quick Start

### 1. Copy Template to Your Project

```bash
cp -r templates/basic/* your-electron-app/
cd your-electron-app
```

### 2. Install Dependencies

```bash
pnpm install
# or: npm install / yarn install
```

### 3. Update tsconfig.json

Remove the `paths` mapping (only needed for monorepo development):

```jsonc
{
  "compilerOptions": {
    // ... other options ...
    // Remove this paths section:
    // "paths": {
    //   "@number10/electron-ipc": ["../../src/index.ts"]
    // }
  },
}
```

### 4. Update package.json Scripts

Change the generate script to use the globally/locally installed CLI:

```json
{
  "scripts": {
    "generate": "electron-ipc-generate --config=ipc-config.yaml",
    "clean": "rm -f *.generated.ts ipc-api-main-broadcast.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 5. Generate IPC Code

```bash
pnpm run generate
```

This creates:

- ✅ `ipc-api.generated.ts` - Preload API
- ✅ `ipc-api-main-broadcast.ts` - Main broadcast API

### 4. Use in Your App

**Main Process** (`main.ts`):

```typescript
import { sendPing } from './main'

// Send broadcast to window
sendPing(mainWindow)
```

**Renderer Process** (`renderer.ts`):

```typescript
// Type-safe IPC calls!
const result = await window.api.invokeAddNumbers({ a: 1, b: 2 })
console.log(result) // 3
```

## 🔄 Development Workflow

1. **Define contracts** in `ipc-api.ts`
2. **Run generator** (`pnpm run generate`)
3. **Implement handlers** in `main.ts`
4. **Use generated API** in renderer

### Watch Mode (Auto-Regenerate)

```bash
electron-ipc-generate --config=ipc-config.yaml --watch
```

## 📝 Modifying Contracts

Edit `ipc-api.ts`:

```typescript
export type InvokeContracts = GenericInvokeContract<{
  // Add your custom contracts
  GetUser: IInvokeContract<{ id: number }, User>
  SaveData: IInvokeContract<{ data: MyData }, void>
}>
```

Then re-generate:

```bash
pnpm run generate
```

Generated code automatically updates with new type-safe methods:

- `window.api.invokeGetUser({ id: 123 })`
- `window.api.invokeSaveData({ data: ... })`

## ✅ Benefits

### For Users

- **Type-safe IPC** - Compile-time checks for all IPC calls
- **Auto-generated boilerplate** - Focus on business logic
- **Self-documenting** - Contract definitions serve as API docs
- **Minimal errors** - Can't call wrong channels or pass wrong types

### For Template Design

- **Shows best practices** - Template follows recommended patterns
- **Always up-to-date** - Template uses latest generator features
- **Dogfooding** - Tests generator on real-world usage
- **Educational** - Users learn by example

## 🗑️ Cleaning Generated Files

```bash
pnpm run clean
# Removes: *.generated.ts and ipc-api-main-broadcast.ts
```

## 📚 Integration with Your Build

Add to your `package.json`:

```json
{
  "scripts": {
    "generate-ipc": "electron-ipc-generate --config=ipc-config.yaml",
    "prebuild": "pnpm run generate-ipc",
    "predev": "pnpm run generate-ipc"
  }
}
```

Now IPC code regenerates automatically before builds!

## 🎓 Learning Resources

- **API Documentation**: See generated `ipc-api.generated.ts` for available methods
- **Contract Types**: Check `ipc-api.ts` for examples of all contract types
- **Handler Implementation**: See `main.ts` for handler patterns

## 🔍 What Gets Generated?

### Preload API (`ipc-api.generated.ts`)

For each contract type:

- ✅ Type-safe wrapper functions
- ✅ `contextBridge.exposeInMainWorld()` setup
- ✅ Error handling
- ✅ Stream support (where applicable)

### Main Broadcast API (`ipc-api-main-broadcast.ts`)

For BroadcastContracts:

- ✅ Helper functions like `mainBroadcast.Ping(window, payload)`
- ✅ Automatic window destroyed checks
- ✅ Type-safe payloads

## 🚫 .gitignore

Generated files are excluded via `.gitignore`:

```gitignore
*.generated.ts
ipc-api-main-broadcast.ts
```

**Why?** Generated code should not be committed - regenerate on build/install.

## 💡 Tips

1. **Always regenerate after changing contracts**
2. **Don't edit generated files** - changes will be overwritten
3. **Use watch mode during development**
4. **Commit only source files** (`ipc-api.ts`, `ipc-config.yaml`, etc.)

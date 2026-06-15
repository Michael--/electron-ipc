# Introduction

`@number10/electron-ipc` is a **TypeScript code generator and runtime helper package** for Electron applications. It turns plain TypeScript IPC contracts into generated APIs for the main process, preload script, and renderer.

It is meant for Electron teams that want IPC to be refactor-friendly, discoverable in the IDE, and checked by TypeScript before the app starts.

## What You Get

Install the package and you get:

- `electron-ipc-generate` - CLI that reads TypeScript contracts and writes generated IPC code
- Contract helper types for invoke, events, broadcasts, renderer-to-renderer calls, and streams
- Main-process handler helpers with typed parameters and responses
- Preload APIs that expose typed renderer methods through Electron's `contextBridge`
- Optional runtime modules for validation, middleware, React hooks, window management, and IPC inspection

The example apps in the repository only show integrations. The documented product is the publishable `@number10/electron-ipc` package.

## How It Works

You define **IPC contracts** as plain TypeScript types — the generator reads them and produces fully typed APIs for your main process, preload script, and renderer. No manual `ipcMain.handle` / `ipcRenderer.invoke` wiring, no string-based channel names, no `any` types.

```typescript
// You write this once…
export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>

// …and the generator creates type-safe APIs everywhere:
const sum = await window.myApi.invokeAddNumbers({ a: 5, b: 3 }) // ✅ number
```

## Why It Matters

Electron IPC often starts as a handful of string channels and grows into duplicated code across main, preload, and renderer files. This package keeps that boundary explicit: contracts define the API, generated code handles the repetitive wiring, and TypeScript checks callers and handlers when the contract changes.

Use it when you want:

- IPC payload and return types checked at compile time
- Autocomplete for renderer-facing APIs
- Safer refactors when channel names or payload shapes change
- Less repeated `ipcMain`, `ipcRenderer`, and `contextBridge` code
- Optional runtime validation for data that crosses trust boundaries

## Why a Generator?

Generated code is **still plain TypeScript** — you keep full IDE support (autocomplete, jump-to-definition, refactoring). The generator eliminates repetitive IPC boilerplate while preserving everything you expect from a typed codebase.

| Without generator                      | With electron-ipc                         |
| -------------------------------------- | ----------------------------------------- |
| Manual `ipcMain.handle` strings        | Auto-generated handler types              |
| `ipcRenderer.invoke('add-numbers', …)` | `window.myApi.invokeAddNumbers({ a, b })` |
| Cast results with `as`                 | Result type inferred from contract        |
| Rename channel → runtime bug           | Rename contract → compile error           |

## Key Concepts

- **Contracts** — TypeScript types that define IPC communication signatures
- **Generator** — CLI tool (`electron-ipc-generate`) that reads contracts and outputs typed APIs
- **Five IPC patterns** — Invoke, Event, Broadcast, Renderer-to-Renderer, and Streams
- **Optional runtime modules** — Window Manager, IPC Inspector, Validation adapters

## Supported IPC Patterns

| Pattern             | Direction           | Use case                         |
| ------------------- | ------------------- | -------------------------------- |
| **Invoke**          | Renderer ↔ Main     | Request/response (like HTTP GET) |
| **Event**           | Renderer → Main     | Fire-and-forget commands         |
| **Broadcast**       | Main → Renderer     | Push notifications to windows    |
| **Renderer Invoke** | Renderer ↔ Renderer | Multi-window communication       |
| **Streams**         | Renderer ↔ Main     | Large data, real-time feeds      |

See [Architecture](./architecture) for details on each pattern.

## Next Steps

- **New to electron-ipc?** → [Quick Start](./quick-start)
- **Ready to install?** → [Installation](./installation)
- **Deep dive?** → [Overview](./overview)

# Introduction

Electron IPC is a **TypeScript code generator** that creates type-safe IPC (Inter-Process Communication) APIs for Electron applications.

## What It Does

You define **IPC contracts** as plain TypeScript types — the generator reads them and produces fully typed APIs for your main process, preload script, and renderer. No manual `ipcMain.handle` / `ipcRenderer.invoke` wiring, no string-based channel names, no `any` types.

```typescript
// You write this once…
export type InvokeContracts = GenericInvokeContract<{
  AddNumbers: IInvokeContract<{ a: number; b: number }, number>
}>

// …and the generator creates type-safe APIs everywhere:
const sum = await window.myApi.invokeAddNumbers({ a: 5, b: 3 }) // ✅ number
```

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

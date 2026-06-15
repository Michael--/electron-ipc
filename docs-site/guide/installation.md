# Installation

## Prerequisites

- **Node.js** ≥ 18.0.0
- **Electron** ≥ 28.0.0
- **TypeScript** ≥ 5.0.0 (strict mode recommended)
- A package manager: **npm**, **pnpm**, or **yarn**

## Install the Package

::: code-group

```bash [pnpm]
pnpm add @number10/electron-ipc
```

```bash [npm]
npm install @number10/electron-ipc
```

```bash [yarn]
yarn add @number10/electron-ipc
```

:::

The package ships with:

- The **code generator** CLI (`electron-ipc-generate`)
- All **runtime helpers** (handler base classes, validation adapters, window manager, inspector)
- **TypeScript declarations** for everything

## Peer Dependencies

You need these in your project (they are **not** bundled):

| Package      | Why                                                        |
| ------------ | ---------------------------------------------------------- |
| `electron`   | IPC primitives (`ipcMain`, `ipcRenderer`, `contextBridge`) |
| `typescript` | Contract type definitions                                  |
| `yaml`       | YAML config parsing for the generator                      |

Install them if not already present:

```bash
pnpm add -D electron typescript
pnpm add yaml
```

## CLI Setup

Add a generate script to your `package.json`:

```json
{
  "scripts": {
    "generate": "electron-ipc-generate --config=./ipc-config.yaml",
    "generate:watch": "electron-ipc-generate --config=./ipc-config.yaml --watch"
  }
}
```

The generator needs a YAML config file — see [Quick Start](./quick-start) to create one.

## Optional: Scaffold a New Project

To get a complete Electron + Vite + React app with IPC contracts pre-configured:

::: code-group

```bash [pnpm]
pnpm dlx @number10/create-electron-ipc
```

```bash [npm]
npm create @number10/electron-ipc
```

```bash [npx]
npx @number10/create-electron-ipc
```

:::

This scaffolds everything: contracts, generator config, preload, handlers, and optionally the IPC Inspector and validation adapters.

## Verify Installation

```bash
# Check the CLI is available
npx electron-ipc-generate --help

# Or via the script you added:
pnpm run generate --help
```

## Next Step

Head to [Quick Start](./quick-start) to wire up your first IPC call in under 5 minutes.

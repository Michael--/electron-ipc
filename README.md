# Electron IPC Code Generator

<p align="center">
  <img src="packages/electron-ipc/assets/logo-light.svg" width="200" alt="Electron IPC Logo">
</p>

Type-safe IPC communication generator for Electron applications.

## Overview

This monorepo contains a TypeScript code generator that creates type-safe IPC (Inter-Process Communication) APIs for Electron applications. It eliminates boilerplate code and ensures type safety across main, preload, and renderer processes.

**The Key Benefit:** When you change an IPC contract interface, TypeScript immediately shows compile errors everywhere the contract is used incorrectly - before you even run the code. No runtime surprises!

## 📦 Packages

### `packages/electron-ipc`

The main library - a TypeScript code generator that creates type-safe IPC communication code for Electron applications.

**Status:** 🚧 Under active development

### `packages/electron-ipc-react`

React hooks for seamless integration of IPC calls in React components. Provides automatic state management, loading states, and error handling.

**Status:** ✅ Available

### `packages/test-app`

A full Electron application that serves as a test environment and reference implementation for the `electron-ipc` library. Demonstrates both core API and React hooks usage.

## 🚀 Getting Started

## 🚀 Getting Started

### Prerequisites

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

### Working on Individual Packages

```bash
# electron-ipc library
cd packages/electron-ipc
pnpm run build
pnpm run watch

# test-app
cd packages/test-app
pnpm run dev
```

## 📁 Project Structure

```
electron-ipc/
├── packages/
│   ├── electron-ipc/        # Generator library (publishable)
│   │   ├── src/
│   │   │   ├── generator/   # Code generation logic
│   │   │   ├── interfaces/  # TypeScript interfaces
│   │   │   └── index.ts
│   ├── electron-ipc-react/  # React hooks package (publishable)
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── README.md
│   └── test-app/            # Electron test application (private)
│       ├── src/
│       │   ├── main/        # Main process code
│       │   ├── preload/     # Preload scripts
│       │   └── renderer/    # Renderer process (React)
│       └── public/          # React components
```

│ │
│ └── test-app/ # Electron test environment
│ ├── src/
│ │ ├── main/ # Main process
│ │ ├── preload/ # Preload scripts
│ │ └── renderer/ # React UI
│ └── package.json
│
├── docs/ # Detailed documentation
├── package.json # Workspace root
└── tsconfig.json # Base TypeScript config

```

## 🎯 Benefits

✅ **Four Communication Patterns** - Invoke (request-response), Events (fire-and-forget), Broadcasts (main → renderer), Streams (large data/real-time)
✅ **Compile-Time Type Safety** - Change a contract interface → TypeScript shows errors immediately in all usages
✅ **No Runtime Surprises** - Catch signature mismatches before running the app
✅ **IntelliSense Everywhere** - Auto-completion in main, preload, and renderer processes
✅ **Refactoring Support** - Rename/change contracts → TypeScript guides you to fix all usages
✅ **Zero Boilerplate** - Auto-generated IPC wrappers and type definitions
✅ **Single Source of Truth** - IPC contracts defined once, validated everywhere

## 📚 Documentation

For detailed usage, API reference, and examples, see [`docs/README.md`](docs/README.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 🛠 Technology Stack

- **TypeScript** - Strict mode, ES2022
- **Vite** - Build tool for library
- **electron-vite** - Build tool for Electron app
- **React** - UI framework for test app
- **Vitest** - Testing framework
- **ESLint** - Code linting (flat config)
- **Prettier** - Code formatting (no semicolons)
- **Husky** - Git hooks
- **ts-morph** - TypeScript AST manipulation

## 🤝 Contributing

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

## 📝 License

MIT
```

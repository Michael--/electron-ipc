# Electron IPC Monorepo

A TypeScript code generator for type-safe Electron IPC communication, with an integrated test application.

## 📦 Packages

### `packages/electron-ipc`
The main library - a TypeScript code generator that creates type-safe IPC communication code for Electron applications.

**Status:** 🚧 Under active development

### `packages/test-app`
A full Electron application that serves as a test environment and reference implementation for the `electron-ipc` library.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install all dependencies
npm install
```

This will install dependencies for all packages and build the workspace.

### Development

```bash
# Build all packages
npm run build

# Clean all build outputs
npm run clean

# Run the test app
npm run dev

# Watch mode for the library (in separate terminal)
npm run dev:lib
```

### Working on Individual Packages

```bash
# electron-ipc library
cd packages/electron-ipc
npm run build
npm run watch

# test-app
cd packages/test-app
npm run dev
```

## 📁 Project Structure

```
electron-ipc/
├── packages/
│   ├── electron-ipc/        # The publishable library
│   │   ├── src/
│   │   │   ├── generator/   # Code generation logic
│   │   │   ├── interfaces/  # TypeScript interfaces
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── test-app/            # Electron test application
│       ├── src/
│       │   ├── main/        # Main process
│       │   ├── renderer/    # Renderer process
│       │   └── preload/     # Preload scripts
│       └── package.json
│
├── package.json             # Root workspace config
└── tsconfig.json            # Base TypeScript config
```

## 🎯 Goals

- **Type Safety:** Generate fully type-safe IPC communication code
- **Developer Experience:** Reduce boilerplate and prevent runtime errors
- **Testability:** Provide a real-world test environment
- **Publishability:** Clean, reusable library ready for npm/GitHub

## 📝 License

MIT

## 🤝 Contributing

This project is in early development. Documentation and contribution guidelines will be added as the API stabilizes.

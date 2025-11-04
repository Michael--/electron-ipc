# Electron IPC Test App

This is a test application for the `electron-ipc` library.

## Purpose

- Provides a real Electron environment to test the IPC code generator
- Demonstrates usage patterns of the library
- Serves as a development sandbox

## Running

```bash
# From the root of the monorepo
npm install
npm run build

# From this package
cd packages/test-app
npm run dev
```

## Structure

- `src/main/` - Main process code
- `src/renderer/` - Renderer process code
- `src/preload/` - Preload scripts for context bridge
- `public/` - HTML and static assets

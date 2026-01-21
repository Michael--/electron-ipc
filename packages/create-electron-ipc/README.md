# @number10/create-electron-ipc

Scaffold a new Electron app using `@number10/electron-ipc` with a production-ready Vite + React setup.

[![npm version](https://img.shields.io/npm/v/@number10/create-electron-ipc.svg)](https://www.npmjs.com/package/@number10/create-electron-ipc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Quick Start

**macOS/Linux:**

```bash
npm create @number10/electron-ipc
```

**Windows:**

```bash
npx @number10/create-electron-ipc
```

> **Important:** Always use forward-slash `/` (not backslash `\`) in the package name, even on Windows. Use `npx` instead of `npm create` on Windows.

**With options:**

```bash
npx @number10/create-electron-ipc --name my-app --validation zod --inspector y
```

**Using pnpm (all platforms):**

```bash
pnpm dlx @number10/create-electron-ipc
```

## What You Get

- **Electron 35** + **Vite 5** + **React 19** starter
- **Type-safe IPC contracts** (invoke, event, broadcast)
- **TypeScript strict mode** with comprehensive configuration
- **ESLint 9** (flat config) + **Prettier** pre-configured
- **VS Code** workspace settings and debug configuration
- Optional **IPC Inspector** for debugging
- Optional **runtime validation** (Zod or Valibot)
- Production-ready **build configuration** with electron-builder

## CLI Options

```
--dir <path>              Target directory (default: current directory)
--name <name>             Package name (default: directory name)
--product-name <name>     Product name (default: formatted package name)
--app-id <id>             Application ID (default: com.example.<name>)
--author <name>           Author name
--pm <manager>            Package manager: pnpm, npm (default: pnpm)
--inspector <y/n>         Include IPC Inspector (default: n)
--validation <type>       Validation: none, zod, valibot (default: none)
--no-install              Skip dependency installation
--help, -h                Show help message
```

## Project Structure

The generated project includes:

```
my-app/
├── src/
│   ├── main/              # Main process code
│   │   ├── index.ts       # Entry point + window setup
│   │   ├── ipc-api.ts     # IPC contract definitions
│   │   └── ipc-config.yaml # Generator configuration
│   └── preload/           # Preload script (context bridge)
│       └── index.ts
├── public/                # Renderer process (React)
│   ├── App.tsx            # Main React component
│   ├── index.html         # HTML entry
│   ├── renderer.tsx       # React setup
│   └── components/        # React components
├── dist/                  # Generated IPC code
└── out/                   # Built application
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build app for production
- `npm run generate` - Generate IPC contracts from config
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run package` - Package app for distribution

## Requirements

- Node.js ≥20.0.0
- npm or pnpm

## Local Development

From the monorepo root:

```bash
node packages/create-electron-ipc/bin/create-electron-ipc.js --dir ./tmp-app
```

Or test the packed version:

```bash
pnpm pack
npx -y --package ./number10-create-electron-ipc-0.1.0.tgz create-electron-ipc
```

## Learn More

- [electron-ipc Documentation](https://github.com/number10/electron-ipc)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Vite Documentation](https://vitejs.dev/)

## License

MIT © Michael Rieck

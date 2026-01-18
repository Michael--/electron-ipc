# Example: electron-vite

This example mirrors the `apps/test-app` setup and keeps generation in a separate terminal.

## 1) Add template files

Copy the files from `packages/electron-ipc/templates/basic/` into your project:

- `src/main/ipc-api.ts`
- `src/main/ipc-config.yaml`
- `src/preload/preload.ts` (or merge into your existing preload)

## 2) Add scripts

```json
{
  "scripts": {
    "generate": "electron-ipc-generate --config=./src/main/ipc-config.yaml",
    "generate:watch": "electron-ipc-generate --config=./src/main/ipc-config.yaml --watch",
    "generate:check": "electron-ipc-generate --config=./src/main/ipc-config.yaml --check"
  }
}
```

Run `pnpm run generate:watch` in a separate terminal while developing.

## 3) Use the generated API

Preload:

```ts
import { exposeApi, ApiType } from './ipc-api.generated'

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()
```

Renderer:

```ts
const result = await window.api.invokeAddNumbers({ a: 1, b: 2 })
```

Main:

```ts
import { AbstractRegisterHandler, IPCHandlerType } from '@number10/electron-ipc'
import { InvokeContracts } from './ipc-api'
```

## 4) Optional path alias

If you want a stable alias for generated files, add this to your `electron.vite.config.ts`:

```ts
resolve: {
  alias: {
    '@gen': resolve(__dirname, 'dist'),
  },
}
```

Then import from `@gen/ipc-api.generated`.

# Example: electron-forge

This example focuses on wiring generator output into a Forge app.

## 1) Add template files

Copy the files from `packages/electron-ipc/templates/basic/` into your project:

- `src/main/ipc-api.ts`
- `src/main/ipc-config.yaml`
- `src/preload/preload.ts`

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

## 3) Wire preload + renderer

Preload exposes the generated API:

```ts
import { exposeApi, ApiType } from './ipc-api.generated'

declare global {
  interface Window {
    api: ApiType
  }
}

exposeApi()
```

Renderer uses the API:

```ts
const result = await window.api.invokeAddNumbers({ a: 1, b: 2 })
console.log('Result:', result) // 3
```

## 4) Handle in Main Process

Implement handlers for your contracts:

```ts
import { app } from 'electron'
import {
  AbstractRegisterHandler,
  AbstractRegisterEvent,
  IPCHandlerType,
  IPCEventType,
} from '@number10/electron-ipc'
import { InvokeContracts, EventContracts } from './ipc-api'

class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    AddNumbers: async (_event, { a, b }) => a + b,
  }
}

class RegisterEvent extends AbstractRegisterEvent {
  events: IPCEventType<EventContracts> = {
    LogMessage: (_event, message) => console.log('[Renderer]', message),
  }
}

app.whenReady().then(() => {
  RegisterHandler.register()
  RegisterEvent.register()
  // Create your main window...
})
```

## 5) Build/CI

In CI, run `pnpm run generate:check` to ensure generated files are up to date.

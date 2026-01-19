# Example: electron-vite

This example mirrors the `apps/test-app` setup and keeps generation in a separate terminal.

> **Reference Apps:** For complete working examples, see:
>
> - `apps/test-app` - Full-featured app with React
> - `apps/multi-window` - Multi-window IPC flows
> - `apps/high-volume-test` - Inspector stress testing

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

## 4) Optional: React Hooks

Add `reactHooksOutput` to your config for automatic React hook generation:

```yaml
apis:
  - name: api
    # ... existing config
    reactHooksOutput: ./src/renderer/hooks/api-hooks.ts
```

Then use hooks in React components:

```tsx
import { useInvokeContracts } from './hooks/api-hooks'

function Calculator() {
  const { data, loading, error, invoke } = useInvokeContracts('AddNumbers')

  const handleAdd = () => invoke({ a: 5, b: 3 })

  return (
    <div>
      <button onClick={handleAdd}>Add 5 + 3</button>
      {loading && <p>Loading...</p>}
      {data && <p>Result: {data}</p>}
    </div>
  )
}
```

## 5) Optional: Path Alias

If you want a stable alias for generated files, add this to your `electron.vite.config.ts`:

```ts
resolve: {
  alias: {
    '@gen': resolve(__dirname, 'dist'),
  },
}
```

Then import from `@gen/ipc-api.generated`.

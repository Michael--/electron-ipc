# @number10/electron-ipc-react

React hooks for type-safe Electron IPC communication.

This package provides React hooks that integrate with the `@number10/electron-ipc` library for seamless, type-safe IPC communication in Electron applications.

## Installation

```bash
npm install @number10/electron-ipc-react
# or
pnpm add @number10/electron-ipc-react
# or
yarn add @number10/electron-ipc-react
```

## Usage

First, generate the hooks using the electron-ipc generator:

```bash
electron-ipc-generate --input=./src/main/ipc-api.ts --invoke=InvokeContracts --event=EventContracts --send=BroadcastContracts --react-hooks=./src/preload/react-hooks.ts
```

Then use the generated hooks in your React components:

```tsx
import { useInvoke, useBroadcast } from './src/preload/react-hooks'

function MyComponent() {
  const { data, loading, error, invoke } = useInvoke('AddNumbers')
  const { data: pingCount } = useBroadcast('Ping')

  const handleAdd = async () => {
    await invoke({ a: 1, b: 2 })
  }

  return (
    <div>
      <button onClick={handleAdd} disabled={loading}>
        {loading ? 'Adding...' : 'Add Numbers'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {data && <p>Result: {data}</p>}
      <p>Ping count: {pingCount ?? 0}</p>
    </div>
  )
}
```

## Available Hooks

### useInvoke

For bidirectional IPC calls (Renderer ↔ Main).

```tsx
const { data, loading, error, invoke } = useInvoke('ChannelName')
```

- `data`: Response data or `null`
- `loading`: Boolean indicating if request is in progress
- `error`: Error object or `null`
- `invoke(request)`: Function to send the request

### useEvent

For unidirectional events (Renderer → Main).

```tsx
const { send } = useEvent('ChannelName')
```

- `send(request)`: Function to send the event

### useBroadcast

For unidirectional broadcasts (Main → Renderer).

```tsx
const { data, subscribe } = useBroadcast('ChannelName')
```

- `data`: Latest broadcast payload or `null`
- `subscribe(callback?)`: Function to manually subscribe with optional callback

## Benefits

- **Reduced Boilerplate**: No manual state management for IPC calls
- **Type Safety**: Full TypeScript support with inferred types
- **Error Handling**: Built-in error states and loading indicators
- **Automatic Cleanup**: Broadcast subscriptions are automatically cleaned up
- **React Integration**: Works seamlessly with React's rendering cycle

## Peer Dependencies

- `react >= 16.8.0` (for hooks)
- `@number10/electron-ipc` (core library)

## License

MIT

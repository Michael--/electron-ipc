# Multi-Window Test App

This app demonstrates multi-window IPC flows using `@number10/electron-ipc`, including
window registry integration, role-based broadcasts, and the IPC Inspector.

## Run

```bash
pnpm --filter electron-ipc-multi-window run dev
```

## What to Try

- Open multiple secondary windows from the menu.
- Send broadcasts to all windows or a specific role.
- Watch the IPC Inspector to see cross-window events.

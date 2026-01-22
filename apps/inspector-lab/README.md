# Inspector Lab

Purpose: A focused Electron app to generate IPC traffic for the Inspector (invokes, events,
broadcasts, streams, and synthetic trace statuses).

## Setup

- Generate IPC bindings:
  - `pnpm --filter electron-ipc-inspector-lab generate:all`
- Run the app:
  - `pnpm --filter electron-ipc-inspector-lab dev`

The Inspector window opens automatically on app start.

## Dashboard walkthrough

- Quick actions: add numbers, slow invoke, intentional error, log event, broadcast pulses.
- Trace simulator: emit synthetic statuses (ok/error/timeout/cancelled) for any trace kind.
- Streams lab: stream invoke (ticks), stream download (snapshots), stream upload (chunks).
- Activity stream: recent actions and outcomes.

## Inspector checklist

- Invoke ok: AddNumbers + Slow.
- Invoke error: Fail.
- Event: Log (info/warn/error).
- Broadcast: Pulse (confirm renderer receives count).
- Stream invoke: Ticks (ok + failAt + cancel).
- Stream download: Snapshots (ok + cancel).
- Stream upload: Chunks (start, send, complete, abort).
- Trace status coverage: timeout/cancelled via simulator.

## Implementation notes

- Contracts: `apps/inspector-lab/src/main/ipc-api.ts`,
  `apps/inspector-lab/src/main/ipc-api-stream.ts`.
- Main handlers + synthetic traces: `apps/inspector-lab/src/main/index.ts`.
- Dashboard UI: `apps/inspector-lab/public/App.tsx`.

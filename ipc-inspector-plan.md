# IPC Inspector – Implementierungsplan (für VS Code KI / Copilot)

Dieser Plan beschreibt die schrittweise Implementierung eines **IPC Inspectors** für  
`@number10/electron-ipc`.  
Er ist bewusst so formuliert, dass er direkt als **Prompt / Arbeitsgrundlage für die VS-Code-KI** dienen kann.  
Die konkrete Code-Ausarbeitung erfolgt in einem zweiten Schritt.

---

## Ziel

Ein **Devtool für Electron**, das IPC sichtbar macht – ähnlich dem Network-Tab im Browser:

- invoke / event / broadcast / streaming
- Quelle & Ziel (Renderer / Main / Window)
- Dauer, Payload-Größe, Status, Errors
- Live-Ansicht + Export für Bugreports
- **opt-in**, **dev-only**, kein Einfluss auf Production Builds

---

## Rahmenbedingungen

- ❌ Kein globales Monkeypatching von Electron
- ✅ Instrumentation **nur** in den eigenen IPC-Abstraktionen
- ✅ Default: payload **redacted**
- ✅ Inspector vollständig deaktivierbar
- ❌ Keine Breaking Changes für bestehende Nutzer

---

## Deliverables

1. Neues Paket oder Subpath  
   `@number10/electron-ipc-inspector`  
   _(alternativ: `@number10/electron-ipc/inspector`)_

2. Main-seitiger Inspector Server
   - Ringbuffer
   - Pub/Sub zu Inspector UI

3. Inspector UI
   - eigenes BrowserWindow
   - Live-Log + Filter + Export

4. Öffentliche API

   ```ts
   enableIpcInspector(options?)
   ```

5. Interner Trace-Hook

   ```ts
   trace.emit(event)
   ```

6. Dokumentation + Minimalbeispiel

---

## Phase 0 – Design & Contracts

### 0.1 Datenmodell (`types.ts`)

```ts
type Direction = 'renderer→main' | 'main→renderer'
type TraceKind =
  | 'invoke'
  | 'event'
  | 'broadcast'
  | 'streamInvoke'
  | 'streamUpload'
  | 'streamDownload'

type TraceStatus = 'ok' | 'error' | 'timeout' | 'cancelled'
```

#### Basisstruktur

```ts
interface TraceEventBase {
  id: string
  tsStart: number
  tsEnd?: number
  durationMs?: number
  direction: Direction
  kind: TraceKind
  channel: string
  apiName?: string
}
```

#### Source / Target

```ts
interface TraceSource {
  webContentsId: number
  windowId?: number
  url?: string
  title?: string
}

interface TraceTarget {
  webContentsId?: number
  windowId?: number
}
```

#### Payload Preview

```ts
interface PayloadPreview {
  mode: 'none' | 'redacted' | 'full'
  bytes?: number
  summary?: string
  data?: unknown
}
```

#### Trace Event (Union)

```ts
type TraceEvent = InvokeTrace | EventTrace | BroadcastTrace | StreamTrace
```

---

### 0.2 Inspector-IPC-Protokoll

| Channel             | Richtung  | Beschreibung                    |
| ------------------- | --------- | ------------------------------- |
| `INSPECTOR:HELLO`   | UI → Main | UI verbindet sich               |
| `INSPECTOR:INIT`    | Main → UI | Initialer Snapshot              |
| `INSPECTOR:EVENT`   | Main → UI | Live Trace Event                |
| `INSPECTOR:COMMAND` | UI → Main | clear / pause / resume / export |

---

### 0.3 Optionen

```ts
interface InspectorOptions {
  enabled?: boolean
  openOnStart?: boolean
  maxEvents?: number
  payloadMode?: 'none' | 'redacted' | 'full'
  maxPayloadPreviewBytes?: number
  shortcut?: string
}
```

Default:

- enabled: dev only
- payloadMode: `redacted`
- maxEvents: 5000
- maxPayloadPreviewBytes: 10_000

---

## Phase 1 – Main: Inspector Server

### 1.1 Ringbuffer

- Fixed size
- Überschreibt alte Events
- O(1) push

### 1.2 InspectorServer

- hält Ringbuffer
- verwaltet Subscribers (Inspector UI)
- API:
  ```ts
  push(event: TraceEvent)
  snapshot(): TraceEvent[]
  clear()
  pause()
  resume()
  ```

### 1.3 `enableIpcInspector()`

- prüft dev-only activation
- erzeugt Inspector BrowserWindow
- registriert Inspector IPC Channels
- registriert Trace Sink

---

## Phase 2 – Inspector UI

### 2.1 Technologie

- Minimal: HTML + TS
- Kein Framework nötig
- Optional: React + Vite

### 2.2 UI Features (MVP)

- Tabelle:
  - Zeit
  - Kind
  - Channel
  - Window
  - Dauer
  - Bytes
  - Status
- Filter / Suche
- Pause / Clear
- Export JSON
- Detailpanel (Payload / Error)

### 2.3 Datenfluss

- `HELLO` → `INIT`
- danach Live `EVENT`
- Filter clientseitig

---

## Phase 3 – Instrumentation im IPC Core

### 3.1 Interner Trace Hub

```ts
setTraceSink((event: TraceEvent) => void)
emitTrace(event)
```

Default: noop  
Inspector: registriert Sink

---

### 3.2 Instrumentation-Punkte

#### Invoke

- Renderer: start → main handler → response
- duration + bytes in/out
- status ok/error

#### Events

- Renderer → Main receive
- optional send-side tracing

#### Broadcast

- pro Ziel-Fenster
- target metadata erfassen

#### Streams

- eigene `streamId`
- chunkCount + totalBytes
- endReason: end / cancel / error

---

### 3.3 Payload Size Estimation

```ts
estimateBytes(value):
- Uint8Array → byteLength
- string → TextEncoder
- JSON.stringify (best effort)
```

Payload Preview:

- truncate > maxPayloadPreviewBytes
- redacted summary (keys, type, length)

---

## Phase 4 – Sicherheit & Stabilität

- Payload default redacted
- Full payload nur opt-in
- Error Serialization:
  ```ts
  { name, message, stack?, code? }
  ```
- Window Metadata:
  - `BrowserWindow.fromWebContents`
- Subscriber cleanup bei destroyed windows
- Inspector komplett inert in production

---

## Phase 5 – DX & Dokumentation

### 5.1 Nutzer-Integration (2 Zeilen)

```ts
import { enableIpcInspector } from '@number10/electron-ipc-inspector'

enableIpcInspector({ openOnStart: true })
```

### 5.2 Docs

- Aktivierung
- Payload modes
- Export für Bugreports
- Performance & Security Notes

### 5.3 Beispiel

- kleines Electron + IPC Demo
- zeigt invoke + stream + broadcast

---

## Akzeptanzkriterien

- [ ] Inspector öffnet sich als eigenes Fenster
- [ ] Live IPC Events sichtbar
- [ ] invoke / event / broadcast / stream erfasst
- [ ] Payload redacted per Default
- [ ] Pause / Clear / Export funktionieren
- [ ] Keine Crashes bei geschlossenem Inspector
- [ ] Kein Effekt auf Production Builds

---

## Qualitätsleitplanken für die KI

- APIs klein halten
- Keine Breaking Changes
- Keine Electron Monkeypatches
- Code dauerhaft im Core belassen, aber runtime-inaktiv

---

## Ergebnis

Nach Umsetzung dieses Plans existiert ein **IPC Inspector**, der:

- Debugging massiv erleichtert
- dein IPC-Framework klar vom Markt abhebt
- als Basis für spätere Timeline / Metrics / Security-Features dient

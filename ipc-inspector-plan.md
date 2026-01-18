# IPC Inspector – Implementierungsplan (überarbeitet mit Multi-Window Support)

Dieser Plan beschreibt die schrittweise Implementierung eines **IPC Inspectors** für  
`@number10/electron-ipc` inklusive der notwendigen **Window-Management-Infrastruktur**.

---

## 📋 Zusammenfassung & Entscheidung

### Ausgangsfrage

_"Sollte Window-Management vor dem Inspector implementiert werden, oder als Teil davon?"_

### Antwort: **Phase -1 (Voraussetzung)**

**Begründung:**

1. **Inspector braucht Multi-Window:**
   - Inspector UI = separates BrowserWindow
   - Muss IPC von ALLEN App-Windows tracen
   - Braucht Window-Metadaten (ID, Title, Role)

2. **Aktueller Status:**
   - ✅ Single-Window Broadcasts funktionieren: `broadcast('Ping', mainWindow, payload)`
   - ❌ Kein Broadcasting zu allen Windows
   - ❌ Keine zentrale Window-Registry
   - ❌ Keine Role-Verwaltung (main, secondary, inspector)

3. **Lösung:**
   - **Phase -1** implementiert Window-Management ZUERST
   - **Eigenständiges Feature** (nicht nur für Inspector)
   - **Backward compatible** (alte API bleibt)
   - **Optional** (nur nötig für Multi-Window Apps)

### Benefits von Phase -1

- 🎯 **Für Inspector:** Window-Tracking, Multi-Window Tracing
- 🎯 **Für Users:** `broadcastToAll()`, `getMainWindow()`, Role-Management
- 🎯 **Für Library:** Bessere Multi-Window APIs generell
- 🎯 **Für Tests:** test-app kann mehrere Windows demonstrieren

---

## ⚠️ Wichtige Erkenntnis: Multi-Window Support als Voraussetzung

**Problem:** Die aktuelle IPC-Implementation unterstützt zwar einzelne Windows (`mainBroadcast.Ping(mainWindow, payload)`),
aber es gibt **keine zentrale Window-Registry** und **kein Broadcasting zu allen Windows**.

**Auswirkung auf Inspector:**

- Inspector-UI ist ein **separates BrowserWindow**
- Inspector muss IPC von **allen App-Windows** tracen können
- Broadcasts müssen zu **mehreren Windows** gleichzeitig möglich sein
- Window-Metadaten (ID, Title, URL) müssen für Traces verfügbar sein

**Lösung:** Phase -1 implementiert **Window-Management-Infrastruktur** als eigenständiges Feature der Library.

---

## Ziel

Ein **Devtool für Electron**, das IPC sichtbar macht – ähnlich dem Network-Tab im Browser:

- invoke / event / broadcast / streaming (alle 6 Contract-Typen)
- Quelle & Ziel (Renderer / Main / Window-ID)
- **Multi-Window Support** (mehrere App-Fenster + Inspector)
- Dauer, Payload-Größe, Status, Errors
- Live-Ansicht + Filter + Export
- **opt-in**, **dev-only**, kein Einfluss auf Production Builds

---

## Rahmenbedingungen

- ❌ Kein globales Monkeypatching von Electron
- ✅ Instrumentation **nur** in den eigenen IPC-Abstraktionen
- ✅ **Window-Management als eigenständiges Feature** (auch ohne Inspector nützlich)
- ✅ Default: payload **redacted**
- ✅ Inspector vollständig deaktivierbar
- ❌ Keine Breaking Changes für bestehende Nutzer

---

## Deliverables

### Phase -1: Window Management (Voraussetzung)

1. **Window Registry System**  
   `@number10/electron-ipc/window-manager`
   - Zentrale Window-Verwaltung
   - `getAll()`, `getMain()`, `register()`
   - Lifecycle Tracking (created, focused, destroyed)

2. **Enhanced Broadcast API**
   - `createBroadcastToAll(channel, payload)` - zu allen registrierten Windows
   - `createBroadcastToRole(role, channel, payload)` - z.B. nur zu "main" oder "secondary"
   - Backward-compatible mit bestehendem `createBroadcast()`

### Phase 0-5: Inspector Implementation

1. **Subpath Exports** im bestehenden Paket:
   - `@number10/electron-ipc/inspector`
   - `@number10/electron-ipc/window-manager`
   - Update `packages/electron-ipc/package.json#exports` und `packages/electron-ipc/vite.config.ts` (lib entry points)
   - Neue Entry-Dateien: `packages/electron-ipc/src/inspector/index.ts` und `packages/electron-ipc/src/window-manager/index.ts`

2. **Main-seitiger Inspector Server**
   - Ringbuffer für Trace Events
   - IPC Handler für Inspector UI (nutzt Window Registry)
   - WebContents tracking

3. **Inspector UI**
   - Eigenes BrowserWindow mit DevTools
   - React + TypeScript (konsistent mit test-app)
   - Live-Log + Filter + Export

4. **Code Generator Integration**
   - Optionale Trace-Calls in generierten Templates
   - `--trace` Flag für CLI
   - Trace-Points in api-generators.ts

5. **Trace System**
   - Globale `setTraceSink()` Funktion
   - Trace-Emit in Contract Helper Functions
   - Nutzt Window Registry für Metadaten

6. **Dokumentation + Test-App Demo**

---

## Phase -1 – Window Management Infrastructure (Voraussetzung)

**Ziel:** Zentrale Window-Verwaltung für Multi-Window-Apps implementieren.  
**Nutzen:** Eigenständiges Feature, das auch unabhängig vom Inspector wertvoll ist.

### -1.1 WindowRegistry (`packages/electron-ipc/src/window-manager/registry.ts`)

```ts
/**
 * Metadata for a registered window
 */
export interface WindowMetadata {
  id: number
  role: 'main' | 'secondary' | 'inspector' | string
  window: BrowserWindow
  createdAt: number
  lastFocusedAt?: number
}

/**
 * Central registry for all BrowserWindows
 */
export class WindowRegistry {
  private windows = new Map<number, WindowMetadata>()
  private mainWindowId: number | null = null

  /**
   * Registers a new window
   */
  register(window: BrowserWindow, role: string = 'secondary'): void {
    const metadata: WindowMetadata = {
      id: window.id,
      role,
      window,
      createdAt: Date.now(),
    }

    this.windows.set(window.id, metadata)

    if (role === 'main' && this.mainWindowId === null) {
      this.mainWindowId = window.id
    }

    // Auto-cleanup on window close
    window.on('closed', () => {
      this.unregister(window.id)
    })

    // Track focus
    window.on('focus', () => {
      const meta = this.windows.get(window.id)
      if (meta) meta.lastFocusedAt = Date.now()
    })
  }

  /**
   * Unregisters a window
   */
  unregister(windowId: number): void {
    if (this.mainWindowId === windowId) {
      this.mainWindowId = null
    }
    this.windows.delete(windowId)
  }

  /**
   * Gets all registered windows
   */
  getAll(): WindowMetadata[] {
    return Array.from(this.windows.values()).filter((meta) => !meta.window.isDestroyed())
  }

  /**
   * Gets windows by role
   */
  getByRole(role: string): WindowMetadata[] {
    return this.getAll().filter((meta) => meta.role === role)
  }

  /**
   * Gets window by ID
   */
  getById(id: number): WindowMetadata | undefined {
    const meta = this.windows.get(id)
    return meta && !meta.window.isDestroyed() ? meta : undefined
  }

  /**
   * Gets main window
   */
  getMain(): WindowMetadata | undefined {
    if (this.mainWindowId === null) {
      // Fallback: first registered window
      const all = this.getAll()
      return all.length > 0 ? all[0] : undefined
    }
    return this.getById(this.mainWindowId)
  }

  /**
   * Gets count of active windows (excluding inspector)
   */
  count(excludeInspector = true): number {
    let all = this.getAll()
    if (excludeInspector) {
      all = all.filter((meta) => meta.role !== 'inspector')
    }
    return all.length
  }
}

// Singleton instance
let registryInstance: WindowRegistry | null = null

/**
 * Gets or creates the global window registry
 */
export function getWindowRegistry(): WindowRegistry {
  if (!registryInstance) {
    registryInstance = new WindowRegistry()
  }
  return registryInstance
}

/**
 * Resets the registry (for testing)
 */
export function resetWindowRegistry(): void {
  registryInstance = null
}
```

---

### -1.2 Enhanced Broadcast API (`packages/electron-ipc/src/window-manager/broadcast.ts`)

```ts
import { getWindowRegistry } from './registry'

/**
 * Creates a broadcast function that sends to ALL registered windows
 */
type BroadcastPayload<T, K extends keyof T> = T[K] extends { payload: infer P } ? P : never

export function createBroadcastToAll<T>() {
  // Overload: with payload and options
  function broadcast<K extends keyof T>(
    channel: K,
    payload: BroadcastPayload<T, K>,
    options?: { excludeRoles?: string[] }
  ): void

  // Overload: void payload (no payload argument needed)
  function broadcast<K extends keyof T>(channel: K): void

  // Implementation
  function broadcast<K extends keyof T>(
    channel: K,
    payload?: BroadcastPayload<T, K>,
    options?: { excludeRoles?: string[] }
  ): void {
    const registry = getWindowRegistry()
    const windows = registry.getAll()

    windows.forEach((meta) => {
      // Skip excluded roles
      if (options?.excludeRoles?.includes(meta.role)) return

      if (!meta.window.isDestroyed()) {
        meta.window.webContents.send(channel as string, payload)
      }
    })
  }

  return broadcast
}

/**
 * Creates a broadcast function for a specific window role
 */
export function createBroadcastToRole<T>(role: string) {
  return <K extends keyof T>(...args: BroadcastArgs<T, K>): void => {
    const [channel, payload] = args
    const registry = getWindowRegistry()
    const windows = registry.getByRole(role)

    windows.forEach((meta) => {
      if (!meta.window.isDestroyed()) {
        meta.window.webContents.send(channel as string, payload)
      }
    })
  }
}

/**
 * Helper: Broadcasts to all windows except inspector
 */
export function broadcastToApp<T>() {
  return createBroadcastToAll<T>()
}
```

**Backward Compatibility:**

```ts
// Old API (still works)
const broadcast = createBroadcast<BroadcastContracts>()
broadcast('Ping', mainWindow, 42)

// New API (multi-window)
const broadcastAll = createBroadcastToAll<BroadcastContracts>()
broadcastAll('Ping', 42) // to ALL windows

const broadcastMain = createBroadcastToRole<BroadcastContracts>('main')
broadcastMain('Ping', 42) // main windows only
```

---

### -1.3 Helper Functions (`packages/electron-ipc/src/window-manager/helpers.ts`)

```ts
import { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { getWindowRegistry } from './registry'

/**
 * Gets window metadata from main process events
 */
export function getWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

/**
 * Gets window role from event
 */
export function getWindowRoleFromEvent(
  event: IpcMainEvent | IpcMainInvokeEvent
): string | undefined {
  const window = getWindowFromEvent(event)
  if (!window) return undefined

  const registry = getWindowRegistry()
  return registry.getById(window.id)?.role
}

/**
 * Gets main window (convenience)
 */
export function getMainWindow(): BrowserWindow | null {
  const registry = getWindowRegistry()
  return registry.getMain()?.window ?? null
}

/**
 * Gets all app windows (excludes inspector)
 */
export function getAllAppWindows(): BrowserWindow[] {
  const registry = getWindowRegistry()
  return registry
    .getAll()
    .filter((meta) => meta.role !== 'inspector')
    .map((meta) => meta.window)
}
```

---

### -1.4 Code Generator Anpassung

**Modifikation:** `packages/electron-ipc/src/generator/code-generator.ts` → `generateMainBroadcastApi()`

```ts
// Generiert BEIDE Varianten für maximale Flexibilität
export const generateMainBroadcastApi = (...) => {
  // Legacy API (immer generieren für Backward Compatibility)
  method = `${propName}: (mainWindow: BrowserWindow, payload: ${payloadType}): void => {
    mainWindow.webContents.send('${propName}', payload)
  }`

  // Neue Multi-Window API (mit Suffix)
  if (options.includeMultiWindow) {
    add(`import { getWindowRegistry } from '@number10/electron-ipc/window-manager'`)

    methodAll = `${propName}All: (payload: ${payloadType}, options?: { excludeRoles?: string[] }): void => {
      const windows = getWindowRegistry().getAll()
      windows.forEach(meta => {
        if (options?.excludeRoles?.includes(meta.role)) return
        if (!meta.window.isDestroyed()) {
          meta.window.webContents.send('${propName}', payload)
        }
      })
    }`

    // Optional: Role-specific variant
    methodToRole = `${propName}ToRole: (role: string, payload: ${payloadType}): void => {
      const windows = getWindowRegistry().getByRole(role)
      windows.forEach(meta => {
        if (!meta.window.isDestroyed()) {
          meta.window.webContents.send('${propName}', payload)
        }
      })
    }`
  }
}
```

**CLI Flag:** `--multi-window` (nicht `--broadcast-to-all`) generiert zusätzliche Suffixed Functions

**Ergebnis:**

```ts
// Generated API (mit --multi-window)
export const mainBroadcast = {
  Ping: (mainWindow: BrowserWindow, payload: number) => { ... },  // legacy
  PingAll: (payload: number, options?: { excludeRoles?: string[] }) => { ... },  // new
  PingToRole: (role: string, payload: number) => { ... }  // new
}
```

Zusätzlich: `packages/electron-ipc/src/generator/cli.ts` und `packages/electron-ipc/src/generator/types.ts` erweitern, damit `--multi-window` bis `generateMainBroadcastApi()` durchgereicht wird.

---

### -1.5 Integration in test-app

```ts
// packages/test-app/src/main/index.ts
import { createBroadcastToAll, getWindowRegistry } from '@number10/electron-ipc/window-manager'

function createWindow() {
  const mainWindow = new BrowserWindow({ ... })

  // Register window
  getWindowRegistry().register(mainWindow, 'main')

  // ... rest of window setup
}

// Create a second window
function createSecondaryWindow() {
  const secondWindow = new BrowserWindow({ ... })

  // Auto-register as secondary
  getWindowRegistry().register(secondWindow, 'secondary')
}

// Broadcasting with the new API
setInterval(() => {
  const broadcastAll = createBroadcastToAll<BroadcastContracts>()
  broadcastAll('Ping', Date.now(), { excludeRoles: ['inspector'] })
}, 2000)
```

---

### -1.6 Tests

```ts
// packages/electron-ipc/src/window-manager/registry.test.ts
describe('WindowRegistry', () => {
  it('should register and retrieve windows')
  it('should auto-cleanup on window close')
  it('should track main window')
  it('should filter by role')
  it('should count windows excluding inspector')
})

// packages/electron-ipc/src/window-manager/broadcast.test.ts
describe('createBroadcastToAll', () => {
  it('should broadcast to all windows')
  it('should exclude specified roles')
  it('should skip destroyed windows')
})
```

---

## Phase 0 – Design & Contracts (Inspector)

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
- Uint8Array/ArrayBuffer → byteLength
- string → TextEncoder (cached instance)
- Objects: Quick sampling approach:
  * typeof check (primitive → 8 bytes estimate)
  * Array.isArray → length * 8 (rough estimate)
  * Object → sample first 10 keys only
  * Fallback: Buffer.byteLength(JSON.stringify(value).slice(0, 1000))
- Max iteration limit: 1000 (prevent DoS on huge objects)
```

**Performance Safeguards:**

- Avoid full `JSON.stringify()` on large objects
- Use sampling for nested structures
- Cached TextEncoder instance (avoid re-creation)
- Early exit after 1ms computation time

Payload Preview:

- truncate > maxPayloadPreviewBytes
- redacted summary (keys, type, length)
- Never block main thread > 1ms

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
import { enableIpcInspector } from '@number10/electron-ipc/inspector'

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

### Phase -1: Window Management

- [x] **WindowRegistry implementiert** mit register/unregister/getAll
- [x] **Auto-cleanup** bei window.on('closed')
- [x] **Role-based filtering** (main, secondary, inspector)
- [x] **createBroadcastToAll()** funktioniert
- [x] **createBroadcastToRole()** funktioniert
- [x] **Backward compatibility** mit bestehendem `createBroadcast(mainWindow, ...)`
- [x] **Tests** für Registry + Broadcast (>85% Coverage)
- [ ] **Dokumentation** für Window Management
- [x] **test-app Demo** mit mehreren Windows

### Phase 0-5: Inspector

- [ ] **Inspector öffnet sich als eigenes Fenster** mit React UI
- [ ] **Live IPC Events sichtbar** von ALLEN registrierten Windows
- [ ] **Alle 6 Contract-Typen erfasst**
- [ ] **Window-Metadaten** korrekt angezeigt (ID, Title, Role)
- [ ] **Payload redacted per Default**
- [ ] **Pause / Clear / Export funktionieren**
- [ ] **Keine Crashes bei geschlossenem Inspector**
- [ ] **Zero Overhead in Production**
- [ ] **Inspector-Window nicht getraced** (excludeRoles: ['inspector'])

---

## Implementierungs-Reihenfolge (aktualisiert)

### Phase -1: Window Management Foundation (2-3 Tage)

**VORAUSSETZUNG für Inspector - kann aber auch unabhängig genutzt werden**

1. **WindowRegistry Implementation**
   - Core Registry Klasse
   - Singleton Pattern
   - Tests (registry.test.ts)

2. **Enhanced Broadcast API**
   - `createBroadcastToAll()`
   - `createBroadcastToRole()`
   - Backward compatibility sicherstellen
   - Tests (broadcast.test.ts)

3. **Helper Functions**
   - `getWindowFromEvent()`
   - `getMainWindow()`
   - `getAllAppWindows()`

4. **Code Generator Update (Optional)**
   - `--broadcast-to-all` Flag
   - Generiert API ohne `mainWindow` Parameter
   - Fallback auf alte API

5. **test-app Integration**
   - Multi-Window Demo
   - Registry-Usage-Beispiele
   - README Update

**Deliverable:** Funktionierendes Window-Management-System als eigenständiges Feature

---

### Phase 0: Inspector Foundation (1-2 Tage)

1. TypeScript Interfaces definieren (`inspector/types.ts`)
2. Inspector Contracts definieren (`inspector/inspector-contracts.ts`)
3. Trace System Skelett (`inspector/trace.ts`)

### Phase 1: Main-Side (2-3 Tage)

1. RingBuffer Implementation + Tests
2. InspectorServer + Handler Registration
3. `enableIpcInspector()` API
4. Payload-Helfer (estimation, preview, serialization)
5. **Integration mit WindowRegistry** (Inspector-Window registrieren)

### Phase 2: UI (3-4 Tage)

1. Vite Setup + Package Structure
2. React Components (TraceTable, FilterBar, etc.)
3. Inspector Preload + Context Bridge
4. State Management + Live Updates
5. Export Funktionalität
6. **Multi-Window View** (Window-Selector/Filter)

### Phase 3: Instrumentation (4-6 Tage)

1. Template-Modifikationen (invokeContracts, etc.)
2. Main-Side Handler Wrapping (handle, on, createBroadcast)
3. Stream Contract Tracing (komplex: Chunks, Cleanup, Errors)
4. **Window-Metadaten aus Registry** holen
5. CLI `--trace` Flag
6. Payload Estimation mit Performance Safeguards
7. Integration Tests
8. Performance Testing (ensure < 1ms overhead)

### Phase 4: Polish (1-2 Tage)

1. Error Handling & Robustness
2. Production Guards
3. Performance Optimierung
4. Security Audit

### Phase 5: Documentation (1 Tag)

1. README Update (Window Management + Inspector)
2. docs/window-manager.md (NEUE Datei)
3. docs/inspector.md
4. Test-App Demo (erweitert)
5. Migration Guide

**Total: ~14-21 Tage** (inkl. Window Management)

**Hinweis:** Phase 3 (Instrumentation) ist der kritische Pfad - Stream Tracing und Performance Optimierung komplex

---

## Risiken & Mitigation (erweitert)

### Risiko 0: Window Management Breaking Changes

**Problem:** Registry-Requirement könnte bestehenden Code brechen
**Mitigation:**

- Opt-in: Registry nur nötig für Multi-Window + Inspector
- Backward compatibility: `createBroadcast(window, ...)` bleibt funktional
- Auto-registration als Helper (nicht Pflicht)
- Semver: Minor Version (neue Features, keine Breaking Changes)

### Risiko 1: Performance Impact

**Problem:** Tracing könnte App verlangsamen
**Mitigation:**

- Zero overhead wenn Inspector disabled (null check)
- Async tracing (nicht blockierend)
- Payload estimation optimieren (cached TextEncoder)
- Ringbuffer Size Limits

### Risiko 2: Breaking Changes

**Problem:** Bestehender User-Code bricht
**Mitigation:**

- Trace-Calls nur mit `--trace` Flag generieren
- Alte Templates bleiben Default
- Window Management ist opt-in
- Semver Major nur wenn absolut nötig

### Risiko 3: Circular Dependencies (Inspector)

**Problem:** Inspector-IPC traced Inspector-IPC (Recursion!)
**Mitigation:**

- Inspector-Window registriert als role='inspector'
- `excludeRoles: ['inspector']` im Trace-Check
- **Prefix-Check:** `if (channel.startsWith('INSPECTOR:')) return` (skip tracing)
- Explicit exclusion in `shouldTrace()`:
  ```ts
  function shouldTrace(channel: string, windowRole?: string): boolean {
    if (channel.startsWith('INSPECTOR:')) return false // Explicit prefix check
    if (windowRole === 'inspector') return false // Role-based exclusion
    return tracingEnabled
  }
  ```

### Risiko 4: Window Leaks

**Problem:** Registry hält Referenzen, könnte GC verhindern
**Mitigation:**

- Auto-cleanup via `window.on('closed')` (deterministisch, zuverlässig)
- Explizite `isDestroyed()` checks vor jedem Zugriff
- **WeakRef nicht geeignet:** FinalizationRegistry ist nicht deterministisch, GC-Timing unpredictable
- **Strategie:** Starke Referenzen + explizites Cleanup (Best Practice für Electron)
- Tests für Memory Leaks (BrowserWindow.getAllWindows() nach cleanup)

### Risiko 5: Multi-Window Complexity

**Problem:** User versteht Registry nicht
**Mitigation:**

- **Optional:** Funktioniert auch ohne Registry
- Clear Documentation mit Beispielen
- test-app zeigt Best Practices
- Helper-Funktionen vereinfachen Nutzung

---

## Qualitätsleitplanken (erweitert)

### Code Quality

- ✅ **Alle Funktionen mit JSDoc** (English)
- ✅ **TypeScript strict mode**
- ✅ **No `any` types** (use `unknown`)
- ✅ **Functional Programming** wo sinnvoll
- ✅ **Error Handling** überall
- ✅ **Unit Tests** für Core Logic (>85% Coverage)

### API Design

- ✅ **Minimal API Surface**
- ✅ **Sane Defaults** (Registry auto-register optional)
- ✅ **Type Safety**
- ✅ **Opt-in** (Window Management + Inspector)
- ✅ **Backward Compatible** (alte Broadcast API bleibt)

### Integration

- ✅ **Keine Breaking Changes**
- ✅ **Keine Electron Patches**
- ✅ **Tree-shakeable**
- ✅ **Framework-agnostic**
- ✅ **Window Management unabhängig nutzbar**

### Performance

- ✅ **Zero Overhead wenn disabled**
- ✅ **Non-blocking Tracing**
- ✅ **Lazy Loading** (Inspector UI nur bei Bedarf)
- ✅ **Memory Bounded** (Fixed Ringbuffer)
- ✅ **Cleanup + destroyed checks** (GC-safe)

### Security

- ✅ **Production-safe**
- ✅ **Privacy-first** (redacted default)
- ✅ **No Leaks** (Cleanup + destroyed checks)
- ✅ **Documented Risks**

---

## Ergebnis

Nach Umsetzung dieses Plans existieren **zwei wertvolle Features**:

### 1. Window Management System

- ✅ Zentrale Window-Verwaltung für Multi-Window-Apps
- ✅ Role-based Organization (main, secondary, inspector, custom)
- ✅ Enhanced Broadcast API (`broadcastToAll`, `broadcastToRole`)
- ✅ **Eigenständig nutzbar** (auch ohne Inspector)
- ✅ Solide Basis für zukünftige Features

### 2. IPC Inspector

- ✅ Debugging massiv erleichtert (Network-Tab für IPC)
- ✅ **Multi-Window Support** (trackt alle App-Windows)
- ✅ Framework hebt sich vom Markt ab (USP)
- ✅ Basis für Timeline / Metrics / Security Audits
- ✅ Zero Impact auf Production

**Commit Message Template:**

```
feat(window-manager): add central window registry and enhanced broadcasts

- Add WindowRegistry with role-based organization
- Add createBroadcastToAll() and createBroadcastToRole()
- Add auto-cleanup on window close
- Maintain backward compatibility with existing API

BREAKING CHANGE: None (fully backward compatible)

---

feat(inspector): implement IPC Inspector with multi-window tracing

- Add Inspector Server with circular buffer
- Add React-based Inspector UI with filter/export
- Add trace instrumentation in code generator
- Add payload preview with redacted mode
- Integrate with WindowRegistry for multi-window support

Requires: #XXX (window-manager)
Closes: #YYY
```

# Inspector High-Volume Performance Plan

**Datum:** 19. Januar 2026  
**Zweck:** Analyse und Lösungsansätze für den Inspector bei massiven Datenmengen

---

## 🔍 Analyse: Aktueller Zustand

### Was passiert derzeit bei hohem Datenvolumen?

#### 1. **Backend (Main Process)**

- ✅ **RingBuffer** begrenzt Events auf `maxEvents` (default: 5000)
- ✅ **Dropped Events** werden gezählt (`droppedCount`)
- ⚠️ **Broadcasting** sendet JEDES neue Event an ALLE Inspector-Fenster via IPC
- ⚠️ Bei 1000 Events/s werden 1000 IPC-Messages gesendet
- ⚠️ Keine Ratenbegrenzung (throttling) beim Broadcasting

**Probleme:**

- IPC-Overhead bei sehr vielen Events/Sekunde
- Main-Process kann durch Broadcasting belastet werden
- Keine Batching-Strategie

#### 2. **Frontend (Renderer Process)**

- ⚠️ **Vollständiges DOM-Rendering** aller Events in Tabelle
- ⚠️ Bei jedem neuen Event wird die komplette Tabelle neu gerendert
- ⚠️ `allEvents.push()` + `applyFilters()` + `renderEvents()` bei JEDEM Event
- ⚠️ Array-Reversal für Display: `[...filteredEvents].reverse()`
- ⚠️ Keine Virtualisierung (Virtual Scrolling)
- ⚠️ Keine Debouncing/Throttling beim Rendering

**Probleme:**

- DOM-Thrashing bei vielen Events
- UI wird träge/unbedienbar
- Hoher Speicherverbrauch durch viele DOM-Nodes
- Browser-Thread blockiert bei Rendering

#### 3. **Datengröße**

- Payloads können groß sein (Streams, Buffers)
- `payloadMode: 'full'` kann massive Datenmengen übertragen
- Keine Kompression der Event-Daten

---

## 📊 Szenarien

### Szenario 1: Stream-Upload (10 MB @ 1000 Chunks/s)

- **Events:** 1000/s über 10 Sekunden = 10.000 Events
- **Buffer:** Überlauf nach 5 Sekunden (5000 Events)
- **UI:** Unbedienbar durch ständiges Re-Rendering

### Szenario 2: Intensive API-Nutzung (500 Invokes/s)

- **Events:** 500 Request + 500 Response = 1000 Events/s
- **Buffer:** Überlauf nach 5 Sekunden
- **UI:** Tabelle mit tausenden Zeilen

### Szenario 3: Broadcast-Storm (100 Fenster × 10 Broadcasts/s)

- **Events:** 1000 Events/s
- **Broadcasting:** Jedes Event an alle Inspector-Windows

---

## 🎯 Lösungsansätze

### **Phase 1: Backend-Optimierungen** (Priorität: HOCH)

#### 1.1 Event Batching & Throttling

```typescript
interface BatchedUpdate {
  events: TraceEvent[]
  timestamp: number
  count: number
}
```

**Implementierung:**

- Sammle Events in Batches (z.B. alle 100ms oder max 50 Events)
- Sende Batch als Array statt einzelne Events
- Konfigurierbar: `batchIntervalMs`, `batchSize`

**Vorteile:**

- Reduziert IPC-Overhead um 90%+
- Main-Process-Entlastung
- Weniger Renderer-Updates

#### 1.2 Adaptive Buffer-Strategie

```typescript
interface BufferStats {
  eventsPerSecond: number
  avgEventSize: number
  memoryUsage: number
}
```

**Implementierung:**

- Berechne Events/Sekunde (gleitender Durchschnitt)
- Bei hoher Rate: automatisch zu `payloadMode: 'none'` wechseln
- Warning-Benachrichtigung an Inspector-UI
- Optionale Auto-Pause bei extremen Raten

#### 1.3 Sampling-Modus

```typescript
interface SamplingOptions {
  enabled: boolean
  rate: number // 0.1 = 10% der Events
  strategy: 'random' | 'deterministic' | 'important'
}
```

**Strategien:**

- **Random:** 10% zufällige Events
- **Deterministic:** Jedes N-te Event
- **Important:** Errors/Timeouts immer, Success mit reduzierter Rate

---

### **Phase 2: Frontend-Optimierungen** (Priorität: HOCH)

#### 2.1 Virtual Scrolling / Windowing

**Bibliothek:** `react-window` oder Custom-Implementation

**Konzept:**

- Rendere nur sichtbare Zeilen (~50-100)
- Scrollbar repräsentiert volle Datenmenge
- Dynamisches Laden bei Scroll

**Impact:**

- DOM-Nodes: 5000+ → ~100
- Rendering-Zeit: 1000ms → 50ms
- Speicher: 500MB → 50MB

#### 2.2 Render Debouncing

```typescript
let renderTimeout: NodeJS.Timeout | null = null
const RENDER_DEBOUNCE_MS = 100

function scheduleRender() {
  if (renderTimeout) clearTimeout(renderTimeout)
  renderTimeout = setTimeout(() => {
    renderEvents()
    renderTimeout = null
  }, RENDER_DEBOUNCE_MS)
}
```

**Alternative:** RequestAnimationFrame-basiert

#### 2.3 Batch-Event-Verarbeitung

```typescript
window.inspectorAPI.onEventBatch((payload) => {
  if (!isPaused) {
    allEvents.push(...payload.events) // Bulk-Operation
    scheduleRender() // Debounced
  }
})
```

#### 2.4 Web Workers für Filter/Suche

- Schwere Operationen (Filtering, Search) in Worker
- Main-Thread bleibt responsive
- Besonders wichtig bei 5000+ Events

---

### **Phase 3: Statistik-Dashboard** (Priorität: MITTEL)

#### 3.1 Echtzeit-Statistiken

```typescript
interface InspectorStatistics {
  // Zeitbasiert
  eventsPerSecond: number
  avgResponseTime: number

  // Nach Kanal
  channelStats: Map<string, ChannelStats>

  // Nach Typ
  kindDistribution: Record<TraceKind, number>

  // Status
  errorRate: number
  timeoutCount: number

  // Performance
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number

  // Payload
  totalBytes: number
  avgPayloadSize: number

  // Zeitfenster
  windowSize: number // z.B. 60 Sekunden
}

interface ChannelStats {
  channel: string
  count: number
  errorCount: number
  avgDuration: number
  totalBytes: number
}
```

#### 3.2 Dashboard-UI

```
┌─────────────────────────────────────────────┐
│ STATISTICS                                   │
├─────────────────────────────────────────────┤
│ Events/s: ▓▓▓▓▓▓░░░░  125/s (Peak: 450)   │
│ Error Rate: ▓░░░░░░░░░  2.1%                │
│ Avg Response: 45ms (p95: 120ms)            │
├─────────────────────────────────────────────┤
│ TOP CHANNELS (last 60s)                     │
│ 1. user:fetch         1250 calls  2.1% err  │
│ 2. app:settings        450 calls  0.0% err  │
│ 3. window:focus        380 calls  0.0% err  │
├─────────────────────────────────────────────┤
│ BY KIND                                     │
│ Invoke:     45%  ▓▓▓▓▓▓▓▓▓░                │
│ Event:      30%  ▓▓▓▓▓▓░░░░                │
│ Broadcast:  20%  ▓▓▓▓░░░░░░                │
│ Stream:      5%  ▓░░░░░░░░░                │
└─────────────────────────────────────────────┘
```

**Features:**

- Live-Charts (Mini-Sparklines)
- Aggregierte Übersicht
- Reduziert Detailflut
- Tab-Umschaltung: "Events" ↔ "Statistics"

#### 3.3 Statistik-Berechnung

- Im RingBuffer oder separater StatisticsCollector
- Rolling-Window-Aggregation (z.B. letzte 60s)
- Minimal-Overhead durch effiziente Datenstrukturen

---

### **Phase 4: UI/UX-Verbesserungen** (Priorität: MITTEL)

#### 4.1 Intelligente Pause

```typescript
interface AutoPauseOptions {
  enabled: boolean
  threshold: number // Events/s
  action: 'pause' | 'sample' | 'statistics-only'
}
```

**Verhalten:**

- Bei Überschreitung automatisch pausieren
- Benachrichtigung: "High event rate detected (500/s). Inspector paused."
- User kann fortsetzen oder Sampling aktivieren

#### 4.2 View-Modi

- **Detail View:** Alle Events (current)
- **Statistics View:** Nur Aggregationen (NEU)
- **Compact View:** Nur Channel + Status (NEU)

#### 4.3 Performance-Modus

Toggle: "Performance Mode"

- Virtual Scrolling aktiviert
- Payload-Mode: none
- Batching: aggressiv (500ms)
- Sampling: 10%

#### 4.4 Filterung vor Rendering

```typescript
// Anstatt:
allEvents.push(event)
applyFilters()

// Besser:
if (passesFilter(event)) {
  visibleEvents.push(event)
  scheduleRender()
}
```

#### 4.5 Lazy Loading für Payloads

- Payloads nicht initial laden
- "Show Payload" Button → On-demand fetch
- Reduziert initiale Datenmenge massiv

---

### **Phase 5: Monitoring & Diagnostics** (Priorität: NIEDRIG)

#### 5.1 Inspector für den Inspector

```typescript
interface InspectorHealth {
  renderTime: number
  memoryUsage: number
  domNodeCount: number
  ipcLatency: number
  droppedFrames: number
}
```

- Performance-Metriken im Inspector selbst
- Warning-Indicator bei schlechter Performance
- "Inspector is struggling" Benachrichtigung

#### 5.2 Export-Formate

- **CSV:** Für Excel-Analyse
- **JSON:** Kompakt (ohne Full-Payloads)
- **HAR-Format:** Für Performance-Tools
- **SQLite:** Für große Datasets

---

## 🚀 Implementierungs-Roadmap

### Sprint 1: Critical Performance (1-2 Wochen)

1. ✅ Event Batching im Backend
2. ✅ Render Debouncing im Frontend
3. ✅ Virtual Scrolling Implementation
4. ✅ Adaptive Payload-Mode

**Ziel:** Inspector bleibt bei 500+ Events/s bedienbar

### Sprint 2: Statistics Dashboard (1 Woche)

1. ✅ StatisticsCollector implementieren
2. ✅ Statistics-Tab in UI
3. ✅ Live-Charts (Sparklines)
4. ✅ Channel-/Kind-Aggregation

**Ziel:** Überblick auch bei hohen Raten

### Sprint 3: Advanced Features (1 Woche)

1. ✅ Sampling-Modus
2. ✅ Auto-Pause bei High Load
3. ✅ Performance Mode Toggle
4. ✅ Web Worker für Filtering

**Ziel:** Verschiedene Use-Cases abdecken

### Sprint 4: Polish & Documentation (3-5 Tage)

1. ✅ Inspector Health Monitoring
2. ✅ Advanced Export Formats
3. ✅ Dokumentation
4. ✅ Tests für High-Volume-Szenarien

---

## 📐 Technische Details

### Virtual Scrolling Implementation

#### Option A: Eigene Implementation

```typescript
interface VirtualScrollConfig {
  itemHeight: number // Fixed row height
  containerHeight: number
  totalItems: number
  overscan: number // Extra items above/below viewport
}

function calculateVisibleRange(
  scrollTop: number,
  config: VirtualScrollConfig
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / config.itemHeight) - config.overscan)
  const visibleCount = Math.ceil(config.containerHeight / config.itemHeight)
  const end = Math.min(config.totalItems, start + visibleCount + config.overscan * 2)
  return { start, end }
}
```

#### Option B: Bibliothek

- **react-window:** Wenn Migration zu React gewünscht
- **clusterize.js:** Vanilla JS, lightweight
- **Einfache Lösung:** Display-Pooling mit `display: none`

### Batching-Strategie

```typescript
class EventBatcher {
  private batch: TraceEvent[] = []
  private timer: NodeJS.Timeout | null = null

  constructor(
    private maxSize: number = 50,
    private maxDelay: number = 100
  ) {}

  add(event: TraceEvent) {
    this.batch.push(event)

    if (this.batch.length >= this.maxSize) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxDelay)
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.batch.length > 0) {
      this.broadcast(this.batch)
      this.batch = []
    }
  }
}
```

### Statistics Rolling Window

```typescript
class RollingStatistics {
  private windows: Map<number, WindowData> = new Map()
  private windowSize = 60_000 // 60s in ms

  record(event: TraceEvent) {
    const bucket = Math.floor(event.tsStart / 1000) // 1s buckets
    const data = this.windows.get(bucket) || this.createWindow()

    data.count++
    data.totalDuration += event.durationMs || 0
    data.byChannel.set(event.channel, (data.byChannel.get(event.channel) || 0) + 1)

    this.windows.set(bucket, data)
    this.cleanup()
  }

  getStats(): Statistics {
    const now = Date.now()
    const cutoff = now - this.windowSize

    let totalCount = 0
    let totalDuration = 0
    const channelCounts = new Map<string, number>()

    this.windows.forEach((data, timestamp) => {
      if (timestamp * 1000 >= cutoff) {
        totalCount += data.count
        totalDuration += data.totalDuration
        data.byChannel.forEach((count, channel) => {
          channelCounts.set(channel, (channelCounts.get(channel) || 0) + count)
        })
      }
    })

    return {
      eventsPerSecond: totalCount / (this.windowSize / 1000),
      avgDuration: totalCount > 0 ? totalDuration / totalCount : 0,
      topChannels: Array.from(channelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    }
  }

  private cleanup() {
    const cutoff = Date.now() / 1000 - this.windowSize / 1000
    this.windows.forEach((_, timestamp) => {
      if (timestamp < cutoff) {
        this.windows.delete(timestamp)
      }
    })
  }
}
```

---

## 🧪 Testing-Strategie

### Load Testing

```typescript
// test-app/src/main/high-volume-test.ts
export function generateHighVolumeEvents(count: number, eventsPerSecond: number) {
  const interval = 1000 / eventsPerSecond
  let generated = 0

  const timer = setInterval(() => {
    ipcAPI.testChannel({ data: `event-${generated}` })
    generated++

    if (generated >= count) {
      clearInterval(timer)
    }
  }, interval)
}

// Test-Szenarien:
// 1. 100 Events/s für 60s = 6000 Events
// 2. 500 Events/s für 30s = 15000 Events
// 3. 1000 Events/s für 10s = 10000 Events
// 4. Burst: 5000 Events sofort
```

### Performance Benchmarks

```typescript
interface PerformanceMetrics {
  renderTime: number
  memoryBefore: number
  memoryAfter: number
  domNodeCount: number
  fps: number
}

function benchmarkRendering(eventCount: number): PerformanceMetrics {
  const startMem = performance.memory?.usedJSHeapSize || 0
  const startTime = performance.now()

  renderEvents(generateTestEvents(eventCount))

  const endTime = performance.now()
  const endMem = performance.memory?.usedJSHeapSize || 0

  return {
    renderTime: endTime - startTime,
    memoryBefore: startMem,
    memoryAfter: endMem,
    domNodeCount: document.querySelectorAll('tr').length,
    fps: 1000 / (endTime - startTime),
  }
}
```

### Ziele

- **Rendering:** < 16ms für 60fps (auch bei 1000+ Events)
- **Memory:** < 100MB für 5000 Events
- **IPC-Latency:** < 10ms für Batches
- **UI-Responsiveness:** Keine Input-Blockierung

---

## 💡 Weitere Ideen

### 1. Stream-Aggregation

- Für Stream-Events: Zeige nur Start/End, nicht jeden Chunk
- "Show Details" expandiert alle Chunks
- Reduziert Event-Liste massiv bei Streams

### 2. Event-Gruppen

```typescript
interface EventGroup {
  id: string
  channel: string
  kind: 'invoke' | 'stream'
  count: number
  firstEvent: TraceEvent
  lastEvent: TraceEvent
  errors: number
  avgDuration: number
}
```

- Gruppiere ähnliche Events (gleicher Channel + Zeitfenster)
- Expandierbar für Details
- Reduziert UI-Komplexität

### 3. Persistenz

- Speichere Events in IndexedDB
- Unbegrenzte Historie (bis Speicher voll)
- Lazy-Load aus DB statt RAM
- Timeframe-Auswahl: "Last 5 minutes", "Last hour"

### 4. Streaming Export

- Für sehr große Datasets
- Export als Stream, nicht alles im RAM
- Fortschrittsbalken

### 5. Multi-Window-Koordination

- Wenn mehrere Inspector-Fenster offen
- Master-Slave-Modus: Nur Master empfängt alle Events
- Slaves subscriben nur für Filter-Matches

### 6. Inspector-Profil

```typescript
interface InspectorProfile {
  name: string
  bufferSize: number
  payloadMode: PayloadMode
  sampling: SamplingOptions
  filters: FilterConfig
  autoActions: AutoActionConfig
}

// Presets:
const PROFILES = {
  development: { bufferSize: 5000, payloadMode: 'redacted' },
  debugging: { bufferSize: 1000, payloadMode: 'full' },
  production: { bufferSize: 500, payloadMode: 'none', sampling: { rate: 0.1 } },
  performance: { bufferSize: 10000, payloadMode: 'none' },
}
```

---

## 📊 Erwartete Verbesserungen

### Vorher (Current)

- **Max bedienbare Rate:** ~50 Events/s
- **UI-Freeze bei:** 200+ Events/s
- **Speicher bei 5000 Events:** ~500MB
- **Rendering-Zeit (5000 Events):** ~2000ms

### Nachher (Target)

- **Max bedienbare Rate:** 1000+ Events/s
- **UI bleibt responsive:** Auch bei 2000+ Events/s (durch Sampling)
- **Speicher bei 5000 Events:** ~100MB (Virtual Scrolling)
- **Rendering-Zeit (5000 Events):** ~50ms (nur sichtbare Zeilen)

**Verbesserung:** 20x Performance-Steigerung

---

## 🎓 Lessons Learned & Best Practices

### 1. Don't Render Everything

Virtual Scrolling ist essentiell für große Listen

### 2. Batch IPC Communication

Einzelne IPC-Messages sind teuer

### 3. Debounce/Throttle Everything

UI-Updates sollten nie synchron mit Events sein

### 4. Show Aggregations First

Details on-demand, nicht alles sofort

### 5. Performance Budget

Setze klare Grenzen: Max X ms für Rendering

### 6. Graceful Degradation

Bei hoher Last: Features deaktivieren statt crashen

### 7. Monitoring is Key

Inspector muss eigene Performance tracken

---

## 📝 Nächste Schritte

1. **Entscheidung:** Welche Phase(n) sollen zuerst implementiert werden?
2. **Prototyping:** Virtual Scrolling + Batching als PoC
3. **Benchmark:** Aktuelle Performance messen
4. **Implementation:** Schrittweise nach Roadmap
5. **Testing:** Load-Tests schreiben
6. **Documentation:** User-Guide für High-Volume-Szenarien

---

## 📚 Referenzen

- [Virtual Scrolling Techniques](https://www.patterns.dev/posts/virtual-lists)
- [React Window](https://github.com/bvaughn/react-window)
- [clusterize.js](https://github.com/NeXTs/Clusterize.js)
- [Web Worker Performance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Chrome DevTools Architecture](https://developer.chrome.com/docs/devtools/)

---

**Status:** 📋 Plan erstellt, Ready for Implementation  
**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Review:** Pending

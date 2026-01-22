# Performance Tuning Guide

Optimize IPC performance in your Electron application with proven strategies and best practices.

## Overview

IPC communication can become a bottleneck in Electron applications if not handled efficiently. This guide covers performance optimization techniques, benchmarking strategies, and common anti-patterns to avoid.

## Core Principles

### 1. Minimize IPC Overhead

Every IPC call has overhead (serialization, context switching, deserialization). Reduce the number of calls:

```typescript
// ❌ Bad: Multiple round-trips (3 IPC calls)
const user = await window.api.invokeGetUser(userId)
const preferences = await window.api.invokeGetPreferences(userId)
const activity = await window.api.invokeGetActivity(userId)

// ✅ Good: Single call with combined data (1 IPC call)
const userData = await window.api.invokeGetUserData(userId)
// Returns: { user, preferences, activity }
```

**Impact**: Reduces latency by ~2-5ms per eliminated call.

### 2. Choose the Right Pattern

Different patterns have different performance characteristics:

| Pattern       | Use Case               | Overhead | Throughput |
| ------------- | ---------------------- | -------- | ---------- |
| **Invoke**    | Request/response       | Medium   | Medium     |
| **Broadcast** | One-way notifications  | Low      | High       |
| **Event**     | Renderer → Main events | Low      | High       |
| **Stream**    | Large data transfers   | Medium   | Very High  |

## IPC Pattern Optimization

### When to Use Invoke

Use for request-response operations with moderate payload sizes:

```typescript
// Good use case: CRUD operations
const result = await window.api.invokeCreateUser({
  name: 'Alice',
  email: 'alice@example.com',
})

// Good use case: Queries with moderate result size
const users = await window.api.invokeGetUsers({ limit: 100 })
```

**Performance tip**: Keep payloads under 1MB for invoke calls.

### When to Use Broadcast/Event

Use for high-frequency, one-way notifications:

```typescript
// ✅ Good: High-frequency updates
// Main process
setInterval(() => {
  broadcast('MetricsUpdate', {
    cpu: getCPU(),
    memory: getMemory(),
  })
}, 1000) // 1 update/second

// Renderer
window.api.onMetricsUpdate((metrics) => {
  updateDashboard(metrics)
})
```

**Performance tip**: Broadcasts have ~30% less overhead than invoke calls.

### When to Use Streams

Use for large data transfers (>1MB) or continuous data flows:

```typescript
// ✅ Good: Large file transfer (streaming)
window.api.downloadLargeFile(
  { path: '/data/export.csv' }, // 500MB file
  (chunk) => {
    // Process 64KB chunks
    processChunk(chunk)
  },
  () => console.log('Download complete')
)

// ❌ Bad: Large file transfer (single payload)
const file = await window.api.invokeGetLargeFile('/data/export.csv')
// Blocks UI, high memory usage, potential OOM
```

**Performance tip**: Streams maintain constant memory usage regardless of data size.

## Batching Strategies

### Pattern 1: Time-Based Batching

Collect items over a time window:

```typescript
// Renderer: Batch logger
class BatchLogger {
  private queue: LogEntry[] = []
  private timer: NodeJS.Timeout | null = null

  log(entry: LogEntry) {
    this.queue.push(entry)

    // Flush after 100ms of inactivity
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 100)
  }

  flush() {
    if (this.queue.length === 0) return

    window.api.invokeBatchLog(this.queue)
    this.queue = []
    this.timer = null
  }
}

const logger = new BatchLogger()
```

**Impact**: Reduces IPC calls by 10-100x for high-frequency operations.

### Pattern 2: Size-Based Batching

Collect items until threshold:

```typescript
class BatchProcessor {
  private batch: Item[] = []
  private readonly BATCH_SIZE = 50

  async add(item: Item) {
    this.batch.push(item)

    if (this.batch.length >= this.BATCH_SIZE) {
      await this.flush()
    }
  }

  async flush() {
    if (this.batch.length === 0) return

    await window.api.invokeBatchProcess(this.batch)
    this.batch = []
  }
}
```

**Impact**: Balances latency vs throughput.

### Pattern 3: Hybrid Batching

Combine time and size thresholds:

```typescript
class HybridBatcher<T> {
  private batch: T[] = []
  private timer: NodeJS.Timeout | null = null

  constructor(
    private maxSize: number,
    private maxDelay: number,
    private flushFn: (items: T[]) => Promise<void>
  ) {}

  add(item: T) {
    this.batch.push(item)

    // Size-based flush
    if (this.batch.length >= this.maxSize) {
      this.flush()
      return
    }

    // Start/reset timer
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.maxDelay)
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.batch.length === 0) return

    const items = [...this.batch]
    this.batch = []
    await this.flushFn(items)
  }
}

// Usage
const batcher = new HybridBatcher<LogEntry>(
  50, // Max 50 items
  100, // Max 100ms delay
  (logs) => window.api.invokeBatchLog(logs)
)
```

## Debouncing User Input

Reduce IPC calls from user interactions:

```typescript
import { debounce } from 'lodash-es'

// ❌ Bad: IPC on every keystroke (50+ calls/second)
<input
  onChange={(e) => window.api.sendSearchQuery(e.target.value)}
/>

// ✅ Good: Debounced IPC (~3 calls/second)
const debouncedSearch = debounce(
  (query: string) => window.api.sendSearchQuery(query),
  300 // 300ms delay
)

<input
  onChange={(e) => debouncedSearch(e.target.value)}
/>
```

**Custom debounce** (no dependencies):

```typescript
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
```

## Payload Size Optimization

### Minimize Data Transfer

```typescript
// ❌ Bad: Sending full objects (1.2MB)
const users = await window.api.invokeGetAllUsers()
// Returns full user objects with all fields

// ✅ Good: Project only needed fields (120KB)
const users = await window.api.invokeGetAllUsers({
  fields: ['id', 'name', 'email'],
})
```

### Use Binary Formats

For large datasets, use binary serialization:

```typescript
// Instead of JSON (text encoding)
const data = { values: new Array(100000).fill(0).map((_, i) => i) }
// JSON: ~600KB

// Use TypedArray (binary)
const buffer = new Uint32Array(100000)
for (let i = 0; i < 100000; i++) buffer[i] = i
// Binary: 400KB (33% smaller, faster serialization)

// Stream binary data
window.api.uploadBinaryData(
  { filename: 'data.bin' },
  (onData) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      },
    })
    return stream
  },
  () => console.log('Upload complete')
)
```

### Compress Large Payloads

```typescript
import pako from 'pako'

// Compress before sending
const largeText = generateLargeText() // 5MB
const compressed = pako.gzip(largeText) // 500KB (10x reduction)

await window.api.invokeUploadCompressed({
  data: compressed,
  originalSize: largeText.length,
})

// Main process decompresses
class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    UploadCompressed: async (_event, { data, originalSize }) => {
      const decompressed = pako.ungzip(data, { to: 'string' })
      await processData(decompressed)
      return { success: true, ratio: originalSize / data.length }
    },
  }
}
```

## Streaming Best Practices

### Stream Chunk Size

Optimal chunk sizes for different scenarios:

```typescript
// Text data: 16-64KB chunks
async function* generateTextChunks(text: string) {
  const CHUNK_SIZE = 32 * 1024 // 32KB
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    yield text.slice(i, i + CHUNK_SIZE)
  }
}

// Binary data: 64-256KB chunks
async function* generateBinaryChunks(buffer: ArrayBuffer) {
  const CHUNK_SIZE = 128 * 1024 // 128KB
  const view = new Uint8Array(buffer)

  for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength)
    yield view.slice(offset, end)
  }
}
```

### Stream Backpressure

Handle backpressure to prevent memory issues:

```typescript
// Renderer: Stream with backpressure
window.api.downloadLargeDataset(
  { query: 'SELECT * FROM huge_table' },
  async (chunk) => {
    // Process chunk (might be slow)
    await processAndRenderChunk(chunk)

    // Backpressure naturally applied by async callback
  },
  () => console.log('Stream complete')
)

// Main process: Respect backpressure
class RegisterHandler extends AbstractRegisterHandler {
  streamInvokeHandlers: IPCStreamInvokeHandlerType<StreamInvokeContracts> = {
    DownloadLargeDataset: async (_event, request) => {
      const stream = new ReadableStream({
        async start(controller) {
          const rows = await queryDatabase(request.query)

          for (const row of rows) {
            // Enqueue chunk
            controller.enqueue(row)

            // Wait for backpressure signal
            if (controller.desiredSize !== null && controller.desiredSize <= 0) {
              await new Promise((resolve) => setTimeout(resolve, 10))
            }
          }

          controller.close()
        },
      })

      return stream
    },
  }
}
```

## Memory Management

### Avoid Memory Leaks

```typescript
// ❌ Bad: Listener not cleaned up
window.api.onDataUpdate((data) => {
  updateUI(data)
})
// Listener persists even after component unmounts!

// ✅ Good: Clean up listener
useEffect(() => {
  const cleanup = window.api.onDataUpdate((data) => {
    updateUI(data)
  })

  return () => cleanup() // Remove listener on unmount
}, [])
```

### Stream Cleanup

Always clean up streams on errors or cancellation:

```typescript
// Renderer: Proper stream cleanup
let cancelStream: (() => void) | null = null

function startDownload() {
  window.api.downloadFile(
    { path: '/large/file.dat' },
    (chunk) => processChunk(chunk),
    () => console.log('Complete'),
    (error) => console.error('Error:', error),
    (cancel) => {
      // Store cancel function
      cancelStream = cancel
    }
  )
}

function stopDownload() {
  if (cancelStream) {
    cancelStream() // Cleanup resources
    cancelStream = null
  }
}
```

## Profiling & Benchmarking

### Use IPC Inspector

Built-in performance metrics:

```typescript
// Enable inspector in development
import { enableIpcInspector } from '@number10/electron-ipc/inspector'

if (process.env.NODE_ENV === 'development') {
  enableIpcInspector({
    openOnStart: true,
    payloadMode: 'size', // Track payload sizes
  })
}

// Open inspector: Cmd+Shift+I (macOS) or Ctrl+Shift+I (Windows/Linux)
// View metrics:
// - Call counts per channel
// - Average duration
// - Payload sizes
// - Error rates
```

### Manual Benchmarking

```typescript
// Renderer: Measure IPC latency
async function benchmarkIPC() {
  const iterations = 1000
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    await window.api.invokePing({ message: 'test' })
  }

  const end = performance.now()
  const avgLatency = (end - start) / iterations

  console.log(`Average IPC latency: ${avgLatency.toFixed(2)}ms`)
  // Typical: 1-3ms on modern hardware
}

// Measure payload size impact
async function benchmarkPayloadSize() {
  const sizes = [1, 10, 100, 1000, 10000] // KB

  for (const sizeKB of sizes) {
    const payload = new Array(sizeKB * 1024).fill('x').join('')

    const start = performance.now()
    await window.api.invokeEchoData({ data: payload })
    const duration = performance.now() - start

    console.log(`${sizeKB}KB: ${duration.toFixed(2)}ms`)
  }
}
```

### Throughput Testing

```typescript
// Test high-frequency broadcasts
async function benchmarkBroadcastThroughput() {
  let received = 0

  const cleanup = window.api.onHighFrequencyEvent(() => {
    received++
  })

  // Trigger 10,000 broadcasts from main
  await window.api.invokeStartBenchmark({
    eventCount: 10000,
  })

  // Wait for completion
  await new Promise((resolve) => setTimeout(resolve, 2000))

  console.log(`Received ${received} events`)
  console.log(`Throughput: ${(received / 2).toFixed(0)} events/second`)

  cleanup()
}
```

## Common Performance Anti-Patterns

### ❌ Anti-Pattern 1: Polling

```typescript
// BAD: Polling every 100ms
setInterval(async () => {
  const status = await window.api.invokeGetStatus()
  updateUI(status)
}, 100)
```

```typescript
// GOOD: Subscribe to updates
window.api.onStatusChanged((status) => {
  updateUI(status)
})
```

### ❌ Anti-Pattern 2: Large Synchronous Arrays

```typescript
// BAD: Blocking with large array
const items = await window.api.invokeGetAllItems()
// Returns 50,000 items in single payload
for (const item of items) {
  renderItem(item) // Blocks UI
}
```

```typescript
// GOOD: Stream and render incrementally
window.api.downloadItems(
  { limit: 50000 },
  (item) => {
    renderItem(item) // Non-blocking
  },
  () => console.log('All items rendered')
)
```

### ❌ Anti-Pattern 3: Nested IPC Calls

```typescript
// BAD: N+1 queries
const users = await window.api.invokeGetUsers()
for (const user of users) {
  const details = await window.api.invokeGetUserDetails(user.id)
  // 1 + N IPC calls!
}
```

```typescript
// GOOD: Single call with joined data
const usersWithDetails = await window.api.invokeGetUsersWithDetails()
// 1 IPC call
```

### ❌ Anti-Pattern 4: Uncompressed Large Payloads

```typescript
// BAD: Sending raw JSON (5MB)
await window.api.invokeUploadData({
  data: largeJsonObject,
})
```

```typescript
// GOOD: Stream or compress
// Option 1: Stream
window.api.uploadDataStream(
  { filename: 'data.json' },
  (onData) => createStreamFromObject(largeJsonObject),
  () => console.log('Upload complete')
)

// Option 2: Compress
const compressed = pako.gzip(JSON.stringify(largeJsonObject))
await window.api.invokeUploadCompressed({ data: compressed })
```

## Performance Checklist

### Development

- [ ] **Profile with Inspector** - Use IPC Inspector to identify bottlenecks
- [ ] **Measure baseline** - Establish performance baselines for critical paths
- [ ] **Batch high-frequency operations** - Use time or size-based batching
- [ ] **Debounce user input** - Prevent excessive IPC from typing/scrolling
- [ ] **Stream large data** - Use streams for payloads >1MB
- [ ] **Minimize payload sizes** - Send only required fields
- [ ] **Clean up listeners** - Remove event listeners on unmount
- [ ] **Test with realistic data** - Use production-sized datasets

### Production

- [ ] **Disable tracing** - Set `traceEnabled: false` in inspector config
- [ ] **Optimize chunk sizes** - Test different sizes for your use case
- [ ] **Monitor memory usage** - Watch for memory leaks in long-running apps
- [ ] **Cache static data** - Avoid repeated fetches of unchanging data
- [ ] **Use compression** - Compress large text payloads before transfer
- [ ] **Limit concurrent streams** - Prevent resource exhaustion

## Real-World Examples

### Example 1: Optimized Dashboard

```typescript
// Before: 50 IPC calls/second, UI lag
setInterval(() => {
  fetchCPU()
  fetchMemory()
  fetchDisk()
  fetchNetwork()
  // ... 10+ individual calls
}, 100)

// After: 1 IPC call/second, smooth UI
setInterval(async () => {
  const metrics = await window.api.invokeGetAllMetrics()
  updateDashboard(metrics)
}, 1000)

// + Subscribe to critical updates
window.api.onCriticalAlert((alert) => {
  showAlert(alert)
})
```

**Impact**: 50x fewer IPC calls, 60 FPS UI.

### Example 2: Log Aggregation

```typescript
// Before: ~1000 IPC calls for 1000 log entries
function log(message: string) {
  window.api.sendLogEntry({ message, timestamp: Date.now() })
}

// After: ~10 IPC calls for 1000 log entries
const logBatcher = new HybridBatcher<LogEntry>(
  100, // Max batch size
  500, // Max delay 500ms
  (logs) => window.api.invokeBatchLog(logs)
)

function log(message: string) {
  logBatcher.add({ message, timestamp: Date.now() })
}
```

**Impact**: 100x fewer IPC calls, negligible latency impact.

### Example 3: File Export

```typescript
// Before: 5GB file → OOM crash
const data = await window.api.invokeExportDatabase()
downloadFile(data) // Memory spike, potential crash

// After: 5GB file → constant 64MB memory
window.api.downloadExportDatabase(
  { format: 'csv' },
  (chunk) => {
    // Stream to disk
    fileWriter.write(chunk)
  },
  () => {
    fileWriter.close()
    console.log('Export complete')
  }
)
```

**Impact**: Handles 100x larger files with constant memory.

## Performance Targets

Aim for these targets in production:

| Metric                | Target  | Measurement           |
| --------------------- | ------- | --------------------- |
| **Invoke latency**    | <5ms    | p50 response time     |
| **Broadcast latency** | <2ms    | Time to renderer      |
| **Stream throughput** | >50MB/s | Large file transfers  |
| **Event throughput**  | >1000/s | High-frequency events |
| **Memory overhead**   | <50MB   | IPC buffers           |
| **Payload size**      | <1MB    | Per invoke call       |

## Resources

- [IPC Inspector](./inspector.md) - Built-in performance profiling
- [Security Guide](./security.md) - Security considerations
- [Electron Performance Docs](https://www.electronjs.org/docs/latest/tutorial/performance)

## Monitoring in Production

### Logging Performance Metrics

```typescript
// Main process: Track IPC performance
import { trackInvokePerformance } from '@number10/electron-ipc/inspector'

class RegisterHandler extends AbstractRegisterHandler {
  handlers: IPCHandlerType<InvokeContracts> = {
    CriticalOperation: async (event, request) => {
      const start = Date.now()
      const result = await performCriticalOperation(request)
      const duration = Date.now() - start

      if (duration > 100) {
        console.warn(`Slow IPC: CriticalOperation took ${duration}ms`)
        // Send to monitoring service
        trackMetric('ipc.slow', { channel: 'CriticalOperation', duration })
      }

      return result
    },
  }
}
```

### Error Rate Monitoring

```typescript
// Track IPC errors
let errorCount = 0
let successCount = 0

window.api.onError((error) => {
  errorCount++
  const rate = errorCount / (errorCount + successCount)

  if (rate > 0.01) {
    // >1% error rate
    reportToMonitoring({ metric: 'ipc.error_rate', value: rate })
  }
})
```

---

**Next Steps**: Start with Inspector profiling to identify bottlenecks, then apply targeted optimizations from this guide.

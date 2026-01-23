# Renderer-to-Renderer IPC Communication

## Overview

The `RendererInvokeContract` enables **type-safe, bidirectional request-response communication** between renderer processes via main process routing. This pattern is ideal for multi-window applications where windows need to exchange data or coordinate actions.

## Architecture

```
Renderer A (caller)  →  Main Process (router)  →  Renderer B (handler)
       ↓                                                   ↓
  awaits response     ←  Main Process (router)  ←  returns response
```

**Key Features:**

- ✅ Type-safe request-response between renderers
- ✅ Main process mediates and validates all communication
- ✅ Automatic timeout handling
- ✅ Full Inspector tracing support
- ✅ Error propagation with stack traces
- ✅ Context information (source window, role)

## Setup

### 1. Initialize Router in Main Process

```typescript
// main.ts
import { app } from 'electron'
import { initRendererInvokeRouter } from '@number10/electron-ipc/renderer-routing'
import { getWindowRegistry } from '@number10/electron-ipc/window-manager'

app.whenReady().then(() => {
  // Initialize router ONCE before creating windows
  initRendererInvokeRouter()

  // Create and register windows
  const mainWindow = createMainWindow()
  getWindowRegistry().register(mainWindow, 'main')

  const dashboardWindow = createDashboardWindow()
  getWindowRegistry().register(dashboardWindow, 'dashboard')
})
```

### 2. Define Contracts

```typescript
// ipc-api.ts
import { GenericRendererInvokeContract, IRendererInvokeContract } from '@number10/electron-ipc'

export type RendererInvokeContracts = GenericRendererInvokeContract<{
  /**
   * Get dashboard data
   */
  GetDashboardData: IRendererInvokeContract<
    { query: string; filters?: Record<string, unknown> },
    { data: unknown[]; timestamp: number; total: number }
  >

  /**
   * Request window state
   */
  GetWindowState: IRendererInvokeContract<
    void,
    { isMaximized: boolean; bounds: { x: number; y: number; width: number; height: number } }
  >

  /**
   * Update chart configuration
   */
  UpdateChart: IRendererInvokeContract<
    { chartId: string; config: Record<string, unknown> },
    { success: boolean; updatedAt: number }
  >
}>
```

### 3. Configure Generator

```yaml
# ipc-config.yaml
apis:
  - name: myApi
    input: ./src/main/ipc-api.ts
    output: ./src/preload/ipc-api.generated.ts
    contracts:
      invoke: InvokeContracts
      event: EventContracts
      send: BroadcastContracts
      rendererInvoke: RendererInvokeContracts # ← Add this
```

### 4. Generate Code

```bash
pnpm electron-ipc-generate
```

## Usage

### Renderer A: Call Another Renderer

```typescript
// main-window/renderer.ts

// Type-safe method (recommended)
const result = await window.api.rendererInvokeGetDashboardData('dashboard', {
  query: 'sales',
  filters: { year: 2024 },
})

console.log('Dashboard data:', result.data)
console.log('Total records:', result.total)

// Generic method (flexible)
const state = await window.api.invokeInRenderer<void, WindowState>(
  'settings',
  'GetWindowState',
  undefined,
  { timeout: 3000 }
)

// With error handling
try {
  const chartResult = await window.api.rendererInvokeUpdateChart('editor', {
    chartId: 'sales-chart-1',
    config: { type: 'bar', colors: ['#ff0000'] },
  })

  if (chartResult.success) {
    console.log('Chart updated at:', new Date(chartResult.updatedAt))
  }
} catch (error) {
  console.error('Failed to update chart:', error.message)
}
```

### Renderer B: Handle Requests

```typescript
// dashboard-window/renderer.ts

// Register handler for GetDashboardData
const cleanup = window.api.handleGetDashboardData(async (request, context) => {
  console.log(`Request from window ${context.sourceWindowId} (role: ${context.sourceRole})`)

  // Process the request
  const data = await queryDatabase(request.query, request.filters)

  // Return typed response
  return {
    data,
    timestamp: Date.now(),
    total: data.length,
  }
})

// Cleanup on window close
window.addEventListener('beforeunload', () => {
  cleanup()
})
```

### Editor Window: Handle Chart Updates

```typescript
// editor-window/renderer.ts

window.api.handleUpdateChart(async (request, context) => {
  const { chartId, config } = request

  // Update chart configuration
  const chart = getChartById(chartId)
  if (!chart) {
    throw new Error(`Chart '${chartId}' not found`)
  }

  chart.updateConfig(config)

  return {
    success: true,
    updatedAt: Date.now(),
  }
})
```

## Advanced Patterns

### Conditional Handling

```typescript
window.api.handleGetDashboardData(async (request, context) => {
  // Only accept requests from main window
  if (context.sourceRole !== 'main') {
    throw new Error('Unauthorized: Only main window can request dashboard data')
  }

  return await fetchData(request.query)
})
```

### Timeout Configuration

```typescript
// Short timeout for quick operations
const quickData = await window.api.rendererInvokeGetWindowState('settings', undefined, {
  timeout: 1000, // 1 second
})

// Longer timeout for heavy operations
const heavyData = await window.api.rendererInvokeGetDashboardData('analytics', query, {
  timeout: 30000, // 30 seconds
})
```

### Multiple Handlers (Last Registered Wins)

```typescript
// Initial handler
const cleanup1 = window.api.handleGetDashboardData(async () => {
  return { data: [], timestamp: 0, total: 0 }
})

// Replace handler
cleanup1() // Clean up old handler
const cleanup2 = window.api.handleGetDashboardData(async (request) => {
  return await fetchRealData(request.query)
})
```

## Error Handling

### In Handler

```typescript
window.api.handleGetDashboardData(async (request) => {
  if (!request.query) {
    throw new Error('Query parameter is required')
  }

  try {
    const data = await database.query(request.query)
    return { data, timestamp: Date.now(), total: data.length }
  } catch (dbError) {
    throw new Error(`Database error: ${dbError.message}`)
  }
})
```

### In Caller

```typescript
try {
  const result = await window.api.rendererInvokeGetDashboardData('dashboard', query)
  displayData(result.data)
} catch (error) {
  if (error.message.includes('timeout')) {
    showError('Request timed out. Dashboard window may be busy.')
  } else if (error.message.includes('not found')) {
    showError('Dashboard window is not available.')
  } else {
    showError(`Failed to fetch data: ${error.message}`)
  }
}
```

## Debugging

### Check Router Status

```typescript
// main.ts
import { getRendererInvokeRouter } from '@number10/electron-ipc/renderer-routing'

setInterval(() => {
  const stats = getRendererInvokeRouter().getStats()
  console.log('Pending renderer invokes:', stats.pendingRequests)
  stats.requests.forEach((req) => {
    console.log(`  - ${req.channel} → ${req.targetRole} (waiting ${req.waitingMs}ms)`)
  })
}, 5000)
```

### Inspector Integration

All renderer-to-renderer invokes are automatically traced in the IPC Inspector:

```
[rendererInvoke] GetDashboardData
  Source: main (window #1)
  Target: dashboard (window #2)
  Duration: 42ms
  Status: ok
  Request: { query: "sales", filters: {...} }
  Response: { data: [...], timestamp: 1706000000000, total: 150 }
```

## Best Practices

### ✅ DO

- **Initialize router once** in main process before creating windows
- **Register windows** with meaningful roles using WindowRegistry
- **Use type-safe methods** (`rendererInvokeGetDashboardData`) for better DX
- **Handle errors** in both caller and handler
- **Clean up handlers** when windows close
- **Validate requests** in handlers (check source role if needed)
- **Set appropriate timeouts** based on operation complexity

### ❌ DON'T

- Don't forget to initialize the router (`initRendererInvokeRouter()`)
- Don't create circular dependencies (Window A → Window B → Window A)
- Don't use blocking operations in handlers
- Don't share sensitive data without validation
- Don't forget to handle "window not found" errors
- Don't use very short timeouts for complex operations

## Performance Considerations

**Overhead:** ~2-5ms per invoke (routing through main process)

**When to use:**

- ✅ Window coordination and data exchange
- ✅ Request-response patterns between windows
- ✅ State synchronization
- ✅ Command execution across windows

**When NOT to use:**

- ❌ High-frequency updates (use broadcasts instead)
- ❌ Large data transfers (use streams)
- ❌ Real-time coordination (consider MessageChannel for direct communication)

## Comparison with Alternatives

| Feature           | RendererInvoke        | Broadcast             | Direct MessageChannel |
| ----------------- | --------------------- | --------------------- | --------------------- |
| Type Safety       | ✅✅✅                | ✅✅✅                | ⚠️ Manual             |
| Request-Response  | ✅                    | ❌                    | ✅                    |
| Security          | ✅✅✅ Main validates | ✅✅✅ Main validates | ⚠️ Direct             |
| Setup Complexity  | Low                   | Low                   | High                  |
| Performance       | Good                  | Excellent             | Excellent             |
| Inspector Support | ✅                    | ✅                    | ❌                    |

## Related Documentation

- [Window Manager](window-manager.md) - Window registry and role-based organization
- [Multi-Window Patterns](multi-window.md) - Broadcast and state management
- [Inspector](inspector.md) - Debugging and tracing

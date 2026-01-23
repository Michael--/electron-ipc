# Renderer-to-Renderer Invoke Error Handling

## Overview

Renderer-to-Renderer (R2R) IPC communication can fail in several ways. This document describes the error scenarios, current behavior, and recommendations.

## Error Scenarios

### 1. Target Window Role Does Not Exist

**Scenario**: Invoking a window role that is not registered in the WindowRegistry.

```typescript
// No window with role 'nonExistentRole' exists
await window.api.rendererInvokeAddLogEntry('nonExistentRole', request)
```

**Current Behavior**:

- Router immediately throws: `Error: No window with role 'nonExistentRole' found`
- Error is synchronous (happens during routing in main process)
- No timeout occurs
- Trace events show the error immediately

**Error Path**:

1. Renderer calls `rendererInvokeAddLogEntry('nonExistentRole', ...)`
2. Main process router receives request
3. Router calls `getWindowRegistry().getByRole('nonExistentRole')`
4. Returns empty array → throws error immediately
5. Error propagates back to renderer as rejected Promise

### 2. Target Window Exists But No Handler Registered

**Scenario**: Target window exists but hasn't registered a handler for the requested channel.

```typescript
// 'main' window exists but has no handler for AddLogEntry
await window.api.rendererInvokeAddLogEntry('main', request)
```

**Current Behavior**:

- Router successfully sends request to target window
- Target window receives IPC event but has no listener
- Request times out after configured timeout (default: 5000ms)
- Error: `Renderer invoke timeout after 5000ms for channel 'AddLogEntry'`

**Error Path**:

1. Renderer calls `rendererInvokeAddLogEntry('main', ...)`
2. Main process router finds 'main' window successfully
3. Router sends: `targetWindow.webContents.send('__RENDERER_HANDLER_AddLogEntry__', ...)`
4. Target window receives event but no handler is registered
5. Event is silently ignored by Electron
6. Timeout triggers after 5000ms
7. Error propagates back to source renderer

### 3. Target Window Destroyed After Route But Before Response

**Scenario**: Target window closes or crashes after receiving the request.

**Current Behavior**:

- Request times out (no response received)
- Same behavior as scenario #2

**Note**: Router checks `targetWindow.isDestroyed()` before sending, but race condition is possible.

### 4. Handler Throws Error

**Scenario**: Handler is registered but throws an error during execution.

```typescript
window.api.handleAddLogEntry(async (request) => {
  throw new Error('Database connection failed')
})
```

**Current Behavior**:

- Handler error is caught
- Error is sent back to source renderer via `__RENDERER_RESPONSE__` channel
- Source renderer receives rejected Promise with error message
- Trace events show error with stack trace

## Current Error Handling Strengths

✅ **Immediate validation** - Non-existent windows fail fast  
✅ **Timeout protection** - Prevents hanging requests  
✅ **Error propagation** - Handler errors reach the caller  
✅ **Trace visibility** - All errors appear in Inspector traces  
✅ **Type safety** - TypeScript prevents invalid channel names

## Potential Improvements

### 1. Handler Registration Validation (Optional)

**Problem**: No way to know if target has registered handler before sending.

**Solution Option A** - Handler Registry:

```typescript
// In router.ts
private registeredHandlers = new Map<string, Set<string>>() // role → channels

// Track handler registrations
ipcMain.on('__REGISTER_HANDLER__', (event, channel) => {
  const window = getWindowFromEvent(event)
  const role = getWindowRegistry().getByWindowId(window.id)?.role
  if (role) {
    if (!this.registeredHandlers.has(role)) {
      this.registeredHandlers.set(role, new Set())
    }
    this.registeredHandlers.get(role)!.add(channel)
  }
})

// Check before routing
if (!this.registeredHandlers.get(targetRole)?.has(channel)) {
  throw new Error(`Window '${targetRole}' has no handler for '${channel}'`)
}
```

**Pros**:

- Fail fast instead of timeout
- Better error messages
- Inspector shows clear "no handler" error

**Cons**:

- Additional complexity
- Handler registration tracking overhead
- Race conditions if handler registers after check

**Recommendation**: ⚠️ **NOT recommended** - Timeout-based approach is simpler and race-condition-free.

### 2. Configurable Timeouts (Recommended)

**Problem**: 5000ms timeout may be too long for some scenarios, too short for others.

**Solution**:

```typescript
// Already supported in implementation!
await window.api.rendererInvokeAddLogEntry('logger', request, {
  timeout: 2000, // Custom timeout
})
```

**Recommendation**: ✅ **Already implemented** - Document this feature.

### 3. Retry Logic (Optional)

**Problem**: Transient failures (window not ready, temporary network issues in remote scenarios)

**Solution Option**: Add retry logic in generated code:

```typescript
async function invokeWithRetry(targetRole, channel, request, options) {
  const maxRetries = options?.retries ?? 0
  let lastError

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await rendererInvoke(targetRole, channel, request, options)
    } catch (error) {
      lastError = error
      if (i < maxRetries) {
        await delay(options?.retryDelay ?? 1000)
      }
    }
  }

  throw lastError
}
```

**Recommendation**: ⚠️ **Not recommended for core** - Should be application-level concern if needed.

### 4. Window Readiness Check (Considered)

**Problem**: Window might not be fully initialized when handler registration is attempted.

**Solution**: Add readiness signaling:

```typescript
// In renderer
await window.api.signalReady()

// Router waits for ready signal before routing
```

**Recommendation**: ⚠️ **Not recommended** - Adds complexity without clear benefit. Timeout handles this case.

## Best Practices

### For Application Developers

1. **Always handle errors**:

   ```typescript
   try {
     const result = await window.api.rendererInvokeAddLogEntry('logger', request)
   } catch (error) {
     console.error('Failed to send log:', error)
     // Fallback: store locally, show notification, etc.
   }
   ```

2. **Use appropriate timeouts**:

   ```typescript
   // Quick operations
   await api.rendererInvokeGetLogCount('logger', undefined, { timeout: 1000 })

   // Slow operations
   await api.rendererInvokeProcessData('worker', data, { timeout: 30000 })
   ```

3. **Verify window existence before invoking** (if critical):

   ```typescript
   const windows = await window.api.invokeGetAllWindows()
   const hasLogger = windows.some((w) => w.role === 'logger')

   if (hasLogger) {
     await window.api.rendererInvokeAddLogEntry('logger', request)
   }
   ```

4. **Register handlers early**:

   ```typescript
   // In renderer initialization
   useEffect(() => {
     const unregister = window.api.handleAddLogEntry(async (request) => {
       // Handle request
     })
     return unregister
   }, []) // Empty deps = register once
   ```

5. **Use Inspector for debugging**:
   - Check trace events for failed requests
   - Look for timeout errors vs. immediate failures
   - Verify request payloads and target roles

## Testing Error Scenarios

The multi-window test app includes error testing buttons:

**Test: Invalid Window Role**

- Sends request to non-existent window
- Expected: Immediate error "No window with role '...' found"
- Verifies: Fast failure for invalid targets

**Test: Missing Handler**

- Sends request to existing window without handler
- Expected: Timeout error after 5000ms
- Verifies: Timeout protection works

## Conclusion

**Current implementation is robust and production-ready:**

- ✅ Fails fast for non-existent windows
- ✅ Times out gracefully for unhandled requests
- ✅ Propagates errors from handlers
- ✅ Full tracing support for debugging
- ✅ Configurable timeouts already available

**No core changes recommended** - Current behavior strikes good balance between:

- Simplicity (no complex handler tracking)
- Reliability (timeout-based protection)
- Performance (immediate validation where possible)
- Developer experience (clear error messages, tracing)

**Application-level error handling is the right place** for retry logic, fallbacks, and advanced scenarios.

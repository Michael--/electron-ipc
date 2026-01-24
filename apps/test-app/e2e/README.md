# E2E Tests for test-app

Automated end-to-end tests using Playwright for Electron to ensure IPC communication works correctly.

## Test Coverage

**12 passing tests** in `api-direct.spec.ts` that verify the IPC layer directly without UI interaction.

### ✅ Invoke Calls

- AddNumbers: Basic arithmetic operation
- AddNumbers: 100 rapid concurrent calls (performance test)
- GetAppInfo: Fetch application metadata

### ✅ Validation Error Handling

- ValidateUser: Reject invalid name (too short)
- ValidateUser: Reject invalid age (out of range)
- ValidateUser: Accept valid data
- AddNumbers: Reject invalid types
- AddNumbers: Reject missing parameters

### ✅ Broadcast Listeners

- Verify `onPing` function exists
- Verify `onAbout` function exists
- Test register/unregister lifecycle

### ✅ API Completeness

- All expected methods are available
- Type-safe API surface

## Running Tests

```bash
# Run all E2E tests (builds app first)
pnpm run test:e2e

# Run with UI mode
pnpm run test:e2e:ui

# Run in debug mode
pnpm run test:e2e:debug

# Run with visible browser
pnpm run test:e2e:headed

# Run specific test file
npx playwright test e2e/api-direct.spec.ts

# Run specific test
npx playwright test e2e/api-direct.spec.ts:30
```

## What Gets Tested?

### ✅ **Automatically Verified**

1. **App Launch**: Electron app starts without crashes
2. **IPC Layer**: All invoke/event/broadcast channels work
3. **Validation**: Zod schemas reject invalid data
4. **Type Safety**: Generated API matches contracts
5. **Performance**: Handles 100+ rapid concurrent calls
6. **Error Handling**: Proper error propagation from main to renderer
7. **API Completeness**: All expected methods exist

### ❌ **Not Tested** (requires manual testing)

- Visual appearance (colors, layout)
- User experience (is it intuitive?)
- Platform-specific behavior (macOS/Windows/Linux differences)

## Test Architecture

```
apps/test-app/
├── e2e/
│   ├── api-direct.spec.ts         # 12 tests - IPC API layer
│   └── README.md                  # This file
├── playwright.config.ts           # Playwright configuration
└── test-results/                  # Test artifacts (screenshots, traces)
```

## Why Only API Tests?

**UI tests are intentionally excluded** because:

- ❌ Fragile (break on every UI change)
- ❌ Slow (selector timeouts)
- ❌ Not the focus (testing IPC, not React components)

**API tests are sufficient** because:

- ✅ Test the IPC layer directly
- ✅ Fast and reliable (<2s)
- ✅ Cover all contract types (invoke, event, broadcast)
- ✅ Verify validation and error handling

## Integration with CI/CD

Add to `.github/workflows/test.yml`:

```yaml
- name: Run E2E Tests
  run: pnpm --filter electron-ipc-test-app run test:e2e
```

## Benefits

1. **Regression Prevention**: Catch breaking changes before merge
2. **Confidence**: Verify all IPC channels work end-to-end
3. **Documentation**: Tests serve as usage examples
4. **Performance Baseline**: Detect performance degradation
5. **Cross-Platform**: Can run on Linux/macOS/Windows in CI

## Future Improvements

- [ ] Test stream APIs (upload/download)
- [ ] Memory leak detection
- [ ] Test Inspector integration
- [ ] Cross-platform matrix testing in CI
- [ ] Multi-window IPC scenarios

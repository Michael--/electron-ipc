# Release Notes - Version 2.1.0

## 🎉 Minor Release: Runtime Validation + Generator Ergonomics

This release focuses on developer ergonomics and safety. It adds optional runtime validation helpers, improves the generator workflow, and provides ready-to-use templates and examples.

## ✨ Highlights

- **Runtime validation helpers (optional)**: Adapter utilities for Zod/Valibot‑style validators and stream chunk validation.
- **Generator workflows**: `--watch` for dev and `--check` for CI validation.
- **Main/preload output split**: Dedicated `mainBroadcastOutput` for main‑side broadcast APIs.
- **Streaming improvements**: Cleanup/stop/cancel support for stream lifecycles.
- **Examples & templates**: electron‑vite + electron‑forge guides and a basic template.

## 🧩 Runtime Validation Example

```typescript
import { z } from 'zod'
import {
  defineInvokeHandlers,
  validatorFromSafeParse,
  withInvokeValidation,
} from '@number10/electron-ipc'

const requestValidator = validatorFromSafeParse(
  z.object({ a: z.number(), b: z.number() }).safeParse
)
const responseValidator = validatorFromSafeParse(z.number().safeParse)

const handlers = defineInvokeHandlers<InvokeContracts>({
  AddNumbers: withInvokeValidation(
    { request: requestValidator, response: responseValidator },
    async (_event, { a, b }) => a + b
  ),
})
```

## 📦 Installation

```bash
npm install @number10/electron-ipc@2.1.0
```

## 🔗 Resources

- [Changelog](./CHANGELOG.md)
- [Documentation](./packages/electron-ipc/README.md)
- [Examples](./docs/README.md)

# Release Notes - Version 2.0.0

## 🎉 Major Release: Streaming Support & Configuration Overhaul

We're excited to announce version 2.0.0 of @number10/electron-ipc with major new features and important breaking changes.

## 🚨 Breaking Changes

### YAML Configuration Required

CLI arguments have been removed in favor of a YAML-based configuration system. This provides:

- Better structure and maintainability
- Support for multiple API definitions in a single config
- Cleaner, more readable configuration

**Migration:**

```yaml
# Old (v1.x - CLI arguments)
electron-ipc-generate --input=./api.ts --output=./generated.ts --invoke=InvokeContracts

# New (v2.0 - YAML config)
# ipc-config.yaml
apis:
  - name: myApi
    input: ./api.ts
    output: ./generated.ts
    contracts:
      invoke: InvokeContracts
```

### Package Consolidation

- `electron-ipc-react` package has been removed
- React hooks are now generated automatically via `reactHooksOutput` in YAML config
- Contract types are re-exported from generated files

## ✨ New Features

### Streaming Support

Full support for large data transfers using Web Streams API:

- **StreamInvokeContract**: Request with streaming response
- **StreamUploadContract**: Upload data stream from renderer
- **StreamDownloadContract**: Download data stream to renderer

Perfect for:

- File transfers
- Video/audio streaming
- Large dataset processing
- Real-time data feeds

### Automatic React Hooks Generation

Generate React hooks for all contract types:

```yaml
apis:
  - name: myApi
    # ... other config
    reactHooksOutput: ./src/hooks/api-hooks.ts
```

### Cross-Platform Build

Full Windows compatibility:

- Cross-platform file operations (chmod, etc.)
- Proper dependency bundling
- Clean build from scratch support

## 🔧 Improvements

- **Smaller Bundle**: ~24KB (vs ~9MB in early v2 development)
- **Faster Execution**: External dependencies loaded only when needed
- **Better Type Safety**: Compile-time validation for all contracts
- **Improved Documentation**: Complete examples for all patterns

## 📦 Installation

```bash
npm install @number10/electron-ipc@2.0.0
```

## 🔗 Resources

- [Full Changelog](./CHANGELOG.md)
- [Documentation](./packages/electron-ipc/README.md)
- [Migration Guide](./packages/electron-ipc/README.md#migration-from-v1)

## 🙏 Thank You

Thank you to everyone who contributed to this release!

---

**Note**: This is a major version bump due to breaking changes. Please review the migration guide before upgrading.

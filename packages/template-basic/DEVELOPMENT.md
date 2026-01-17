# Template Development Guide

This document explains how this template works as a workspace package within the monorepo.

## Architecture

### Location

`packages/template-basic/` - Standalone workspace package (like test-app)

### Why Separate Package?

**Previously:** `packages/electron-ipc/templates/basic/`  
**Problem:** Can't reference parent package `@number10/electron-ipc`

**Now:** `packages/template-basic/`  
**Benefits:**

- ✅ Proper workspace dependency via `workspace:*`
- ✅ Real `node_modules` with symlink
- ✅ TypeScript references work correctly
- ✅ No IDE type errors
- ✅ Same workflow as test-app

## Development Workflow

### Prerequisites

1. Build electron-ipc package:

```bash
cd packages/electron-ipc
pnpm run build
```

2. Install dependencies (creates workspace link):

```bash
cd packages/template-basic
pnpm install
```

### Running Scripts

```bash
cd packages/template-basic

# Generate IPC code
pnpm run generate

# Clean generated files
pnpm run clean

# Type check
pnpm run typecheck
```

All scripts use the workspace dependency like a real user project would.

## How It Works

### package.json

```json
{
  "devDependencies": {
    "@number10/electron-ipc": "workspace:*"
  }
}
```

- Creates `node_modules/@number10/electron-ipc` → symlink to `../electron-ipc`
- CLI command `electron-ipc-generate` works from `node_modules/.bin`

### tsconfig.json

```jsonc
{
  "extends": "../../tsconfig.json",
  "references": [
    {
      "path": "../electron-ipc",
    },
  ],
}
```

- TypeScript project references for type resolution
- Same pattern as test-app

### Verification

Check workspace link exists:

```bash
ls -la node_modules/@number10/electron-ipc
# Should show: lrwxr-xr-x ... -> ../../electron-ipc
```

## Testing Changes

### Full Test Cycle

1. **Make changes** to contracts in `ipc-api.ts`
2. **Clean** old generated files: `pnpm run clean`
3. **Generate** new code: `pnpm run generate`
4. **Type check**: `pnpm run typecheck`
5. **Verify** IDE shows no errors

### Testing Generator Changes

After modifying electron-ipc generator:

1. Build parent package:

```bash
cd ../electron-ipc
pnpm run build
```

2. Regenerate template:

```bash
cd ../template-basic
pnpm run clean
pnpm run generate
pnpm run typecheck
```

## Common Issues

### "Cannot find module '@number10/electron-ipc'"

**Causes:**

- Workspace dependency not installed
- electron-ipc package not built

**Fixes:**

```bash
# From template-basic
pnpm install

# From electron-ipc
cd ../electron-ipc && pnpm run build
```

### "command not found: electron-ipc-generate"

**Cause:** node_modules/.bin not in PATH or not installed

**Fix:**

```bash
pnpm install
```

### IDE Type Errors

**If errors persist after fixes above:**

- Restart TypeScript server in VSCode
- Check `node_modules/@number10/electron-ipc` symlink exists

## User Experience vs Monorepo

| Aspect              | In Monorepo                | In User Project            |
| ------------------- | -------------------------- | -------------------------- |
| Location            | `packages/template-basic/` | Copied to user's app       |
| Dependencies        | Via workspace:\*           | Via npm registry           |
| tsconfig extends    | `../../tsconfig.json`      | User's own or removed      |
| tsconfig references | Points to electron-ipc     | Removed                    |
| Scripts             | Same as user               | Same                       |
| node_modules        | Symlink to sibling package | Real install from registry |

## Maintenance Checklist

When updating template:

- [ ] Update contract examples in `ipc-api.ts`
- [ ] Update handler implementations in `main.ts`
- [ ] Rebuild electron-ipc: `cd ../electron-ipc && pnpm run build`
- [ ] Regenerate: `pnpm run clean && pnpm run generate`
- [ ] Type check: `pnpm run typecheck`
- [ ] Verify no IDE errors
- [ ] Update README if structure changes
- [ ] Test copying to fresh project outside monorepo

## Publishing Checklist

Before release:

1. ✅ All scripts work: generate, clean, typecheck
2. ✅ No TypeScript errors
3. ✅ No IDE errors
4. ✅ Generated code is current
5. ✅ README has clear user instructions
6. ✅ Template demonstrates all contract types
7. ✅ Test copy to external project

## Comparison with test-app

Both `template-basic` and `test-app` use the same pattern:

```
packages/
├── electron-ipc/          # Library
├── test-app/              # Full Electron app for testing
└── template-basic/        # Minimal template for users
```

**Shared:**

- Workspace dependencies
- TypeScript references
- Same build/generate workflow

**Differences:**

- test-app: Full app with UI, multiple windows, all features
- template-basic: Minimal starter, basic examples only

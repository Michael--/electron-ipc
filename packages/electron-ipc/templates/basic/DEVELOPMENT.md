# Template Development Guide

This document explains how this template works within the monorepo and how to test/maintain it.

## Structure

This template lives in `packages/electron-ipc/templates/basic/` within the electron-ipc monorepo.
It's a **working example** that uses the code generator on itself.

## Development Workflow

### Running Scripts in Monorepo Context

From the template directory:

```bash
cd packages/electron-ipc/templates/basic

# Generate IPC code (uses parent package's built generator)
pnpm run generate

# Clean generated files
pnpm run clean

# Type check (uses paths mapping to parent src)
pnpm run typecheck
```

### How Scripts Work in Monorepo

#### generate

```json
"generate": "node ../../dist/bin/generate-api.js --config=ipc-config.yaml"
```

- Directly calls the generator from parent package's `dist/`
- No need for `node_modules` in template directory
- Ensures template uses latest built version

#### typecheck

```json
"typecheck": "tsc --noEmit"
```

- Uses `paths` in `tsconfig.json` to resolve `@number10/electron-ipc`
- Points to parent `src/index.ts` for type checking
- Allows validation without installing dependencies

### tsconfig.json Paths Mapping

```jsonc
{
  "compilerOptions": {
    "paths": {
      // Points to parent package for monorepo development
      "@number10/electron-ipc": ["../../src/index.ts"],
    },
  },
}
```

**Important:** This paths mapping is **only for monorepo development**.
When users copy this template, they should remove it (see README).

## Testing Changes

### 1. Build Parent Package

Before testing template:

```bash
cd packages/electron-ipc
pnpm run build
```

### 2. Clean Generated Files

```bash
cd templates/basic
pnpm run clean
```

### 3. Generate Fresh Code

```bash
pnpm run generate
```

### 4. Verify Type Safety

```bash
pnpm run typecheck
```

Should complete without errors.

### 5. Check Generated Files

Verify that generated files look correct:

- `ipc-api.generated.ts` - Has type-safe wrappers
- `ipc-api-main-broadcast.ts` - Has broadcast helpers

## Common Issues

### "command not found: electron-ipc-generate"

**Cause:** Using user-facing script command instead of direct node call.

**Fix:** Use `node ../../dist/bin/generate-api.js --config=ipc-config.yaml`

### "Cannot find module '@number10/electron-ipc'"

**Cause:** Missing paths mapping or parent package not built.

**Fixes:**

1. Ensure `tsconfig.json` has paths mapping
2. Build parent package: `cd ../../ && pnpm run build`

### TypeScript Errors in IDE

**Cause:** IDE doesn't resolve paths mapping correctly without node_modules.

**Expected:** This is normal for templates. `pnpm run typecheck` should still work.

## Maintenance Checklist

When updating the template:

- [ ] Update contract examples in `ipc-api.ts`
- [ ] Update handler implementations in `main.ts`
- [ ] Run `pnpm run build` in parent package
- [ ] Run `pnpm run generate` to regenerate
- [ ] Run `pnpm run typecheck` to verify
- [ ] Update README if structure changes
- [ ] Test copying template to fresh project

## User Experience vs Development

| Aspect         | In Monorepo               | In User Project           |
| -------------- | ------------------------- | ------------------------- |
| Dependencies   | None (uses parent)        | Installed via npm/pnpm    |
| Generator      | `node ../../dist/bin/...` | `electron-ipc-generate`   |
| tsconfig paths | Points to `../../src/`    | Not needed (node_modules) |
| Type checking  | Via paths mapping         | Via node_modules          |

## Publishing Checklist

Before release, verify:

1. ✅ All scripts work in monorepo context
2. ✅ README has clear instructions for users
3. ✅ Template demonstrates all contract types
4. ✅ Generated code is up to date
5. ✅ Type checking passes
6. ✅ No uncommitted changes to generated files

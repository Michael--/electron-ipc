# Template File Structure

```
templates/basic/
├── 📝 Source Files (Hand-Written)
│   ├── ipc-api.ts              # Contract definitions (InvokeContracts, EventContracts, etc.)
│   ├── ipc-config.yaml         # Generator configuration
│   ├── main.ts                 # Main process handlers implementation
│   ├── preload.ts              # Preload script (uses generated API)
│   └── renderer.ts             # Example renderer usage
│
├── ⚙️ Configuration
│   ├── package.json            # Scripts: generate, clean
│   ├── tsconfig.json           # TypeScript config
│   └── .gitignore              # Excludes generated files
│
├── 🤖 Generated Files (Auto-Created)
│   ├── ipc-api.generated.ts         # Preload API (by generator)
│   └── ipc-api-main-broadcast.ts    # Main broadcast helpers (by generator)
│
└── 📚 Documentation
    └── README.md               # Complete usage guide

```

## Workflow

```
┌─────────────────┐
│   ipc-api.ts    │ ← Edit contracts here
│ (Hand-written)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Generator   │ $ pnpm run generate
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  ipc-api.generated.ts               │
│  ipc-api-main-broadcast.ts          │
│  (Auto-generated, type-safe API)    │
└────────┬────────────────────────────┘
         │
         ├──────────────────┬─────────────────┐
         ▼                  ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ main.ts  │      │preload.ts│      │renderer.ts│
   │ (Import) │      │ (Import) │      │  (Use)   │
   └──────────┘      └──────────┘      └──────────┘
```

## Generator Command

```bash
# Generate once
electron-ipc-generate --config=ipc-config.yaml

# Watch mode (auto-regenerate on changes)
electron-ipc-generate --config=ipc-config.yaml --watch

# Validate without writing
electron-ipc-generate --config=ipc-config.yaml --check
```

## Benefits of Self-Generation

✅ **Dogfooding** - Template uses its own system
✅ **Always updated** - Reflects latest generator features  
✅ **Educational** - Shows best practices by example
✅ **Type-safe** - Demonstrates full type safety chain
✅ **Maintainable** - Change contracts → regenerate → done

## Integration Points

1. **ipc-api.ts** defines contracts
2. **ipc-config.yaml** configures generator
3. **Generator** creates type-safe APIs
4. **main.ts** imports and uses generated `mainBroadcast`
5. **preload.ts** imports and exposes generated API
6. **renderer.ts** uses `window.api` with full IntelliSense

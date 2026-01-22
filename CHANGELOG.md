## [2.4.0] - 2026-01-22

### Added

- **Modern Validation System** with adapter-based architecture
  - `zodAdapter.zodValidator()` for Zod 4.x schemas (cleaner API)
  - `valibotAdapter.valibotValidator()` for Valibot integration
  - Standardized error handling with `IPCValidationError` and `IPCHandlerError`
  - Import from `@number10/electron-ipc/validation` for better tree-shaking
  - Zod 4.x type compatibility (supports symbol in ZodIssue path)
- **Trace Context Propagation**
  - Automatic trace context propagation in generated handlers
  - Trace context metadata for request/response correlation
  - Helper functions for manual trace propagation
  - Generator support for trace context in contracts
- **Inspector Enhancements**
  - Trace grouping in UI (group related invoke/events by trace ID)
  - Trace row filtering (hide/show specific trace types)
  - Metrics aggregation system with dashboard view
  - Metrics panel showing events/s, buffer usage, and statistics
  - Trace enable toggle for performance control
  - Versioned trace export format
  - Stream span lifecycle tracking (close spans on cancel)
  - Refined error filtering in trace rows
  - Shortened trace/span IDs for better readability
- **Inspector Lab App** (`apps/inspector-lab`)
  - New test application for Inspector development
  - Dashboard with slow invoke grouping by trace
  - Activity panel with pinned layout
  - Comprehensive README with feature checklist
- **Documentation**
  - Interactive diagrams in architecture documentation
  - Comprehensive production deployment guide
  - Trace context usage documentation
  - Inspector tracing documentation
  - Architecture status tracking
- **@number10/create-electron-ipc** (v0.2.0)
  - Automated test suite (quick tests + integration tests with full build)
  - Tests verify file generation, validation options, and build pipeline
  - Modern validation adapter templates (zodValidator, valibotValidator)
  - Updated to Zod 4.3.5

### Changed

- **Breaking (Soft)**: `validatorFromSafeParse` deprecated in favor of modern adapters
  - Old code still works but should migrate to `zodAdapter.zodValidator()`
  - Import from `@number10/electron-ipc/validation` instead of main package
- **Toolchain Upgrades**
  - Minimum Node.js version: >=20.19.0 (was >=18.0.0)
  - Upgraded to Vite 7 and Vitest 4
  - Modernized all package toolchains
  - Cleaned up Husky pre-commit/commit-msg shims
  - Updated all dependencies to latest versions
- Updated all examples and test-app to use modern validation adapters
- Enhanced package.json keywords (zod-4, react-hooks, multi-window, inspector, context-bridge)
- Improved documentation with modern adapter examples in READMEs
- Inspector UI panel reflow for better layout
- Show invoke response direction as main→renderer in Inspector

### Fixed

- **Critical**: Validation modules not built (missing vite.config.ts entries)
  - Added `validation/index`, `validation/adapters/zod`, `validation/adapters/valibot` to build
  - Fixes "Cannot find module" error when importing validation
- Zod 4.x type compatibility in zodValidator (symbol in path array)
- Race condition in parallel app builds
- Deprecated import paths in validation system
- ESLint errors in create-electron-ipc test files (Node.js globals)
- Build configuration to restore tests and dts generation
- Lint warnings across codebase

### Tests

- Comprehensive test coverage improvements
  - Stream contracts coverage enhanced
  - Inspector UI trace grouping tests
  - create-electron-ipc CLI tests (file generation and full builds)

## [2.3.1] - 2026-01-21

### Fixed

- Minor documentation updates
- Package metadata improvements

## [2.3.0] - 2026-01-21

### Added

- **@number10/create-electron-ipc** (v0.1.0): New scaffolding CLI for creating Electron apps
  - Interactive setup wizard with validation
  - Electron 35 + Vite 5 + React 19 template
  - TypeScript strict mode with comprehensive tsconfig
  - ESLint 9 (flat config) + Prettier pre-configured
  - Optional IPC Inspector integration
  - Optional validation with Zod or Valibot
  - VS Code workspace settings and debug config
  - Support for npm and pnpm package managers
  - Comprehensive README with troubleshooting
  - Works on Windows, macOS, and Linux

### Changed

- Updated main README with create-electron-ipc quick start section
- Updated documentation to highlight scaffolding tool

## [2.2.1] - 2026-01-20

### Fixed

- Cross-platform compatibility for `electron-ipc-generate` CLI tool (Windows support)
- Windows compatibility for contributors
- CI: pnpm cache issue in GitHub Pages workflow

## [2.2.0] - 2026-01-19

### Added

- **IPC Inspector**: Dev-only IPC tracing with separate BrowserWindow
  - Live event monitoring with pause, clear, and filters
  - JSON export for bug reports
  - Payload preview modes (none, redacted, full)
  - Virtual scrolling for massive performance (handles 100k+ events)
  - Statistics dashboard with buffer usage and events/s monitoring
  - Sequence numbers and gap detection
  - Event batching to reduce IPC overhead
  - Automatic inline trace instrumentation in generated code
  - Window metadata integration
- **Window Manager**: Central registry for BrowserWindows with role-based organization
  - Role-based window categorization (main, secondary, inspector, custom)
  - Automatic lifecycle tracking and cleanup
  - Focus tracking
  - Enhanced broadcast APIs (all windows or filtered by role)
  - Helper functions for common tasks
- **Example Applications**:
  - `apps/multi-window`: Multi-window IPC flows demo with window registry
  - `apps/high-volume-test`: Inspector performance testing app
  - `apps/esbuild-minimal`: Minimal example with esbuild bundler
  - `apps/webpack-minimal`: Minimal example with webpack bundler
  - `apps/parcel-minimal`: Minimal example with Parcel 2.x bundler
- **Template Package**: `packages/template-basic` as standalone self-generating template
- **Documentation**: VitePress documentation site with comprehensive guides
  - Full guides for all features
  - Integration examples (electron-vite, Electron Forge)
  - Architecture documentation
  - React Hooks examples
  - Deployed to GitHub Pages

### Changed

- Moved `test-app` from `packages/` to `apps/` for better organization
- Reorganized monorepo structure with multiple example apps

### Fixed

- Various bug fixes in Inspector UI and backend
- High-volume test app rendering and CSP issues
- TypeScript errors in minimal bundler examples

### Documentation

- Complete documentation overhaul with VitePress
- Added Window Manager comprehensive documentation
- Added IPC Inspector documentation with examples
- Enhanced overview with all packages and apps
- Fixed outdated type references in README (GenericEventContract → GenericRendererEventContract)
- Updated all documentation links to GitHub Pages

### Tests

- Inspector UI tests with virtual scrolling coverage
- Inspector server and trace instrumentation tests
- Template relocation tests

## [2.1.0] - 2026-01-13

### Added

- Main/preload split outputs with `mainBroadcastOutput` support for main-side broadcast APIs
- Generator `--watch` and `--check` workflows for dev and CI
- Typed handler helper factories plus optional runtime validation helpers (validator adapters + stream chunk validation)
- Integration templates and guides (electron-vite + electron-forge)

### Changed

- Contract resolution now uses ts-morph/tsconfig to handle re-exports and split files
- Streaming APIs include stop/cleanup/cancel handling for better lifecycle control
- `createExposeApi` uses contextBridge directly for ESM-friendly preloads

### Fixed

- Generator tests no longer emit noisy console errors

### Documentation

- Serializable guidance updated (timestamps + serialization-loss examples)
- Runtime validation examples added

### Tests

- SerializableObject unit tests and template smoke tests
- Runtime validation helper tests

## [2.0.0] - 2025-11-11

### 🚨 Breaking Changes

- **YAML Configuration Required**: CLI arguments have been removed. YAML configuration file is now mandatory for code generation
  - Use `electron-ipc-generate --config=<path-to-yaml>` instead of individual CLI flags
  - This provides better structure, maintainability, and multi-API support
- **Package Structure**: Removed `electron-ipc-react` package - React hooks are now generated as part of the main code generation
- **Import Paths**: Contract types are now re-exported from generated API files for cleaner imports

### Added

- **Stream Contracts**: Full support for large data transfers and real-time communication using Web Streams API
  - `StreamInvokeContract`: Request-response with streaming response
  - `StreamUploadContract`: Renderer uploads data stream to main process
  - `StreamDownloadContract`: Main streams data to renderer process
- **React Hooks Generation**: Automatic generation of React hooks for all contract types
  - Hooks for invoke, event, broadcast, and all stream contracts
  - Optional via `reactHooksOutput` in YAML config
- **YAML Configuration**: Comprehensive configuration file support
  - Multiple API definitions in single config
  - Per-API contract type selection
  - Flexible input/output paths
- **Cross-Platform Build Support**: Full Windows compatibility
  - Replaced Unix-specific `chmod` with cross-platform `shx`
  - Proper handling of external dependencies in build process
  - Fixed bin symlink creation in monorepo setup
- **Improved Code Generation**:
  - Dynamic import paths based on input filename
  - Re-export contract types from generated files
  - Individual output files per API configuration

### Changed

- **Build Process**: Optimized monorepo build order to handle bin symlinks correctly
  - Build electron-ipc first, then install to create symlinks, then build all packages
- **Dependencies**: External dependencies (`ts-morph`, `colors`, `yaml`) are now properly bundled as external
  - Smaller bundle size (~24KB vs ~9MB)
  - Faster installation and execution
- **Generator Architecture**: Refactored into modular components
  - Separated YAML processing, code generation, and templates
  - Improved maintainability and testability

### Fixed

- **Windows Compatibility**: Fixed all Windows-specific build issues
  - Cross-platform chmod using `shx`
  - Proper path handling for all platforms
- **Monorepo Build**: Fixed clean build from scratch
  - Correct dependency resolution order
  - Bin symlink creation after package build
- **Stream Contracts**: Proper stream upload/download data handling
- **Type Safety**: Compile-time serialization validation for all IPC contracts
- **Import Paths**: Corrected dynamic import path generation based on configuration

### Documentation

- Updated all README files for version 2.0.0
- Added comprehensive Windows user notes
- Documented stream communication patterns
- Updated architecture documentation

## [1.0.1] - 2025-11-10

### Fixed

- **IPC Code Generator**: Fixed support for generic IPC contract types (e.g., `GenericInvokeContract`, `GenericBroadcastContract`). The generator now correctly extracts properties from generic types, preventing empty or incomplete generated APIs.
- **Package Imports**: Updated all imports from `'electron-ipc'` to `'@number10/electron-ipc'` to reflect the package rename.
- **Build Process**: Improved TS-Morph setup in the generator to resolve type dependencies, ensuring reliable code generation.

### Changed

- Minor internal improvements to the code generation logic for better type handling.

## [1.0.0] - 2025-11-05

### Added

- Initial release of electron-ipc TypeScript code generator for type-safe Electron IPC communication
- Support for invoke, event, and broadcast IPC contracts
- CLI tool for generating API code
- Comprehensive documentation and test app

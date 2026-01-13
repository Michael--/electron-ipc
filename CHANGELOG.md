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

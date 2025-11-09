## [Unreleased]

### Added

- **Stream Contracts**: Added support for large data transfers and real-time communication using Web Streams API
  - Stream Invoke: Request-response with streaming response
  - Stream Upload: Renderer uploads data to main process
  - Stream Download: Main streams data to renderer process
- **CLI Options**: Added `--stream-invoke`, `--stream-upload`, and `--stream-download` options
- **Documentation**: Updated all documentation to include stream contract examples and usage

### Changed

- **Documentation**: Modernized and updated README files across the project
- **Features**: Updated feature lists to reflect four communication patterns instead of three

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

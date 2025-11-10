# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

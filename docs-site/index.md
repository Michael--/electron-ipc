---
layout: home
title: Electron IPC
hero:
  name: '@number10/electron-ipc'
  text: Type-safe IPC generator for Electron
  tagline: Contracts, generators, and runtime helpers for safer main/renderer boundaries.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/overview
    - theme: alt
      text: Architecture
      link: /guide/architecture
features:
  - title: Contract-first IPC
    details: Define contracts once and get fully typed renderer APIs and main handlers with compile-time safety.
  - title: Five Communication Patterns
    details: Invoke (request-response), Events (fire-and-forget), Broadcasts (main → renderer), Renderer-to-Renderer (multi-window), and Streams (large data/real-time).
  - title: Renderer-to-Renderer IPC
    details: Type-safe request-response communication between renderer processes via main process routing with full tracing support.
  - title: Streams + Inspector
    details: Stream large data safely using Web Streams API and inspect IPC traffic in dev with payload previews.
  - title: React Hooks
    details: Automatic generation of type-safe React hooks with state management for all contract types.
  - title: Multi-window tooling
    details: Window registry and broadcast helpers for role-based multi-window apps with automatic lifecycle tracking.
  - title: Runtime Validation
    details: Optional validation helpers for Zod/Valibot-style validators with stream chunk validation support.
---

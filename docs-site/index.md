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

## New here? Start fast

This project is built to be friendly for beginners and fast to adopt in real apps. You define IPC contracts once, run a generator, and get typed APIs for main, preload, and renderer with minimal boilerplate. The documentation is organized so you can either skim for a quick overview or dive into concrete setup steps and examples.

**Quick path (10–15 min):**

- Read the core flow and generator setup: [Overview](/guide/overview)
- Pick a real integration example: [Electron + Vite](/examples/electron-vite) or [Electron Forge](/examples/electron-forge)
- Check the IPC patterns and multi-window flow when needed: [Architecture](/guide/architecture) and [Renderer-to-Renderer](/guide/renderer-to-renderer)

If you want to go deeper, the guides cover streams, validation helpers, the inspector, and multi-window tooling with concrete code examples.

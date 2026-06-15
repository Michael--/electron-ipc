---
layout: home
title: Electron IPC
hero:
  name: '@number10/electron-ipc'
  text: Type-safe IPC APIs from TypeScript contracts
  tagline: Install the package, define your Electron IPC contracts once, and generate typed main, preload, and renderer code.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: Quick Start
      link: /guide/quick-start
features:
  - title: One npm package
    details: '@number10/electron-ipc ships the generator CLI, TypeScript types, handler helpers, validation adapters, window tools, and inspector runtime.'
  - title: Typed generated APIs
    details: Contracts become strongly typed preload APIs, renderer calls, and main-process handler definitions.
  - title: Compile-time feedback
    details: Rename a contract or change a payload and TypeScript points to every call site that needs updating.
  - title: Electron IPC patterns
    details: Use invoke, events, broadcasts, renderer-to-renderer calls, and streams without hand-written channel strings.
  - title: Production helpers
    details: Add runtime validation, middleware, React hooks, multi-window routing, and dev-only IPC tracing when your app needs them.
  - title: Framework-friendly
    details: Works with existing Electron projects and includes setup guides for electron-vite and Electron Forge.
---

## What You Get

`@number10/electron-ipc` is for Electron developers who want IPC code that behaves like the rest of a strict TypeScript application. You define contracts as TypeScript types, run `electron-ipc-generate`, and use generated APIs instead of manually wiring `ipcMain`, `ipcRenderer`, and `contextBridge` channel strings.

The result is a small generated boundary between main, preload, and renderer code: typed method names, typed payloads, typed handler signatures, and compile-time errors when a contract changes.

## Start Here

- Read [Introduction](/guide/introduction) to understand the package in two minutes.
- Follow [Quick Start](/guide/quick-start) to generate your first typed IPC call.
- Use [Installation](/guide/installation) for dependencies, CLI setup, and the scaffold command.
- Open [Overview](/guide/overview) when you want the full feature map.

The repository contains example apps, but they are only references. The product documented here is the publishable `@number10/electron-ipc` package.

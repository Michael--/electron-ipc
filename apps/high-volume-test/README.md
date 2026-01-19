# High-Volume Inspector Test App

Test application for evaluating Inspector performance under high-volume IPC traffic.

## Features

- **Configurable test modes:** Burst, Sustained, Mixed
- **Adjustable parameters:** Events/second, duration, payload size
- **Quick presets:** Light, Medium, Heavy, Extreme, Burst, Stress
- **Real-time statistics:** Generated events, errors, average latency
- **Inspector integration:** All events visible in Inspector window

## Usage

```bash
pnpm install
pnpm run dev
```

The app will open along with the Inspector window. Configure your test parameters and click "Start Test" to generate high-volume IPC traffic.

## Test Modes

- **Burst:** Sends all events as quickly as possible
- **Sustained:** Sends events at a steady rate over time
- **Mixed:** Varies between invokes, events, and broadcasts

## Presets

- **Light Load:** 50 events/s × 10s = 500 events
- **Medium Load:** 200 events/s × 30s = 6,000 events
- **Heavy Load:** 500 events/s × 60s = 30,000 events
- **Extreme Load:** 1000 events/s × 10s = 10,000 events
- **Burst Test:** 5000 events immediately
- **Stress Test:** 2000 events/s × 30s = 60,000 events (with payload)

## Purpose

This app helps test and validate Inspector performance improvements, including:

- Event batching
- Virtual scrolling
- Render debouncing
- Statistics aggregation
- Buffer overflow handling

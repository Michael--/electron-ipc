/**
 * High-Volume Test Generator
 *
 * Generates configurable high-volume IPC events
 */

import { flushInspector } from '@number10/electron-ipc/inspector'
import { randomBytes } from 'crypto'
import { BrowserWindow } from 'electron'
import type { BroadcastContracts } from './ipc-api'

interface TestStats {
  generated: number
  errored: number
  totalLatency: number
  running: boolean
  testId: string | null
  startTime: number | null
}

const stats: TestStats = {
  generated: 0,
  errored: 0,
  totalLatency: 0,
  running: false,
  testId: null,
  startTime: null,
}

let currentInterval: NodeJS.Timeout | null = null

/**
 * Generate random payload
 */
function generatePayload(size: number): string {
  if (size === 0) return ''
  return randomBytes(Math.floor(size / 2)).toString('hex')
}

/**
 * Start high-volume test
 */
export function startHighVolumeTest(
  mode: 'burst' | 'sustained' | 'mixed',
  eventsPerSecond: number,
  duration: number,
  payloadSize = 0
): string {
  if (stats.running) {
    throw new Error('Test already running')
  }

  const testId = `test-${Date.now()}`
  stats.running = true
  stats.testId = testId
  stats.startTime = Date.now()
  stats.generated = 0
  stats.errored = 0
  stats.totalLatency = 0

  console.log(`[HighVolume] Starting ${mode} test: ${eventsPerSecond}/s for ${duration}s`)

  if (mode === 'burst') {
    runBurstTest(eventsPerSecond, duration, payloadSize, testId)
  } else if (mode === 'sustained') {
    runSustainedTest(eventsPerSecond, duration, payloadSize, testId)
  } else if (mode === 'mixed') {
    runMixedTest(eventsPerSecond, duration, payloadSize, testId)
  }

  return testId
}

/**
 * Burst test: Send all events as fast as possible
 */
function runBurstTest(
  eventsPerSecond: number,
  duration: number,
  payloadSize: number,
  testId: string
) {
  const totalEvents = eventsPerSecond * duration

  console.log(`[HighVolume] Burst: ${totalEvents} events immediately`)

  for (let i = 0; i < totalEvents; i++) {
    sendTestEvent(payloadSize, i)
  }

  stats.running = false
  console.log(`[HighVolume] Burst test completed: ${stats.generated} events`)
}

/**
 * Sustained test: Send events at steady rate
 */
function runSustainedTest(
  eventsPerSecond: number,
  duration: number,
  payloadSize: number,
  testId: string
) {
  const intervalMs = 1000 / eventsPerSecond
  const endTime = Date.now() + duration * 1000
  let counter = 0

  console.log(`[HighVolume] Sustained: ${eventsPerSecond}/s, interval ${intervalMs}ms`)

  currentInterval = setInterval(() => {
    if (Date.now() >= endTime || stats.testId !== testId) {
      stopHighVolumeTest()
      console.log(`[HighVolume] Sustained test completed: ${stats.generated} events`)
      return
    }

    sendTestEvent(payloadSize, counter++)
  }, intervalMs)
}

/**
 * Mixed test: Vary between invoke, events, and broadcasts
 */
function runMixedTest(
  eventsPerSecond: number,
  duration: number,
  payloadSize: number,
  testId: string
) {
  const intervalMs = 1000 / eventsPerSecond
  const endTime = Date.now() + duration * 1000
  let counter = 0

  console.log(`[HighVolume] Mixed: ${eventsPerSecond}/s with varied operations`)

  currentInterval = setInterval(() => {
    if (Date.now() >= endTime || stats.testId !== testId) {
      stopHighVolumeTest()
      console.log(`[HighVolume] Mixed test completed: ${stats.generated} events`)
      return
    }

    const type = counter % 3
    sendMixedEvent(type, payloadSize, counter++)
  }, intervalMs)
}

/**
 * Send a test event
 */
function sendTestEvent(payloadSize: number, counter: number) {
  const data = payloadSize > 0 ? generatePayload(payloadSize) : undefined
  const start = Date.now()

  // Send broadcast to all windows
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    win.webContents.send('testBroadcast', {
      message: `Event ${counter}`,
      id: counter,
    } as BroadcastContracts['testBroadcast']['payload'])
  })

  stats.generated++
  stats.totalLatency += Date.now() - start
}

/**
 * Send mixed event type
 */
function sendMixedEvent(type: number, payloadSize: number, counter: number) {
  const data = payloadSize > 0 ? generatePayload(payloadSize) : undefined
  const windows = BrowserWindow.getAllWindows()

  if (type === 0 || type === 1) {
    // For invoke and heavy, send simple broadcast
    windows.forEach((win) => {
      win.webContents.send('testBroadcast', {
        message: type === 0 ? `Invoke ${counter}` : `Heavy ${counter}`,
        id: counter,
      } as BroadcastContracts['testBroadcast']['payload'])
    })
    stats.generated++
  } else {
    // Broadcast
    windows.forEach((win) => {
      win.webContents.send('testBroadcast', {
        message: `Broadcast ${counter}`,
        id: counter,
      } as BroadcastContracts['testBroadcast']['payload'])
    })
    stats.generated++
  }
}

/**
 * Stop high-volume test
 */
export function stopHighVolumeTest() {
  if (currentInterval) {
    clearInterval(currentInterval)
    currentInterval = null
  }
  stats.running = false

  // CRITICAL: Flush Inspector to send all pending batched events
  // Without this, batched events waiting in the buffer will be lost
  flushInspector()

  // Small delay to allow IPC messages to be sent
  setTimeout(() => {
    console.log(`[HighVolume] Test stopped: ${stats.generated} events generated`)
  }, 100)
}

/**
 * Get test stats
 */
export function getTestStats() {
  return {
    running: stats.running,
    generated: stats.generated,
    errored: stats.errored,
    avgLatency: stats.generated > 0 ? stats.totalLatency / stats.generated : 0,
  }
}

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest'
import type { TraceEvent } from '../types'
import {
  downloadJSON,
  escapeHtml,
  formatBytes,
  formatDuration,
  formatKind,
  formatPercent,
  formatTime,
  getDisplayDirection,
  getEventBytes,
  getEventRole,
  isNearBottom,
  normalizeBufferSize,
  scrollToBottom,
} from './renderer.utils'

describe('inspector ui renderer utils', () => {
  it('formats kinds and timestamps', () => {
    expect(formatKind('invoke')).toBe('Invoke')
    expect(formatKind('broadcast')).toBe('Broadcast')
    expect(formatKind('unknown')).toBe('unknown')
    expect(formatTime(0)).toMatch(/^\d{1,2}:\d{2}:\d{2}(?:\s?[AP]M)?\.000$/)
  })

  it('computes display direction for invoke events', () => {
    const base: TraceEvent = {
      id: '1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      source: { webContentsId: 1 },
    }

    expect(getDisplayDirection(base)).toBe('renderer→main')
    expect(getDisplayDirection({ ...base, response: { mode: 'none' } })).toBe(
      'renderer→main→renderer'
    )
    expect(getDisplayDirection({ ...base, status: 'error' })).toBe('renderer→main→renderer')
  })

  it('derives event roles from source and target metadata', () => {
    const base: TraceEvent = {
      id: '1',
      kind: 'event',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      source: { webContentsId: 1, windowRole: 'main' },
    }

    expect(getEventRole(base)).toBe('main')
    expect(
      getEventRole({
        ...base,
        direction: 'main→renderer',
        target: { windowRole: 'secondary', webContentsId: 2 },
      })
    ).toBe('secondary')
    expect(getEventRole({ ...base, source: { webContentsId: 1 } })).toBeUndefined()
  })

  it('formats byte counts and durations', () => {
    expect(formatBytes(5)).toBe('5B')
    expect(formatBytes(1024)).toBe('1.0KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0MB')
    expect(formatPercent(0.1234)).toBe('12.3%')
    expect(formatDuration()).toBe('-')
    expect(formatDuration(12.3456)).toBe('12.35ms')
  })

  it('calculates bytes for different event types', () => {
    const invokeEvent: TraceEvent = {
      id: '1',
      kind: 'invoke',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      source: { webContentsId: 1 },
      request: { mode: 'none', bytes: 3 },
      response: { mode: 'none', bytes: 7 },
    }

    expect(getEventBytes(invokeEvent)).toBe(10)

    const payloadEvent: TraceEvent = {
      id: '2',
      kind: 'event',
      channel: 'Ping',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      source: { webContentsId: 1 },
      payload: { mode: 'none', bytes: 4 },
    }

    expect(getEventBytes(payloadEvent)).toBe(4)

    const streamEvent: TraceEvent = {
      id: '3',
      kind: 'streamUpload',
      channel: 'Upload',
      direction: 'renderer→main',
      status: 'ok',
      tsStart: 0,
      source: { webContentsId: 1 },
      data: { bytes: 9 },
    }

    expect(getEventBytes(streamEvent)).toBe(9)
  })

  it('normalizes buffer sizes and escapes HTML', () => {
    const input = document.createElement('input')
    input.value = 'abc'
    expect(normalizeBufferSize(input, 500)).toBeNull()
    expect(input.value).toBe('500')

    input.value = '10'
    expect(normalizeBufferSize(input, 500)).toBe(100)
    expect(input.value).toBe('100')

    input.value = '200000'
    expect(normalizeBufferSize(input, 500)).toBe(100000)
    expect(input.value).toBe('100000')

    expect(escapeHtml('1 < 2')).toBe('1 &lt; 2')
  })

  it('detects when scroll is near the bottom', () => {
    const div = document.createElement('div')
    Object.defineProperty(div, 'scrollTop', { value: 90, writable: true, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 10, configurable: true })
    Object.defineProperty(div, 'scrollHeight', { value: 100, configurable: true })

    expect(isNearBottom(div, 0)).toBe(true)
    expect(isNearBottom(div, 15)).toBe(true)
    Object.defineProperty(div, 'scrollTop', { value: 70, writable: true, configurable: true })
    expect(isNearBottom(div, 0)).toBe(false)
  })

  it('scrolls elements to the bottom', () => {
    const div = document.createElement('div')
    Object.defineProperty(div, 'scrollTop', { value: 0, writable: true })
    Object.defineProperty(div, 'scrollHeight', { value: 200 })

    scrollToBottom(div)
    expect(div.scrollTop).toBe(200)
  })

  it('downloads JSON payloads via a temporary link', () => {
    const createUrlSpy = vi.fn(() => 'blob:trace')
    const revokeSpy = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(URL, 'createObjectURL', {
      value: createUrlSpy,
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeSpy,
      configurable: true,
    })

    downloadJSON('{"ping":true}')

    expect(createUrlSpy).toHaveBeenCalled()
    expect(revokeSpy).toHaveBeenCalledWith('blob:trace')
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

/**
 * Simplified E2E test suite focusing on direct API calls
 * These tests verify the IPC layer works correctly without UI interaction
 */
test.describe('IPC Direct API Tests', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await window.waitForSelector('text=Electron IPC Test', { timeout: 10000 })
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('AddNumbers invoke: should add two numbers', async () => {
    const result = await window.evaluate(async () => {
      // @ts-expect-error - window.api injected by preload
      return await window.api.invokeAddNumbers({ a: 42, b: 8 })
    })

    expect(result).toBe(50)
  })

  test('AddNumbers invoke: should handle rapid calls', async () => {
    const results = await window.evaluate(async () => {
      const promises: Promise<number>[] = []
      for (let i = 0; i < 100; i++) {
        // @ts-expect-error - window.api injected by preload
        promises.push(window.api.invokeAddNumbers({ a: i, b: 1 }))
      }
      return await Promise.all(promises)
    })

    expect(results).toHaveLength(100)
    expect(results[0]).toBe(1)
    expect(results[99]).toBe(100)
  })

  test('GetAppInfo invoke: should return app info', async () => {
    const info = await window.evaluate(async () => {
      // @ts-expect-error - window.api injected by preload
      return await window.api.invokeGetAppInfo()
    })

    expect(info).toHaveProperty('name')
    expect(info).toHaveProperty('version')
    expect(info.name).toContain('electron-ipc-test-app')
  })

  test('ValidateUser invoke: should reject invalid name', async () => {
    const error = await window.evaluate(async () => {
      try {
        // @ts-expect-error - window.api injected by preload
        await window.api.invokeValidateUser({ name: 'x', age: 25 })
        return null
      } catch (e: unknown) {
        return {
          message: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : 'Error',
        }
      }
    })

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/validation/i)
  })

  test('ValidateUser invoke: should reject invalid age', async () => {
    const error = await window.evaluate(async () => {
      try {
        // @ts-expect-error - window.api injected by preload
        await window.api.invokeValidateUser({ name: 'John', age: 200 })
        return null
      } catch (e: unknown) {
        return {
          message: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : 'Error',
        }
      }
    })

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/validation/i)
  })

  test('ValidateUser invoke: should accept valid data', async () => {
    const result = await window.evaluate(async () => {
      // @ts-expect-error - window.api injected by preload
      return await window.api.invokeValidateUser({ name: 'Alice', age: 30 })
    })

    expect(result).toHaveProperty('valid', true)
    expect(result.data.name).toBe('Alice')
    expect(result.data.age).toBe(30)
  })

  test('AddNumbers validation: should reject invalid types', async () => {
    const error = await window.evaluate(async () => {
      try {
        // @ts-expect-error - window.api injected by preload
        await window.api.invokeAddNumbers({ a: 'not-a-number', b: 5 })
        return null
      } catch (e: unknown) {
        return {
          message: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : 'Error',
        }
      }
    })

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/validation|expected number/i)
  })

  test('AddNumbers validation: should reject missing parameters', async () => {
    const error = await window.evaluate(async () => {
      try {
        // @ts-expect-error - window.api injected by preload
        await window.api.invokeAddNumbers({ a: 5 })
        return null
      } catch (e: unknown) {
        return {
          message: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : 'Error',
        }
      }
    })

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/validation|required/i)
  })

  test('Broadcast listeners: should have onPing function', async () => {
    const hasListener = await window.evaluate(() => {
      // @ts-expect-error - window.api injected by preload
      return typeof window.api.onPing === 'function'
    })

    expect(hasListener).toBe(true)
  })

  test('Broadcast listeners: should have onAbout function', async () => {
    const hasListener = await window.evaluate(() => {
      // @ts-expect-error - window.api injected by preload
      return typeof window.api.onAbout === 'function'
    })

    expect(hasListener).toBe(true)
  })

  test('Broadcast listeners: should register and unregister', async () => {
    const result = await window.evaluate(() => {
      let received = false

      // @ts-expect-error - window.api injected by preload
      const unsubscribe = window.api.onPing(() => {
        received = true
      })

      unsubscribe()

      return { success: true, received }
    })

    expect(result.success).toBe(true)
  })

  test('API completeness: all expected methods exist', async () => {
    const apis = await window.evaluate(() => {
      return {
        // @ts-expect-error - window.api injected by preload
        invokeAddNumbers: typeof window.api.invokeAddNumbers === 'function',
        // @ts-expect-error - window.api injected by preload
        invokeGetAppInfo: typeof window.api.invokeGetAppInfo === 'function',
        // @ts-expect-error - window.api injected by preload
        invokeValidateUser: typeof window.api.invokeValidateUser === 'function',
        // @ts-expect-error - window.api injected by preload
        onPing: typeof window.api.onPing === 'function',
        // @ts-expect-error - window.api injected by preload
        onAbout: typeof window.api.onAbout === 'function',
        // @ts-expect-error - window.api injected by preload
        sendQuit: typeof window.api.sendQuit === 'function',
        // @ts-expect-error - window.api injected by preload
        sendLogMessage: typeof window.api.sendLogMessage === 'function',
      }
    })

    expect(apis.invokeAddNumbers).toBe(true)
    expect(apis.invokeGetAppInfo).toBe(true)
    expect(apis.invokeValidateUser).toBe(true)
    expect(apis.onPing).toBe(true)
    expect(apis.onAbout).toBe(true)
    expect(apis.sendQuit).toBe(true)
    expect(apis.sendLogMessage).toBe(true)
  })
})

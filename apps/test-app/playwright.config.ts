import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Playwright configuration for Electron E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Electron apps can't run fully parallel
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // One worker for Electron tests
  reporter: [['html'], ['list'], ...(process.env.CI ? [['github'] as const] : [])],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})

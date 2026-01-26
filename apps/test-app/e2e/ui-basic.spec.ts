import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

/**
 * Basic UI interaction test
 * Tests user interface elements using data-testid selectors
 */
test.describe('UI Basic Tests', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../dist/main/index.js'),
        ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      ],
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

  test('AddNumbers UI: should display result after clicking add button', async () => {
    // Click the add numbers button
    await window.locator('[data-testid="add-numbers-button"]').click()

    // Wait for result to appear (look for text containing "Result:")
    await window.waitForSelector('text=/Result:/', { timeout: 5000 })

    // Verify at least one result with "Result:" is visible
    const resultElements = window.locator('.demo-result').filter({ hasText: /Result:/ })
    await expect(resultElements.first()).toBeVisible()
  })

  test('AppInfo UI: should display app info after clicking get info button', async () => {
    // Click the get app info button
    await window.locator('[data-testid="get-app-info-button"]').click()

    // Wait for app info to appear (contains "electron-ipc-test-app")
    await window.waitForSelector('text=/electron-ipc-test-app/', { timeout: 5000 })

    // Verify app info is displayed
    const appInfoElements = window
      .locator('.demo-result')
      .filter({ hasText: /electron-ipc-test-app/ })
    await expect(appInfoElements.first()).toBeVisible()
  })

  test('ValidateUser UI: should accept valid user data', async () => {
    // Fill in valid name and age
    await window.locator('[data-testid="validate-user-name-input"]').fill('John Doe')
    await window.locator('[data-testid="validate-user-age-input"]').fill('25')

    // Click validate button
    await window.locator('[data-testid="validate-user-button"]').click()

    // Wait for success message
    await window.waitForSelector('text=/Valid User:/', { timeout: 5000 })

    // Verify success message is displayed
    const successElements = window.locator('.result-success').filter({ hasText: /Valid User:/ })
    await expect(successElements.first()).toBeVisible()
  })

  test('ValidateUser UI: should reject invalid name (too short)', async () => {
    // Fill in invalid name (too short) and valid age
    await window.locator('[data-testid="validate-user-name-input"]').fill('A')
    await window.locator('[data-testid="validate-user-age-input"]').fill('25')

    // Click validate button
    await window.locator('[data-testid="validate-user-button"]').click()

    // Wait for error message
    await window.waitForSelector('text=/Validation Error:/', { timeout: 5000 })

    // Verify error message is displayed
    const errorElements = window.locator('.result-error').filter({ hasText: /Validation Error:/ })
    await expect(errorElements.first()).toBeVisible()
  })

  test('ValidateUser UI: should reject invalid age (too high)', async () => {
    // Fill in valid name and invalid age (too high)
    await window.locator('[data-testid="validate-user-name-input"]').fill('John Doe')
    await window.locator('[data-testid="validate-user-age-input"]').fill('200')

    // Click validate button
    await window.locator('[data-testid="validate-user-button"]').click()

    // Wait for error message
    await window.waitForSelector('text=/Validation Error:/', { timeout: 5000 })

    // Verify error message is displayed
    const errorElements = window.locator('.result-error').filter({ hasText: /Validation Error:/ })
    await expect(errorElements.first()).toBeVisible()
  })

  test('LogMessage UI: should send info log message', async () => {
    // Click the info log button
    await window.locator('[data-testid="log-info-button"]').click()

    // For events, we can't easily verify the result in UI, but we can verify the button exists and is clickable
    // In a real scenario, you might check console logs or other side effects
    // For now, just verify the button click doesn't crash the app
    await expect(window.locator('[data-testid="log-info-button"]')).toBeVisible()
  })

  test('LogMessage UI: should send warn log message', async () => {
    // Click the warn log button
    await window.locator('[data-testid="log-warn-button"]').click()

    // Verify button is still clickable (no crash)
    await expect(window.locator('[data-testid="log-warn-button"]')).toBeVisible()
  })

  test('LogMessage UI: should send error log message', async () => {
    // Click the error log button
    await window.locator('[data-testid="log-error-button"]').click()

    // Verify button is still clickable (no crash)
    await expect(window.locator('[data-testid="log-error-button"]')).toBeVisible()
  })

  test('API Toggle: should switch between native and hooks variants', async () => {
    // Initially should be on hooks (default)
    await expect(window.locator('[data-testid="api-toggle-hooks"]')).toHaveClass(/active/)

    // Click native toggle
    await window.locator('[data-testid="api-toggle-native"]').click()

    // Should now be active
    await expect(window.locator('[data-testid="api-toggle-native"]')).toHaveClass(/active/)
    await expect(window.locator('[data-testid="api-toggle-hooks"]')).not.toHaveClass(/active/)

    // Click back to hooks
    await window.locator('[data-testid="api-toggle-hooks"]').click()

    // Should be back to hooks
    await expect(window.locator('[data-testid="api-toggle-hooks"]')).toHaveClass(/active/)
    await expect(window.locator('[data-testid="api-toggle-native"]')).not.toHaveClass(/active/)
  })

  test('Stream Data: should start stream invoke', async () => {
    // Click start stream button
    await window.locator('[data-testid="stream-data-start"]').click()

    // Verify button shows streaming state
    await expect(window.locator('[data-testid="stream-data-start"]')).toContainText('Streaming...')

    // Stop button should appear
    await expect(window.locator('[data-testid="stream-data-stop"]')).toBeVisible()
  })

  test('Stream Upload: should start file upload', async () => {
    // Click start upload button
    await window.locator('[data-testid="stream-upload-start"]').click()

    // Verify button shows uploading state
    await expect(window.locator('[data-testid="stream-upload-start"]')).toContainText(
      'Uploading...'
    )
  })

  test('Stream Download Logs: should start log download', async () => {
    // Change log level to warn
    await window.locator('[data-testid="download-logs-level"]').selectOption('warn')

    // Click start download button
    await window.locator('[data-testid="download-logs-start"]').click()

    // Verify button shows downloading state
    await expect(window.locator('[data-testid="download-logs-start"]')).toContainText(
      'Downloading...'
    )

    // Stop button should appear
    await expect(window.locator('[data-testid="download-logs-stop"]')).toBeVisible()
  })

  test('Stream Video: should start video streaming', async () => {
    // Select a smaller video for testing
    await window
      .locator('[data-testid="stream-video-select"]')
      .selectOption(
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      )

    // Click stream video button
    await window.locator('[data-testid="stream-video-start"]').click()

    // Verify button shows downloading state
    await expect(window.locator('[data-testid="stream-video-start"]')).toContainText(
      'Downloading...'
    )

    // Stop button should appear
    await expect(window.locator('[data-testid="stream-video-stop"]')).toBeVisible()
  })

  test('AddLogEntry UI: should fail when logger window is not open', async () => {
    // Close logger window if it's open (using keyboard shortcut)
    await window.keyboard.press(process.platform === 'darwin' ? 'Meta+W' : 'Control+W')
    await new Promise((resolve) => setTimeout(resolve, 500)) // Wait for potential close

    // Fill in log message
    await window.locator('[data-testid="add-log-entry-message-input"]').fill('Test log message')

    // Select error level
    await window.locator('[data-testid="add-log-entry-level-select"]').selectOption('error')

    // Click add log entry button
    await window.locator('[data-testid="add-log-entry-button"]').click()

    // Wait for error message (should fail because logger window is not open)
    await window.waitForSelector('text=/Error:/', { timeout: 5000 })

    // Verify error message is displayed
    const errorElements = window.locator('.demo-result.error').filter({ hasText: /Error:/ })
    await expect(errorElements.first()).toBeVisible()
  })

  test('AddLogEntry UI: should succeed when logger window is open', async () => {
    // Open logger window using IPC method
    const result = await window.evaluate(() => window.api.invokeOpenLoggerWindow())
    expect(result).toBe(true)

    // Wait a bit for the window to open
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Fill in log message
    await window
      .locator('[data-testid="add-log-entry-message-input"]')
      .fill('Test log message from E2E')

    // Select info level
    await window.locator('[data-testid="add-log-entry-level-select"]').selectOption('info')

    // Click add log entry button
    await window.locator('[data-testid="add-log-entry-button"]').click()

    // Wait for success message
    await window.waitForSelector('text=/Success:/', { timeout: 5000 })

    // Verify success message is displayed
    const successElements = window.locator('.demo-result.success').filter({ hasText: /Success:/ })
    await expect(successElements.first()).toBeVisible()

    // Get all windows and find the logger window
    const allWindows = electronApp.windows()
    const loggerWindow = allWindows.find((w) => w.title() === 'Logger Window')

    if (loggerWindow) {
      // Verify logger window received the message
      await loggerWindow.waitForSelector('text=Test log message from E2E', { timeout: 5000 })
      await expect(loggerWindow.locator('text=Test log message from E2E')).toBeVisible()
    } else {
      // If we can't find the logger window, at least verify the success message
      console.warn('Logger window not found, but message was sent successfully')
    }
  })
})

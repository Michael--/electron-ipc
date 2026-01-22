#!/usr/bin/env node
/* global require, __dirname, console */

/**
 * Integration test for create-electron-ipc
 * Tests the CLI in a temporary directory with install and build
 */

'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const { spawnSync, execSync } = require('child_process')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const os = require('os')

/**
 * Creates a temporary test directory
 * @returns {Promise<string>} Path to temp directory
 */
async function createTempDir() {
  const tmpBase = os.tmpdir()
  const tmpDir = path.join(tmpBase, `electron-ipc-test-${Date.now()}`)
  await fsp.mkdir(tmpDir, { recursive: true })
  return tmpDir
}

/**
 * Removes a directory recursively
 * @param {string} dir - Directory to remove
 * @returns {Promise<void>}
 */
async function rmdir(dir) {
  await fsp.rm(dir, { recursive: true, force: true })
}

/**
 * Runs the create-electron-ipc CLI
 * @param {string[]} args - CLI arguments
 * @returns {object} Result with stdout, stderr, status
 */
function runCli(args) {
  const cliPath = path.join(__dirname, '..', 'bin', 'create-electron-ipc.js')
  const result = spawnSync('node', [cliPath, ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  })
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  }
}

/**
 * Runs a command in a directory
 * @param {string} cwd - Working directory
 * @param {string} command - Command to run
 * @returns {string} Output
 */
function runCommand(cwd, command) {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

/**
 * Checks if a file exists
 * @param {string} filePath - File path to check
 * @returns {Promise<boolean>} True if exists
 */
async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

describe('create-electron-ipc integration', { timeout: 180000 }, () => {
  /**
   * Test without validation
   */
  it('should create project without validation, install, and build', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-none')

    try {
      // Create project
      const result = runCli([
        '--dir',
        projectDir,
        '--package-name',
        'test-app-none',
        '--validation',
        'none',
        '--pm',
        'npm',
        '--inspector',
        'n',
        '--no-install',
      ])

      assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)

      // Verify basic files
      assert(await fileExists(path.join(projectDir, 'package.json')), 'package.json missing')
      assert(await fileExists(path.join(projectDir, 'tsconfig.json')), 'tsconfig.json missing')
      assert(
        await fileExists(path.join(projectDir, 'src', 'main', 'index.ts')),
        'main/index.ts missing'
      )

      // Install dependencies
      console.log('  Installing dependencies...')
      runCommand(projectDir, 'npm install')

      // Build
      console.log('  Building...')
      runCommand(projectDir, 'npm run build')

      // Verify build output
      assert(await fileExists(path.join(projectDir, 'out')), 'Build output missing')
    } finally {
      await rmdir(tmpDir)
    }
  })

  /**
   * Test with Zod validation
   */
  it('should create project with zod validation, install, and build', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-zod')

    try {
      // Create project
      const result = runCli([
        '--dir',
        projectDir,
        '--package-name',
        'test-app-zod',
        '--validation',
        'zod',
        '--pm',
        'npm',
        '--inspector',
        'n',
        '--no-install',
      ])

      assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)

      // Verify package.json has zod
      const pkgPath = path.join(projectDir, 'package.json')
      const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8'))
      assert(pkg.dependencies.zod, 'zod dependency missing')
      assert.strictEqual(pkg.dependencies.zod, '^4.3.5', 'Wrong zod version')

      // Verify main file has validation imports
      const mainPath = path.join(projectDir, 'src', 'main', 'index.ts')
      const mainContent = await fsp.readFile(mainPath, 'utf8')
      assert(mainContent.includes('zodAdapter'), 'zodAdapter import missing')
      assert(
        mainContent.includes("from '@number10/electron-ipc/validation'"),
        'validation import missing'
      )

      // Install dependencies
      console.log('  Installing dependencies...')
      runCommand(projectDir, 'npm install')

      // Build
      console.log('  Building...')
      runCommand(projectDir, 'npm run build')

      // Verify build output
      assert(await fileExists(path.join(projectDir, 'out')), 'Build output missing')
    } finally {
      await rmdir(tmpDir)
    }
  })

  /**
   * Test with Valibot validation
   */
  it('should create project with valibot validation, install, and build', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-valibot')

    try {
      // Create project
      const result = runCli([
        '--dir',
        projectDir,
        '--package-name',
        'test-app-valibot',
        '--validation',
        'valibot',
        '--pm',
        'npm',
        '--inspector',
        'n',
        '--no-install',
      ])

      assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)

      // Verify package.json has valibot
      const pkgPath = path.join(projectDir, 'package.json')
      const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8'))
      assert(pkg.dependencies.valibot, 'valibot dependency missing')

      // Verify main file has validation imports
      const mainPath = path.join(projectDir, 'src', 'main', 'index.ts')
      const mainContent = await fsp.readFile(mainPath, 'utf8')
      assert(mainContent.includes('valibotAdapter'), 'valibotAdapter import missing')
      assert(
        mainContent.includes("from '@number10/electron-ipc/validation'"),
        'validation import missing'
      )

      // Install dependencies
      console.log('  Installing dependencies...')
      runCommand(projectDir, 'npm install')

      // Build
      console.log('  Building...')
      runCommand(projectDir, 'npm run build')

      // Verify build output
      assert(await fileExists(path.join(projectDir, 'out')), 'Build output missing')
    } finally {
      await rmdir(tmpDir)
    }
  })

  /**
   * Test with Inspector
   */
  it('should create project with inspector enabled', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-inspector')

    try {
      // Create project
      const result = runCli([
        '--dir',
        projectDir,
        '--package-name',
        'test-app-inspector',
        '--validation',
        'none',
        '--pm',
        'npm',
        '--inspector',
        'y',
        '--no-install',
      ])

      assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)

      // Verify main file has inspector
      const mainPath = path.join(projectDir, 'src', 'main', 'index.ts')
      const mainContent = await fsp.readFile(mainPath, 'utf8')
      assert(mainContent.includes('enableIpcInspector'), 'Inspector import missing')
      assert(
        mainContent.includes("from '@number10/electron-ipc/inspector'"),
        'inspector import missing'
      )

      // Install dependencies
      console.log('  Installing dependencies...')
      runCommand(projectDir, 'npm install')

      // Build
      console.log('  Building...')
      runCommand(projectDir, 'npm run build')

      // Verify build output
      assert(await fileExists(path.join(projectDir, 'out')), 'Build output missing')
    } finally {
      await rmdir(tmpDir)
    }
  })
})

#!/usr/bin/env node
/* global require, __dirname */

/**
 * Quick integration test for create-electron-ipc
 * Tests the CLI output without installing dependencies
 */

'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const { spawnSync } = require('child_process')
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

describe('create-electron-ipc quick tests', () => {
  /**
   * Test without validation
   */
  it('should create project without validation (no install)', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-none')

    try {
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
      assert(await fileExists(path.join(projectDir, 'package.json')), 'package.json missing')
      assert(await fileExists(path.join(projectDir, 'tsconfig.json')), 'tsconfig.json missing')
      assert(
        await fileExists(path.join(projectDir, 'src', 'main', 'index.ts')),
        'main/index.ts missing'
      )

      // Verify no validation imports in main
      const mainPath = path.join(projectDir, 'src', 'main', 'index.ts')
      const mainContent = await fsp.readFile(mainPath, 'utf8')
      assert(!mainContent.includes('zodAdapter'), 'Should not have zodAdapter')
      assert(!mainContent.includes('valibotAdapter'), 'Should not have valibotAdapter')
    } finally {
      await rmdir(tmpDir)
    }
  })

  /**
   * Test with Zod validation
   */
  it('should create project with zod validation (no install)', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-zod')

    try {
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

      // Verify package.json has zod with correct version
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
        'validation import path incorrect'
      )
      assert(mainContent.includes("from 'zod'"), 'zod import missing')

      // Verify it uses zodValidator instead of validatorFromSafeParse
      assert(mainContent.includes('zodAdapter.zodValidator'), 'Should use zodAdapter.zodValidator')
      assert(!mainContent.includes('.safeParse'), 'Should not use .safeParse directly')
    } finally {
      await rmdir(tmpDir)
    }
  })

  /**
   * Test with Valibot validation
   */
  it('should create project with valibot validation (no install)', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-valibot')

    try {
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
        'validation import path incorrect'
      )
      assert(mainContent.includes("from 'valibot'"), 'valibot import missing')

      // Verify it uses valibotValidator
      assert(
        mainContent.includes('valibotAdapter.valibotValidator'),
        'Should use valibotAdapter.valibotValidator'
      )
      assert(mainContent.includes('safeParse'), 'Should import safeParse from valibot')
    } finally {
      await rmdir(tmpDir)
    }
  })

  /**
   * Test with Inspector
   */
  it('should create project with inspector enabled (no install)', async () => {
    const tmpDir = await createTempDir()
    const projectDir = path.join(tmpDir, 'test-app-inspector')

    try {
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
        'inspector import path incorrect'
      )
    } finally {
      await rmdir(tmpDir)
    }
  })
})

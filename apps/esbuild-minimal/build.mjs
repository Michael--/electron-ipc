#!/usr/bin/env node

/**
 * esbuild configuration for Electron app
 * Builds main, preload, and renderer processes
 */

import { spawn } from 'child_process'
import * as esbuild from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isWatch = process.argv.includes('--watch')

/**
 * Common esbuild options
 */
const commonOptions = {
  bundle: true,
  sourcemap: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
}

/**
 * Build main process
 */
async function buildMain() {
  const context = await esbuild.context({
    ...commonOptions,
    entryPoints: ['src/main/index.ts'],
    outfile: 'dist/main/index.js',
    target: 'node18',
  })

  if (isWatch) {
    await context.watch()
    console.log('👀 Watching main process...')
  } else {
    await context.rebuild()
    await context.dispose()
    console.log('✅ Built main process')
  }

  return context
}

/**
 * Build preload script
 */
async function buildPreload() {
  const context = await esbuild.context({
    ...commonOptions,
    entryPoints: ['src/preload/index.ts'],
    outfile: 'dist/preload/index.js',
    target: 'node18',
  })

  if (isWatch) {
    await context.watch()
    console.log('👀 Watching preload script...')
  } else {
    await context.rebuild()
    await context.dispose()
    console.log('✅ Built preload script')
  }

  return context
}

/**
 * Build renderer process
 */
async function buildRenderer() {
  const context = await esbuild.context({
    bundle: true,
    sourcemap: true,
    platform: 'browser',
    format: 'esm',
    entryPoints: ['src/renderer/renderer.ts'],
    outfile: 'dist/renderer/renderer.js',
    target: 'chrome120',
  })

  if (isWatch) {
    await context.watch()
    console.log('👀 Watching renderer process...')
  } else {
    await context.rebuild()
    await context.dispose()
    console.log('✅ Built renderer process')
  }

  return context
}

/**
 * Copy HTML file to dist
 */
function copyHtml() {
  const html = readFileSync('src/renderer/index.html', 'utf-8')
  mkdirSync('dist/renderer', { recursive: true })
  writeFileSync('dist/renderer/index.html', html)
  console.log('✅ Copied HTML file')
}

/**
 * Start Electron in watch mode
 */
function startElectron() {
  let electronProcess = null

  const restart = () => {
    if (electronProcess) {
      electronProcess.kill()
    }

    electronProcess = spawn('electron', ['./dist/main/index.js'], {
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    })

    electronProcess.on('exit', (code) => {
      if (code !== null && code !== 0 && code !== 143) {
        console.error(`❌ Electron exited with code ${code}`)
      }
    })
  }

  // Restart on file changes
  if (isWatch) {
    console.log('🚀 Starting Electron...')
    restart()

    // Watch for changes and restart
    const watchOptions = {
      recursive: true,
    }

    // Simple debounce for restarts
    let restartTimeout
    const debouncedRestart = () => {
      clearTimeout(restartTimeout)
      restartTimeout = setTimeout(() => {
        console.log('🔄 Restarting Electron...')
        restart()
      }, 1000)
    }

    process.on('SIGINT', () => {
      if (electronProcess) {
        electronProcess.kill()
      }
      process.exit(0)
    })
  }
}

/**
 * Main build function
 */
async function build() {
  try {
    console.log(`🔨 Building with esbuild ${isWatch ? '(watch mode)' : ''}...\n`)

    await Promise.all([buildMain(), buildPreload(), buildRenderer()])

    copyHtml()

    console.log('\n✨ Build complete!\n')

    if (isWatch) {
      startElectron()
    }
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

build()

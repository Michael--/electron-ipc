#!/usr/bin/env node
/* global __dirname, require, process, console */

'use strict'

const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const readline = require('readline')
const { spawnSync } = require('child_process')

const DEFAULT_ELECTRON_IPC_VERSION = '^2.2.1'

const VALIDATION_OPTIONS = ['none', 'zod', 'valibot']
const PACKAGE_MANAGERS = ['pnpm', 'npm']

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'basic')

function parseArgs(argv) {
  const args = {
    dir: null,
    pm: null,
    inspector: null,
    validation: null,
    packageName: null,
    productName: null,
    appId: null,
    author: null,
    noInstall: false,
    help: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      args.help = true
      continue
    }
    if (arg === '--no-install') {
      args.noInstall = true
      continue
    }
    if (arg.startsWith('--dir=')) {
      args.dir = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--pm=')) {
      args.pm = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--inspector=')) {
      args.inspector = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--validation=')) {
      args.validation = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--package-name=')) {
      args.packageName = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--name=')) {
      args.packageName = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--product-name=')) {
      args.productName = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--app-id=')) {
      args.appId = arg.split('=')[1]
      continue
    }
    if (arg.startsWith('--author=')) {
      args.author = arg.split('=')[1]
      continue
    }
    if (arg === '--dir') {
      args.dir = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--pm') {
      args.pm = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--inspector') {
      args.inspector = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--validation') {
      args.validation = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--package-name' || arg === '--name') {
      args.packageName = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--product-name') {
      args.productName = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--app-id') {
      args.appId = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--author') {
      args.author = argv[i + 1]
      i += 1
      continue
    }
  }
  return args
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function askQuestion(rl, question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : ''
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      const trimmed = answer.trim()
      resolve(trimmed || defaultValue || '')
    })
  })
}

function yesNoToBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (!value) return fallback
  const normalized = String(value).toLowerCase()
  if (['y', 'yes', 'true', '1'].includes(normalized)) return true
  if (['n', 'no', 'false', '0'].includes(normalized)) return false
  return fallback
}

function toPackageName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
}

function toProductName(value) {
  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

async function ensureEmptyDir(dirPath) {
  if (!fs.existsSync(dirPath)) return
  const entries = await fsp.readdir(dirPath)
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${dirPath}`)
  }
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true })
  const entries = await fsp.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath)
    }
  }
}

function isBinaryFile(buffer) {
  return buffer.includes(0)
}

async function replaceTokensInFile(filePath, replacements) {
  const buffer = await fsp.readFile(filePath)
  if (isBinaryFile(buffer)) return
  let contents = buffer.toString('utf8')
  for (const [token, value] of Object.entries(replacements)) {
    contents = contents.replaceAll(token, value)
  }
  await fsp.writeFile(filePath, contents)
}

async function replaceTokensInDir(dirPath, replacements) {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      await replaceTokensInDir(entryPath, replacements)
    } else if (entry.isFile()) {
      await replaceTokensInFile(entryPath, replacements)
    }
  }
}

async function updatePackageJson(targetDir, options) {
  const pkgPath = path.join(targetDir, 'package.json')
  const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8'))

  pkg.name = options.packageName
  pkg.version = '0.1.0'
  pkg.description = options.description
  if (options.author) pkg.author = options.author
  else delete pkg.author

  if (pkg.build) {
    pkg.build.appId = options.appId
    pkg.build.productName = options.productName
  }

  pkg.dependencies = pkg.dependencies || {}
  pkg.dependencies['@number10/electron-ipc'] = options.electronIpcVersion

  if (options.validation === 'zod') {
    pkg.dependencies.zod = '^3.24.1'
    if (pkg.dependencies.valibot) delete pkg.dependencies.valibot
  } else if (options.validation === 'valibot') {
    pkg.dependencies.valibot = '^1.0.0'
    if (pkg.dependencies.zod) delete pkg.dependencies.zod
  } else {
    if (pkg.dependencies.zod) delete pkg.dependencies.zod
    if (pkg.dependencies.valibot) delete pkg.dependencies.valibot
  }

  await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function getInstallCommand(pm) {
  if (pm === 'pnpm') return ['pnpm', ['install']]
  return ['npm', ['install']]
}

function getValidationSnippets(mode) {
  if (mode === 'zod') {
    return {
      helperImports: '  validatorFromSafeParse,\n  withEventValidation,\n  withInvokeValidation,\n',
      libraryImports: "import { z } from 'zod'\n",
      handlers: `const voidValidator = validatorFromSafeParse(z.void().safeParse)
const addRequestValidator = validatorFromSafeParse(
  z.object({ a: z.number(), b: z.number() }).safeParse
)
const addResponseValidator = validatorFromSafeParse(z.number().safeParse)

const addHandler = withInvokeValidation(
  { request: addRequestValidator, response: addResponseValidator },
  async (_event, request) => request.a + request.b
)

const quitHandler = withEventValidation(voidValidator, () => {
  app.quit()
})
`,
    }
  }

  if (mode === 'valibot') {
    return {
      helperImports: '  validatorFromSafeParse,\n  withEventValidation,\n  withInvokeValidation,\n',
      libraryImports:
        "import { type GenericSchema, number, object, safeParse, undefined as undefinedSchema } from 'valibot'\n",
      handlers: `const addSchema = object({ a: number(), b: number() })
const addResponseSchema = number()
const voidSchema = undefinedSchema() as GenericSchema<void>

const safeParseValibot = <T>(schema: GenericSchema<T>, input: unknown) => {
  const result = safeParse(schema, input)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  return { success: false as const, error: result.issues }
}

const voidValidator = validatorFromSafeParse<void>((input: unknown) =>
  safeParseValibot(voidSchema, input)
)
const addRequestValidator = validatorFromSafeParse((input: unknown) =>
  safeParseValibot(addSchema, input)
)
const addResponseValidator = validatorFromSafeParse((input: unknown) =>
  safeParseValibot(addResponseSchema, input)
)

const addHandler = withInvokeValidation(
  { request: addRequestValidator, response: addResponseValidator },
  async (_event, request) => {
    return request.a + request.b
  }
)

const quitHandler = withEventValidation(voidValidator, () => {
  app.quit()
})
`,
    }
  }

  return {
    helperImports: '',
    libraryImports: '',
    handlers: `const addHandler = async (
  _event: Electron.IpcMainInvokeEvent,
  request: { a: number; b: number }
): Promise<number> => {
  return request.a + request.b
}

const quitHandler = (): void => {
  app.quit()
}
`,
  }
}

function showHelp() {
  console.log(`
@number10/create-electron-ipc

Create a new Electron app with type-safe IPC contracts.

Usage:
  npm create @number10/electron-ipc [options]
  npx @number10/create-electron-ipc [options]

Options:
  --dir <path>              Target directory (default: current directory)
  --name <name>             Package name (default: directory name)
  --package-name <name>     Alias for --name
  --product-name <name>     Product name (default: formatted package name)
  --app-id <id>             Application ID (default: com.example.<name>)
  --author <name>           Author name
  --pm <manager>            Package manager: pnpm, npm (default: pnpm)
  --inspector <y/n>         Include IPC Inspector (default: n)
  --validation <type>       Validation: none, zod, valibot (default: none)
  --no-install              Skip dependency installation
  --help, -h                Show this help message

Examples:
  npm create @number10/electron-ipc
  npm create @number10/electron-ipc -- --dir my-app --validation zod
  npx @number10/create-electron-ipc --name my-app --inspector y
`)
}

async function run() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    showHelp()
    return
  }

  const rl = createInterface()
  const isInteractive = Boolean(process.stdin.isTTY)

  try {
    const targetDirInput =
      args.dir ?? (isInteractive ? await askQuestion(rl, 'Target directory', '.') : '.')
    const targetDir = path.resolve(process.cwd(), targetDirInput || '.')
    await ensureEmptyDir(targetDir)

    const defaultPackageName = toPackageName(path.basename(targetDir))
    const packageNameInput =
      args.packageName ??
      (isInteractive
        ? await askQuestion(rl, 'Package name', defaultPackageName)
        : defaultPackageName)
    const packageName = toPackageName(packageNameInput || defaultPackageName || 'electron-ipc-app')
    const defaultProductName = toProductName(packageName)
    const productName =
      args.productName ??
      (isInteractive
        ? await askQuestion(rl, 'Product name', defaultProductName)
        : defaultProductName)
    const defaultAppId = `com.example.${packageName || 'app'}`
    const appId =
      args.appId ?? (isInteractive ? await askQuestion(rl, 'App ID', defaultAppId) : defaultAppId)
    const author =
      args.author ?? (isInteractive ? await askQuestion(rl, 'Author (optional)', '') : '')

    const pmInput =
      args.pm ??
      (isInteractive ? await askQuestion(rl, 'Package manager (pnpm/npm)', 'pnpm') : 'pnpm')
    const pmNormalized = String(pmInput || '').toLowerCase()
    const pm = PACKAGE_MANAGERS.includes(pmNormalized) ? pmNormalized : 'pnpm'

    const inspectorInput =
      args.inspector ??
      (isInteractive ? await askQuestion(rl, 'Include IPC Inspector? (y/n)', 'n') : 'n')
    const inspectorEnabled = yesNoToBoolean(inspectorInput, false)

    const validationInput =
      args.validation ??
      (isInteractive
        ? await askQuestion(rl, 'Validation helpers (none/zod/valibot)', 'none')
        : 'none')
    const validationNormalized = String(validationInput || '').toLowerCase()
    const validation = VALIDATION_OPTIONS.includes(validationNormalized)
      ? validationNormalized
      : 'none'

    await copyDir(TEMPLATE_DIR, targetDir)

    const validationSnippets = getValidationSnippets(validation)
    const replacements = {
      __PACKAGE_NAME__: packageName,
      __PRODUCT_NAME__: productName,
      __APP_ID__: appId,
      __AUTHOR__: author,
      __ELECTRON_IPC_VERSION__: DEFAULT_ELECTRON_IPC_VERSION,
      __INSPECTOR_ENABLED__: inspectorEnabled ? 'true' : 'false',
      __VALIDATION_MODE__: validation,
      __VALIDATION_HELPER_IMPORTS__: validationSnippets.helperImports,
      __VALIDATION_LIBRARY_IMPORTS__: validationSnippets.libraryImports,
      __VALIDATION_HANDLERS__: validationSnippets.handlers,
    }

    await replaceTokensInDir(targetDir, replacements)
    await updatePackageJson(targetDir, {
      packageName,
      productName,
      appId,
      author,
      description: 'Electron app powered by @number10/electron-ipc',
      electronIpcVersion: DEFAULT_ELECTRON_IPC_VERSION,
      validation,
    })

    const installAnswer = args.noInstall
      ? 'n'
      : isInteractive
        ? await askQuestion(rl, 'Install dependencies now? (y/n)', 'y')
        : 'n'
    const shouldInstall = !args.noInstall && isInteractive && yesNoToBoolean(installAnswer, true)
    if (shouldInstall) {
      const [command, cmdArgs] = getInstallCommand(pm)
      spawnSync(command, cmdArgs, { cwd: targetDir, stdio: 'inherit' })
    }

    console.log('\nDone.')
    console.log(`\nNext steps:`)
    if (targetDir !== process.cwd()) {
      console.log(`  cd ${path.relative(process.cwd(), targetDir)}`)
    }
    if (!shouldInstall) {
      console.log(`  ${pm} install`)
      if (pm === 'pnpm') {
        console.log(`  ${pm} approve-builds`)
      }
    }
    console.log(`  ${pm} run dev`)
    if (pm === 'pnpm') {
      console.log(`\nNote: If you see "Ignored build scripts" warning, run:`)
      console.log(`  pnpm approve-builds`)
    }
    console.log(`\nNote: On Windows, if Electron fails to start, try:`)
    console.log(`  ${pm} rebuild electron`)
  } catch (error) {
    console.error('\nFailed to create project.')
    console.error(error.message || error)
    process.exitCode = 1
  } finally {
    rl.close()
  }
}

run()

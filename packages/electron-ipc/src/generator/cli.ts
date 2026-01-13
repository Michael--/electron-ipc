/* eslint-disable no-console */
import colors from 'colors'
import * as fs from 'fs'
import * as path from 'path'
import { Project } from 'ts-morph'
import { generateMainBroadcastApi, generateReactHooks, processContracts } from './code-generator'
import { ProcessApiConfig } from './types'
import { resetOutput } from './utils'
import { processYamlConfig } from './yaml-processor'

type ProcessMode = 'write' | 'check'

type OutputArtifact = {
  outputPath: string
  code: string
  label: string
}

type ProcessResult = {
  matched: boolean
  watchFiles: string[]
}

type ProcessOptions = {
  mode?: ProcessMode
  cwd?: string
}

/**
 * Prints CLI usage instructions
 */
function printUsage() {
  console.log(`Usage: electron-ipc-generate --config=<path> [--watch] [--check]`)
  console.log(`\nRequired:`)
  console.log(`  --config=<path>  Path to YAML configuration file`)
  console.log(`\nOptions:`)
  console.log(`  --watch          Re-generate on file changes`)
  console.log(`  --check          Validate generated output without writing files`)
  console.log(`\nExample:`)
  console.log(`  electron-ipc-generate --config=./ipc-config.yaml`)
}

function writeOutputs(outputs: OutputArtifact[], baseDir: string) {
  outputs.forEach(({ outputPath, code, label }) => {
    fs.writeFileSync(outputPath, code, 'utf8')
    console.log(colors.green(`Generated ${label} written to ${path.relative(baseDir, outputPath)}`))
  })
}

function checkOutputs(outputs: OutputArtifact[], baseDir: string) {
  let matched = true

  outputs.forEach(({ outputPath, code, label }) => {
    if (!fs.existsSync(outputPath)) {
      console.error(colors.red(`Missing ${label} output: ${path.relative(baseDir, outputPath)}`))
      matched = false
      return
    }
    const existing = fs.readFileSync(outputPath, 'utf8')
    if (existing !== code) {
      console.error(colors.red(`Outdated ${label} output: ${path.relative(baseDir, outputPath)}`))
      matched = false
    }
  })

  if (matched) {
    console.log(colors.green('All generated outputs are up to date.'))
  }

  return matched
}

function buildOutputs(
  config: ProcessApiConfig,
  sourceFile: ReturnType<Project['addSourceFileAtPath']>,
  buildImportPath: (fromPath: string) => string,
  baseDir: string
): OutputArtifact[] {
  const importPath = buildImportPath(config.output)
  const apiName = config.name

  const outputs: OutputArtifact[] = []
  const resolvedOutputPath = path.resolve(baseDir, config.output)

  const apiCode = processContracts(sourceFile, config.contracts, importPath, apiName)
  outputs.push({ outputPath: resolvedOutputPath, code: apiCode, label: 'API code' })

  if (config.mainBroadcastOutput) {
    const broadcastContract = config.contracts.find((c) => c.type === 'send')
    if (!broadcastContract) {
      console.error(
        `Error: mainBroadcastOutput requires a broadcast contract ("contracts.send") for API "${config.name}"`
      )
      process.exit(1)
    }
    const mainBroadcastImportPath = buildImportPath(config.mainBroadcastOutput)
    const mainBroadcastCode = generateMainBroadcastApi(
      broadcastContract.name,
      mainBroadcastImportPath,
      sourceFile
    )
    const resolvedMainBroadcastPath = path.resolve(baseDir, config.mainBroadcastOutput)
    outputs.push({
      outputPath: resolvedMainBroadcastPath,
      code: mainBroadcastCode,
      label: 'main broadcast API',
    })
  }

  if (config.reactHooksOutput) {
    const reactHooksCode = generateReactHooks(config.contracts, importPath, sourceFile, apiName)
    const resolvedReactHooksPath = path.resolve(baseDir, config.reactHooksOutput)
    outputs.push({
      outputPath: resolvedReactHooksPath,
      code: reactHooksCode,
      label: 'React hooks',
    })
  }

  return outputs
}

/**
 * Processes a single API configuration
 */
export function processApiConfig(
  {
    name,
    input,
    output,
    contracts,
    tsconfig,
    reactHooksOutput,
    mainBroadcastOutput,
  }: ProcessApiConfig,
  options: ProcessOptions = {}
): ProcessResult {
  const baseDir = options.cwd ?? process.cwd()
  const resolvedInputPath = path.resolve(baseDir, input)

  const resolveTsconfigPath = () => {
    if (tsconfig) {
      const resolved = path.resolve(baseDir, tsconfig)
      if (!fs.existsSync(resolved)) {
        console.error(`Error: tsconfig file not found: ${resolved}`)
        process.exit(1)
      }
      return resolved
    }

    let currentDir = path.dirname(resolvedInputPath)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = path.join(currentDir, 'tsconfig.json')
      if (fs.existsSync(candidate)) return candidate
      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) break
      currentDir = parentDir
    }
    return undefined
  }

  const tsconfigPath = resolveTsconfigPath()
  const project = tsconfigPath
    ? new Project({ tsConfigFilePath: tsconfigPath, skipAddingFilesFromTsConfig: true })
    : new Project()

  // Reset output state for this API
  resetOutput()

  const inputFileName = path.basename(resolvedInputPath, path.extname(resolvedInputPath))

  const buildImportPath = (fromPath: string) => {
    const resolvedFromPath = path.resolve(baseDir, fromPath)
    const relativePath = path.relative(
      path.dirname(resolvedFromPath),
      path.dirname(resolvedInputPath)
    )
    return relativePath
      ? `${relativePath.replace(/\\/g, '/')}/${inputFileName}`
      : `./${inputFileName}`
  }

  const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
  project.resolveSourceFileDependencies()
  console.log(colors.green(`Read ${path.relative(baseDir, resolvedInputPath)}`))

  const outputs = buildOutputs(
    {
      name,
      input,
      output,
      contracts,
      tsconfig,
      reactHooksOutput,
      mainBroadcastOutput,
    },
    sourceFile,
    buildImportPath,
    baseDir
  )

  const matched =
    options.mode === 'check'
      ? checkOutputs(outputs, baseDir)
      : (writeOutputs(outputs, baseDir), true)

  const watchFiles = project.getSourceFiles().map((file) => file.getFilePath().toString())
  if (tsconfigPath) watchFiles.push(tsconfigPath)

  return { matched, watchFiles }
}

/**
 * Main entry point - parses CLI arguments and generates IPC API code
 */
export function main() {
  const args = process.argv.slice(2)
  const watchMode = args.includes('--watch')
  const checkMode = args.includes('--check')

  if (watchMode && checkMode) {
    console.error('Error: --watch and --check cannot be used together.')
    process.exit(1)
  }

  // Check for YAML config file
  const configArg = args.find((arg) => arg.startsWith('--config='))
  if (!configArg) {
    console.error('Error: --config argument is required.')
    printUsage()
    process.exit(1)
  }

  const configPath = configArg.split('=')[1]
  if (!configPath) {
    console.error('Error: --config path cannot be empty.')
    printUsage()
    process.exit(1)
  }

  try {
    if (watchMode) {
      runWatch(configPath)
      return
    }

    const result = processYamlConfig(configPath, {
      mode: checkMode ? 'check' : 'write',
      cwd: process.cwd(),
    })
    if (checkMode && !result.matched) {
      process.exit(1)
    }
  } catch (error) {
    console.error(
      `Error processing configuration: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    )
    process.exit(1)
  }
}

function runWatch(configPath: string) {
  const resolvedConfigPath = path.resolve(process.cwd(), configPath)
  let watchers: fs.FSWatcher[] = []
  let watchFileTargets: string[] = []
  let timeout: NodeJS.Timeout | null = null

  const cleanupWatchers = () => {
    watchers.forEach((watcher) => watcher.close())
    watchers = []
    watchFileTargets.forEach((target) => fs.unwatchFile(target))
    watchFileTargets = []
  }

  const scheduleRun = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(runOnce, 100)
  }

  const watchPath = (targetPath: string) => {
    try {
      const watcher = fs.watch(targetPath, scheduleRun)
      watchers.push(watcher)
    } catch (error) {
      console.warn(
        colors.yellow(`Watch not supported for ${targetPath}: ${(error as Error).message}`)
      )
      fs.watchFile(targetPath, { interval: 500 }, scheduleRun)
      watchFileTargets.push(targetPath)
    }
  }

  const runOnce = () => {
    cleanupWatchers()
    console.log(colors.cyan('Regenerating IPC API...'))
    const result = processYamlConfig(resolvedConfigPath, { mode: 'write', cwd: process.cwd() })

    const watchSet = new Set<string>([resolvedConfigPath])
    result.watchFiles.forEach((file) => watchSet.add(file))

    watchSet.forEach((file) => {
      try {
        watchPath(file)
      } catch (error) {
        console.warn(colors.yellow(`Unable to watch ${file}: ${(error as Error).message}`))
      }
    })
  }

  runOnce()
}

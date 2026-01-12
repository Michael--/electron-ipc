/* eslint-disable no-console */
import colors from 'colors'
import * as fs from 'fs'
import * as path from 'path'
import { Project } from 'ts-morph'
import { generateMainBroadcastApi, generateReactHooks, processContracts } from './code-generator'
import { ProcessApiConfig } from './types'
import { resetOutput } from './utils'
import { processYamlConfig } from './yaml-processor'

/**
 * Prints CLI usage instructions
 */
function printUsage() {
  console.log(`Usage: electron-ipc-generate --config=<path>`)
  console.log(`\nRequired:`)
  console.log(`  --config=<path>  Path to YAML configuration file`)
  console.log(`\nExample:`)
  console.log(`  electron-ipc-generate --config=./ipc-config.yaml`)
}

/**
 * Processes a single API configuration
 */
export function processApiConfig({
  name,
  input,
  output,
  contracts,
  tsconfig,
  reactHooksOutput,
  mainBroadcastOutput,
}: ProcessApiConfig) {
  const resolvedInputPath = path.resolve(process.cwd(), input)

  const resolveTsconfigPath = () => {
    if (tsconfig) {
      const resolved = path.resolve(process.cwd(), tsconfig)
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
    const resolvedFromPath = path.resolve(process.cwd(), fromPath)
    const relativePath = path.relative(
      path.dirname(resolvedFromPath),
      path.dirname(resolvedInputPath)
    )
    return relativePath
      ? `${relativePath.replace(/\\/g, '/')}/${inputFileName}`
      : `./${inputFileName}`
  }

  const importPath = buildImportPath(output)
  const apiName = name

  const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
  project.resolveSourceFileDependencies()
  console.log(colors.green(`Read ${path.relative(process.cwd(), resolvedInputPath)}`))

  let code = processContracts(sourceFile, contracts, importPath, apiName)

  const resolvedOutputPath = path.resolve(process.cwd(), output)
  fs.writeFileSync(resolvedOutputPath, code, 'utf8')
  console.log(
    colors.green(`Generated code written to ${path.relative(process.cwd(), resolvedOutputPath)}`)
  )

  if (mainBroadcastOutput) {
    const broadcastContract = contracts.find((c) => c.type === 'send')
    if (!broadcastContract) {
      console.error(
        `Error: mainBroadcastOutput requires a broadcast contract ("contracts.send") for API "${name}"`
      )
      process.exit(1)
    }
    const mainBroadcastImportPath = buildImportPath(mainBroadcastOutput)
    const mainBroadcastCode = generateMainBroadcastApi(
      broadcastContract.name,
      mainBroadcastImportPath,
      sourceFile
    )
    const resolvedMainBroadcastPath = path.resolve(process.cwd(), mainBroadcastOutput)
    fs.writeFileSync(resolvedMainBroadcastPath, mainBroadcastCode, 'utf8')
    console.log(
      colors.green(
        `Generated main broadcast API written to ${path.relative(
          process.cwd(),
          resolvedMainBroadcastPath
        )}`
      )
    )
  }

  // Generate React hooks if requested
  if (reactHooksOutput) {
    const reactHooksCode = generateReactHooks(contracts, importPath, sourceFile, apiName)
    const resolvedReactHooksPath = path.resolve(process.cwd(), reactHooksOutput)
    fs.writeFileSync(resolvedReactHooksPath, reactHooksCode, 'utf8')
    console.log(
      colors.green(
        `Generated React hooks written to ${path.relative(process.cwd(), resolvedReactHooksPath)}`
      )
    )
  }
}

/**
 * Main entry point - parses CLI arguments and generates IPC API code
 */
export function main() {
  const args = process.argv.slice(2)

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
    processYamlConfig(configPath)
  } catch (error) {
    console.error(
      `Error processing configuration: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    )
    process.exit(1)
  }
}

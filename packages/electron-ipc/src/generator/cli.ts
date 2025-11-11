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
  reactHooksOutput,
}: ProcessApiConfig) {
  const project = new Project()
  const resolvedInputPath = path.resolve(process.cwd(), input)

  // Reset output state for this API
  resetOutput()

  const relativePath = path.relative(path.dirname(output), path.dirname(input))
  const inputFileName = path.basename(input, path.extname(input))
  const importPath = relativePath
    ? `${relativePath.replace(/\\/g, '/')}/${inputFileName}`
    : `./${inputFileName}`
  const apiName = name

  const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
  console.log(colors.green(`Read ${path.relative(process.cwd(), resolvedInputPath)}`))

  let code = processContracts(sourceFile, contracts, importPath, apiName)

  // Add main broadcast API if broadcast contracts exist
  const hasBroadcastContracts = contracts.some((c) => c.type === 'send')
  if (hasBroadcastContracts) {
    const broadcastContract = contracts.find((c) => c.type === 'send')
    if (broadcastContract) {
      const mainBroadcastCode = generateMainBroadcastApi(
        broadcastContract.name,
        importPath,
        sourceFile
      )
      code += '\n\n' + mainBroadcastCode
    }
  }

  const resolvedOutputPath = path.resolve(process.cwd(), output)
  fs.writeFileSync(resolvedOutputPath, code, 'utf8')
  console.log(
    colors.green(`Generated code written to ${path.relative(process.cwd(), resolvedOutputPath)}`)
  )

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

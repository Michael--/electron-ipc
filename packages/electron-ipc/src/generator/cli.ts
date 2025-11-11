/* eslint-disable no-console */
import * as colors from 'colors'
import * as fs from 'fs'
import * as path from 'path'
import { Project } from 'ts-morph'
import { generateMainBroadcastApi, generateReactHooks, processContracts } from './code-generator'
import { IContract, ProcessApiConfig } from './types'
import { resetOutput } from './utils'
import { processYamlConfig } from './yaml-processor'

/**
 * Prints CLI usage instructions
 */
function printUsage() {
  console.log(`Usage: electron-ipc-generate [options]`)
  console.log(`\nOption 1: Using YAML config file:`)
  console.log(`  --config=<path>  Path to YAML configuration file`)
  console.log(`\nOption 2: Using CLI arguments:`)
  console.log(`  --input=<path>   Path to the TypeScript file containing IPC contracts`)
  console.log(`  --output=<path>  Path where the generated code will be saved`)
  console.log(`\nContract Options (at least one required):`)
  console.log(`  --invoke=<name>         Type name for invoke contracts (Renderer ↔ Main)`)
  console.log(`  --event=<name>          Type name for event contracts (Renderer → Main)`)
  console.log(`  --send=<name>           Type name for send/broadcast contracts (Main → Renderer)`)
  console.log(
    `  --stream-invoke=<name>  Type name for stream invoke contracts (Renderer ↔ Main with stream response)`
  )
  console.log(`  --stream-upload=<name>  Type name for stream upload contracts (Renderer → Main)`)
  console.log(
    `  --stream-download=<name> Type name for stream download contracts (Main → Renderer)`
  )
  console.log(`\nOptional:`)
  console.log(`  --api-name=<name>        Name of the exported API object (default: 'api')`)
  console.log(
    `  --main-broadcast-output=<path>  Path where the main process broadcast API will be saved`
  )
  console.log(`  --react-hooks=<path>     Path where React hooks will be generated (optional)`)
  console.log(`\nExamples:`)
  console.log(`  electron-ipc-generate --config=./ipc-config.yaml`)
  console.log(
    `  electron-ipc-generate --input=./src/main/ipc-api.ts --output=./src/preload/api.ts --invoke=InvokeContracts --event=EventContracts --send=BroadcastContracts --main-broadcast-output=./src/main/broadcast-api.ts`
  )
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
  const importPath = relativePath ? `${relativePath.replace(/\\/g, '/')}/ipc-api` : './ipc-api'
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

  // Check for YAML config file first
  const configArg = args.find((arg) => arg.startsWith('--config='))
  if (configArg) {
    const configPath = configArg.split('=')[1]
    processYamlConfig(configPath)
    return
  }

  // Fall back to original CLI argument parsing
  const project = new Project()

  const inputPathArg = args.find((arg) => arg.startsWith('--input='))
  const outputPathArg = args.find((arg) => arg.startsWith('--output='))
  const broadcastOutputArg = args.find((arg) => arg.startsWith('--main-broadcast-output='))
  const apiNameArg = args.find((arg) => arg.startsWith('--api-name='))

  // New simplified contract syntax: --invoke=Name, --event=Name, --send=Name
  const invokeArg = args.filter((arg) => arg.startsWith('--invoke=')).pop()
  const eventArg = args.filter((arg) => arg.startsWith('--event=')).pop()
  const sendArg = args.filter((arg) => arg.startsWith('--send=')).pop()
  const streamInvokeArg = args.filter((arg) => arg.startsWith('--stream-invoke=')).pop()
  const streamUploadArg = args.filter((arg) => arg.startsWith('--stream-upload=')).pop()
  const streamDownloadArg = args.filter((arg) => arg.startsWith('--stream-download=')).pop()
  const reactHooksArg = args.filter((arg) => arg.startsWith('--react-hooks=')).pop()

  if (inputPathArg == null || outputPathArg == null) {
    console.error('Error: --input and --output must be defined.')
    printUsage()
    process.exit(1)
  }

  const contractNames: IContract[] = []
  if (invokeArg) contractNames.push({ type: 'invoke', name: invokeArg.split('=')[1] })
  if (eventArg) contractNames.push({ type: 'event', name: eventArg.split('=')[1] })
  if (sendArg) contractNames.push({ type: 'send', name: sendArg.split('=')[1] })
  if (streamInvokeArg)
    contractNames.push({ type: 'streamInvoke', name: streamInvokeArg.split('=')[1] })
  if (streamUploadArg)
    contractNames.push({ type: 'streamUpload', name: streamUploadArg.split('=')[1] })
  if (streamDownloadArg)
    contractNames.push({ type: 'streamDownload', name: streamDownloadArg.split('=')[1] })

  const inputPath = inputPathArg.split('=')[1]
  const outputPath = outputPathArg.split('=')[1]
  const broadcastOutputPath = broadcastOutputArg?.split('=')[1]
  const apiName = apiNameArg ? apiNameArg.split('=')[1] : 'api'
  const reactHooksOutputPath = reactHooksArg?.split('=')[1]

  if (contractNames.length === 0 && !reactHooksOutputPath) {
    console.error(
      'Error: At least one contract (--invoke, --event, --send, --stream-invoke, --stream-upload, or --stream-download) must be defined, or --react-hooks must be specified.'
    )
    printUsage()
    process.exit(1)
  }

  const relativePath = path.relative(path.dirname(outputPath), path.dirname(inputPath))
  const importPath = `${relativePath.replace(/\\/g, '/')}/ipc-api`

  const resolvedInputPath = path.resolve(process.cwd(), inputPath)
  try {
    const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
    console.log(colors.green(`Read ${path.relative(process.cwd(), resolvedInputPath)}`))

    const code = processContracts(sourceFile, contractNames, importPath, apiName)

    const resolvedOutputPath = path.resolve(process.cwd(), outputPath)
    fs.writeFileSync(resolvedOutputPath, code, 'utf8')
    console.log(
      colors.green(`Generated code written to ${path.relative(process.cwd(), resolvedOutputPath)}`)
    )

    // Generate main broadcast API if requested
    if (broadcastOutputPath && sendArg) {
      const broadcastContractName = sendArg.split('=')[1]
      const mainBroadcastCode = generateMainBroadcastApi(
        broadcastContractName,
        importPath,
        sourceFile
      )
      const resolvedMainBroadcastPath = path.resolve(process.cwd(), broadcastOutputPath)
      fs.writeFileSync(resolvedMainBroadcastPath, mainBroadcastCode, 'utf8')
      console.log(
        colors.green(
          `Generated main broadcast API written to ${path.relative(process.cwd(), resolvedMainBroadcastPath)}`
        )
      )
    }

    // Generate React hooks if requested
    if (reactHooksOutputPath) {
      const reactHooksCode = generateReactHooks(contractNames, importPath, sourceFile)
      const resolvedReactHooksPath = path.resolve(process.cwd(), reactHooksOutputPath)
      fs.writeFileSync(resolvedReactHooksPath, reactHooksCode, 'utf8')
      console.log(
        colors.green(
          `Generated React hooks written to ${path.relative(process.cwd(), resolvedReactHooksPath)}`
        )
      )
    }
  } catch (error) {
    console.error(`Error processing files: ${JSON.stringify(error)}`)
    printUsage()
    process.exit(1)
  }
}

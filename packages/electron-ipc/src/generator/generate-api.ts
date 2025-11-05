/* eslint-disable no-console */
import * as fs from 'fs'
import * as path from 'path'
import { Project, SourceFile } from 'ts-morph'
import {
  createApiExport,
  createApiMethod,
  createExposeApi,
  createFileHeader,
  createMainFileHeader,
  eventContracts,
  invokeContracts,
  sendContracts,
} from './templates'

let output = ''
let space = 0
const generatedApiNames: string[] = []

const add = (props: { v?: string; indent?: boolean; cr?: false }) => {
  if (props.indent === false) space = Math.max(0, space - 3)
  if (props.v != null)
    output += ' '.repeat(space) + props.v.trimEnd() + (props.cr === false ? '' : '\n')
  if (props.indent === true) space += 3
}

const addBlob = (blob: string) => {
  blob.split('\n').forEach((line) => add({ v: line }))
}

/**
 * Contract configuration for code generation
 */
interface IContract {
  type: 'invoke' | 'event' | 'send'
  name: string
}

/**
 * Configuration for different contract types
 */
const CONTRACT_CONFIG = {
  invoke: {
    template: invokeContracts,
    methodPrefix: 'invoke',
    paramType: 'request' as const,
    returnType: 'invoke' as const,
    searchType: 'type' as const,
  },
  event: {
    template: eventContracts,
    methodPrefix: 'send',
    paramType: 'request' as const,
    returnType: 'void' as const,
    searchType: 'type' as const,
  },
  send: {
    template: sendContracts,
    methodPrefix: 'on',
    paramType: 'payload' as const,
    returnType: 'callback' as const,
    searchType: 'type' as const,
  },
} as const

type ApiFunc = (ifaceName: string, prop: string) => void

/**
 * Generates API method code for invoke contracts
 */
function invokeApi(contract: string, propName: string) {
  const method = createApiMethod('invoke', propName, contract, 'request', 'invoke')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for event contracts
 */
function eventApi(contract: string, propName: string) {
  const method = createApiMethod('send', propName, contract, 'request', 'void')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for send/broadcast contracts
 */
function sendApi(contract: string, propName: string) {
  const method = createApiMethod('on', propName, contract, 'payload', 'callback')
  add({ v: method, indent: true })
  add({ indent: false })
}

function processProperties(props: {
  ifaceName: string
  propNames: string[]
  contract: string
  api: ApiFunc
  definitions: string
}) {
  console.log(
    `${props.contract} contains ${props.propNames.length} properties [${props.propNames.join(', ')}]`
  )

  if (props.propNames.length === 0) return
  props.definitions.split('\n').forEach((v) => add({ v }))

  const apiName = `${props.ifaceName}Api`
  generatedApiNames.push(apiName)

  // Start of the API definition for this interface
  add({ v: `const ${apiName} = {`, indent: true })

  props.propNames.forEach((prop) => {
    props.api(props.ifaceName, prop)
  })

  // Close the API definition
  add({ v: '}', indent: false })
}

/**
 * Finds exported type aliases matching the exact typename
 */
function getTypeAliasesOf(sourceFile: SourceFile, typename: string) {
  return sourceFile.getTypeAliases().filter((e) => e.isExported() && e.getName() === typename)
}

/**
 * Finds exported interfaces matching the exact typename
 */
function getInterfacesOf(sourceFile: SourceFile, typename: string) {
  return sourceFile.getInterfaces().filter((e) => e.isExported() && e.getName() === typename)
}

/**
 * Prints CLI usage instructions
 */
function printUsage() {
  console.log(`Usage: electron-ipc-generate --input=<path> --output=<path> [options]`)
  console.log(`\nRequired:`)
  console.log(`  --input=<path>   Path to the TypeScript file containing IPC contracts`)
  console.log(`  --output=<path>  Path where the generated code will be saved`)
  console.log(`\nContract Options (at least one required):`)
  console.log(`  --invoke=<name>  Type name for invoke contracts (Renderer ↔ Main)`)
  console.log(`  --event=<name>   Type name for event contracts (Renderer → Main)`)
  console.log(`  --send=<name>    Type name for send/broadcast contracts (Main → Renderer)`)
  console.log(`\nOptional:`)
  console.log(
    `  --main-broadcast-output=<path>  Path where the main process broadcast API will be saved`
  )
  console.log(`\nExample:`)
  console.log(
    `  electron-ipc-generate --input=./src/main/ipc-api.ts --output=./src/preload/api.ts --invoke=InvokeContracts --event=EventContracts --send=BroadcastContracts --main-broadcast-output=./src/main/broadcast-api.ts`
  )
  console.log(`\nNote: If multiple contracts of the same type are specified, the last one wins.`)
}

/**
 * Processes all contracts and generates the IPC API code
 */
export function processContracts(
  sourceFile: SourceFile,
  contractNames: IContract[],
  importPath: string
) {
  const processDeclarations = (
    contract: string,
    api: ApiFunc,
    searchType: 'type' | 'interface'
  ) => {
    if (searchType === 'type') {
      const declarations = getTypeAliasesOf(sourceFile, contract)
      declarations.forEach((decl) => {
        const name = decl.getName()
        const propNames = decl
          .getType()
          .getProperties()
          .map((p) => p.getName())
        processProperties({ ifaceName: name, propNames, contract, api, definitions: '' })
      })
      return declarations.length
    } else {
      const declarations = getInterfacesOf(sourceFile, contract)
      declarations.forEach((decl) => {
        const name = decl.getName()
        const propNames = decl.getProperties().map((p) => p.getName())
        processProperties({ ifaceName: name, propNames, contract, api, definitions: '' })
      })
      return declarations.length
    }
  }

  addBlob(createFileHeader())

  contractNames.forEach(({ type, name }) => {
    const config = CONTRACT_CONFIG[type]
    if (!config) {
      console.error(`Unknown contract type: ${type}, must be "invoke", "event", or "send"`)
      process.exit(1)
    }

    addBlob(config.template(name, importPath))

    const found = processDeclarations(
      name,
      type === 'invoke' ? invokeApi : type === 'event' ? eventApi : sendApi,
      config.searchType
    )

    if (found === 0) {
      console.error(`Nothing found for "${type}:${name}" : Type does not exist or is empty`)
      printUsage()
      process.exit(1)
    }
  })

  addBlob(createApiExport(generatedApiNames))
  addBlob(createExposeApi())
  return output
}

/**
 * Generates main process broadcast API code
 */
export function generateMainBroadcastApi(
  contractName: string,
  importPath: string,
  sourceFile: SourceFile
): string {
  const output: string[] = []
  const add = (v: string | { v: string; indent?: boolean }) => {
    if (typeof v === 'string') {
      output.push(v)
    } else {
      const indentStr = v.indent ? '  ' : ''
      output.push(`${indentStr}${v.v}`)
    }
  }

  add(createMainFileHeader())

  add(`import { BrowserWindow } from 'electron'`)
  add(`import { ${contractName} } from '${importPath}'`)
  add('')

  add('/**')
  add(' * Main process broadcast API for sending messages to renderer')
  add(' */')
  add(`export const mainBroadcast = {`)

  // Get the broadcast contract properties
  const declarations = getTypeAliasesOf(sourceFile, contractName)
  if (declarations.length > 0) {
    const decl = declarations[0]
    const propNames = decl
      .getType()
      .getProperties()
      .map((p) => p.getName())

    propNames.forEach((propName, index) => {
      const payloadType = `${contractName}["${propName}"]["payload"]`

      // Check if payload type is void to make it optional
      const prop = decl.getType().getProperty(propName)
      const propType = prop?.getTypeAtLocation(decl)
      const payloadProp = propType?.getProperty('payload')
      const payloadTypeDef = payloadProp?.getTypeAtLocation(decl)
      const isVoidPayload = payloadTypeDef?.getText() === 'void'

      let method: string
      if (isVoidPayload) {
        // For void payload, make parameter optional
        method = `${propName}: (mainWindow: BrowserWindow, payload?: ${payloadType}): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('${propName}', payload)
    }
  }`
      } else {
        // For non-void payload, make parameter required
        method = `${propName}: (mainWindow: BrowserWindow, payload: ${payloadType}): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('${propName}', payload)
    }
  }`
      }

      add({ v: method, indent: true })
      if (index < propNames.length - 1) {
        add({ v: ',', indent: true })
      }
    })
  }

  add('} as const')

  return output.join('\n')
}

/**
 * Main entry point - parses CLI arguments and generates IPC API code
 */
export function main() {
  const project = new Project()

  const args = process.argv.slice(2)

  const inputPathArg = args.find((arg) => arg.startsWith('--input='))
  const outputPathArg = args.find((arg) => arg.startsWith('--output='))
  const mainBroadcastOutputArg = args.find((arg) => arg.startsWith('--main-broadcast-output='))

  // New simplified contract syntax: --invoke=Name, --event=Name, --send=Name
  const invokeArg = args.filter((arg) => arg.startsWith('--invoke=')).pop()
  const eventArg = args.filter((arg) => arg.startsWith('--event=')).pop()
  const sendArg = args.filter((arg) => arg.startsWith('--send=')).pop()

  if (inputPathArg == null || outputPathArg == null) {
    console.error('Error: --input and --output must be defined.')
    printUsage()
    process.exit(1)
  }

  const contractNames: IContract[] = []
  if (invokeArg) contractNames.push({ type: 'invoke', name: invokeArg.split('=')[1] })
  if (eventArg) contractNames.push({ type: 'event', name: eventArg.split('=')[1] })
  if (sendArg) contractNames.push({ type: 'send', name: sendArg.split('=')[1] })

  if (contractNames.length === 0) {
    console.error('Error: At least one contract (--invoke, --event, or --send) must be defined.')
    printUsage()
    process.exit(1)
  }

  const inputPath = inputPathArg.split('=')[1]
  const outputPath = outputPathArg.split('=')[1]
  const mainBroadcastOutputPath = mainBroadcastOutputArg?.split('=')[1]

  const relativePath = path.relative(path.dirname(outputPath), path.dirname(inputPath))
  const importPath = `${relativePath.replace(/\\/g, '/')}/ipc-api`

  const resolvedInputPath = path.resolve(process.cwd(), inputPath)
  try {
    const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
    console.log(`Read ${resolvedInputPath}`)

    const code = processContracts(sourceFile, contractNames, importPath)

    const resolvedOutputPath = path.resolve(process.cwd(), outputPath)
    fs.writeFileSync(resolvedOutputPath, code, 'utf8')
    console.log(`Generated code written to ${resolvedOutputPath}`)

    // Generate main broadcast API if requested
    if (mainBroadcastOutputPath && sendArg) {
      const broadcastContractName = sendArg.split('=')[1]
      const mainBroadcastCode = generateMainBroadcastApi(
        broadcastContractName,
        importPath,
        sourceFile
      )
      const resolvedMainBroadcastPath = path.resolve(process.cwd(), mainBroadcastOutputPath)
      fs.writeFileSync(resolvedMainBroadcastPath, mainBroadcastCode, 'utf8')
      console.log(`Generated main broadcast API written to ${resolvedMainBroadcastPath}`)
    }
  } catch (error) {
    console.error(`Error processing files: ${JSON.stringify(error)}`)
    printUsage()
    process.exit(1)
  }
}

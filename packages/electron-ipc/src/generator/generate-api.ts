/* eslint-disable no-console */
import * as fs from 'fs'
import * as path from 'path'
import { Project, SourceFile } from 'ts-morph'
import { parse as parseYaml } from 'yaml'
import {
  createApiExport,
  createApiMethod,
  createExposeApi,
  createFileHeader,
  createMainFileHeader,
  eventContracts,
  invokeContracts,
  sendContracts,
  streamDownloadContracts,
  streamInvokeContracts,
  streamUploadContracts,
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
  type: 'invoke' | 'event' | 'send' | 'streamInvoke' | 'streamUpload' | 'streamDownload'
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
  streamInvoke: {
    template: streamInvokeContracts,
    methodPrefix: 'invokeStream',
    paramType: 'request' as const,
    returnType: 'stream' as const,
    searchType: 'type' as const,
  },
  streamUpload: {
    template: streamUploadContracts,
    methodPrefix: 'upload',
    paramType: 'data' as const,
    returnType: 'void' as const,
    searchType: 'type' as const,
  },
  streamDownload: {
    template: streamDownloadContracts,
    methodPrefix: 'download',
    paramType: 'data' as const,
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

/**
 * Generates API method code for stream invoke contracts
 */
function streamInvokeApi(contract: string, propName: string) {
  const method = createApiMethod('invokeStream', propName, contract, 'request', 'stream')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for stream upload contracts
 */
function streamUploadApi(contract: string, propName: string) {
  const method = createApiMethod('upload', propName, contract, 'request', 'upload')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for stream download contracts
 */
function streamDownloadApi(contract: string, propName: string) {
  const method = createApiMethod('download', propName, contract, 'request', 'download')
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
 * Configuration for a single API definition in YAML config
 */
interface ApiConfig {
  name: string
  input: string
  output: string
  contracts?: {
    invoke?: string
    event?: string
    send?: string
    streamInvoke?: string
    streamUpload?: string
    streamDownload?: string
  }
  mainBroadcastOutput?: string
}

/**
 * Root YAML configuration structure
 */
interface YamlConfig {
  apis: ApiConfig[]
}

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
  console.log(`\nExamples:`)
  console.log(`  electron-ipc-generate --config=./ipc-config.yaml`)
  console.log(
    `  electron-ipc-generate --input=./src/main/ipc-api.ts --output=./src/preload/api.ts --invoke=InvokeContracts --event=EventContracts --send=BroadcastContracts --main-broadcast-output=./src/main/broadcast-api.ts`
  )
}

/**
 * Processes all contracts and generates the IPC API code
 */
export function processContracts(
  sourceFile: SourceFile,
  contractNames: IContract[],
  importPath: string,
  apiName: string = 'api'
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
        const type = decl.getType()
        console.log(`Type text: ${type.getText()}`)
        let propNames: string[] = []
        const typeText = type.getText()
        if (typeText.startsWith('Generic') && typeText.includes('<{') && typeText.includes('}>')) {
          // Parse generic type like GenericInvokeContract<{ key: value }>
          const start = typeText.indexOf('<{') + 2
          const end = typeText.lastIndexOf('}>')
          const inner = typeText.substring(start, end)
          // Parse top-level properties separated by ;
          const props: string[] = []
          let current = ''
          let braceLevel = 0
          let angleLevel = 0
          for (let i = 0; i < inner.length; i++) {
            const char = inner[i]
            if (char === '<') angleLevel++
            else if (char === '>') angleLevel--
            else if (char === '{') braceLevel++
            else if (char === '}') braceLevel--
            else if (char === ';' && braceLevel === 0 && angleLevel === 0) {
              props.push(current.trim())
              current = ''
              continue
            }
            current += char
          }
          if (current.trim()) props.push(current.trim())
          propNames = props.map((p) => p.split(':')[0].trim())
        } else if (type.isObject() && type.getTypeArguments().length > 0) {
          // For generic types like GenericInvokeContract<T>, get properties from T
          const typeArg = type.getTypeArguments()[0]
          propNames = typeArg.getProperties().map((p) => p.getName())
        } else {
          propNames = type.getProperties().map((p) => p.getName())
        }
        console.log(`Processing ${name}: found ${propNames.length} properties`)
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
      console.error(
        `Unknown contract type: ${type}, must be "invoke", "event", "send", "streamInvoke", "streamUpload", or "streamDownload"`
      )
      process.exit(1)
    }

    addBlob(config.template(name, importPath))

    const found = processDeclarations(
      name,
      type === 'invoke'
        ? invokeApi
        : type === 'event'
          ? eventApi
          : type === 'send'
            ? sendApi
            : type === 'streamInvoke'
              ? streamInvokeApi
              : type === 'streamUpload'
                ? streamUploadApi
                : type === 'streamDownload'
                  ? streamDownloadApi
                  : sendApi, // fallback
      config.searchType
    )

    if (found === 0) {
      console.error(`Nothing found for "${type}:${name}" : Type does not exist or is empty`)
      printUsage()
      process.exit(1)
    }
  })

  addBlob(createApiExport(generatedApiNames, apiName))
  addBlob(createExposeApi(apiName))
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
    const type = decl.getType()
    const typeText = type.getText()
    let propNames: string[] = []
    if (typeText.startsWith('Generic') && typeText.includes('<{') && typeText.includes('}>')) {
      // Parse generic type like GenericBroadcastContract<{ key: value }>
      const start = typeText.indexOf('<{') + 2
      const end = typeText.lastIndexOf('}>')
      const inner = typeText.substring(start, end)
      // Parse top-level properties separated by ;
      const props: string[] = []
      let current = ''
      let braceLevel = 0
      let angleLevel = 0
      for (let i = 0; i < inner.length; i++) {
        const char = inner[i]
        if (char === '<') angleLevel++
        else if (char === '>') angleLevel--
        else if (char === '{') braceLevel++
        else if (char === '}') braceLevel--
        else if (char === ';' && braceLevel === 0 && angleLevel === 0) {
          props.push(current.trim())
          current = ''
          continue
        }
        current += char
      }
      if (current.trim()) props.push(current.trim())
      propNames = props.map((p) => p.split(':')[0].trim())
    } else {
      propNames = type.getProperties().map((p) => p.getName())
    }

    propNames.forEach((propName, index) => {
      const payloadType = `${contractName}["${propName}"]["payload"]`

      // Check if payload type is void to make it optional
      let isVoidPayload = false
      if (typeText.startsWith('Generic')) {
        // For generic types, check the string
        isVoidPayload = typeText.includes(`${propName}: IBroadcastContract<void>`)
      } else {
        // For direct types, use property analysis
        const prop = type.getProperty(propName)
        const propType = prop?.getTypeAtLocation(decl)
        const payloadProp = propType?.getProperty('payload')
        const payloadTypeDef = payloadProp?.getTypeAtLocation(decl)
        isVoidPayload = payloadTypeDef?.getText() === 'void'
      }

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
 * Processes a single API configuration
 */
function processApiConfig(apiConfig: {
  name: string
  input: string
  output: string
  contracts: IContract[]
  mainBroadcastOutput?: string
  broadcastContractName?: string
}) {
  const {
    name: apiName,
    input,
    output: outputPath,
    contracts,
    mainBroadcastOutput,
    broadcastContractName,
  } = apiConfig

  // Create a new project for each API to avoid conflicts
  const project = new Project()

  const relativePath = path.relative(path.dirname(outputPath), path.dirname(input))
  const importPath = `${relativePath.replace(/\\/g, '/')}/ipc-api`

  const resolvedInputPath = path.resolve(process.cwd(), input)

  // Reset output state for this API
  output = ''
  space = 0
  generatedApiNames.length = 0

  const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
  console.log(`Read ${resolvedInputPath}`)

  const code = processContracts(sourceFile, contracts, importPath, apiName)

  const resolvedOutputPath = path.resolve(process.cwd(), outputPath)
  fs.writeFileSync(resolvedOutputPath, code, 'utf8')
  console.log(`Generated code written to ${resolvedOutputPath}`)

  // Generate main broadcast API if requested
  if (mainBroadcastOutput && broadcastContractName) {
    const mainBroadcastCode = generateMainBroadcastApi(
      broadcastContractName,
      importPath,
      sourceFile
    )
    const resolvedMainBroadcastPath = path.resolve(process.cwd(), mainBroadcastOutput)
    fs.writeFileSync(resolvedMainBroadcastPath, mainBroadcastCode, 'utf8')
    console.log(`Generated main broadcast API written to ${resolvedMainBroadcastPath}`)
  }
}

/**
 * Processes YAML configuration file
 */
function processYamlConfig(configPath: string) {
  const resolvedConfigPath = path.resolve(process.cwd(), configPath)

  if (!fs.existsSync(resolvedConfigPath)) {
    console.error(`Error: Config file not found: ${resolvedConfigPath}`)
    process.exit(1)
  }

  const configContent = fs.readFileSync(resolvedConfigPath, 'utf8')
  const config = parseYaml(configContent) as YamlConfig

  if (!config.apis || !Array.isArray(config.apis)) {
    console.error('Error: Invalid YAML config - "apis" array is required')
    process.exit(1)
  }

  config.apis.forEach((api) => {
    if (!api.name || !api.input || !api.output) {
      console.error('Error: Each API must have "name", "input", and "output" properties')
      process.exit(1)
    }

    const contractNames: IContract[] = []
    let broadcastContractName: string | undefined

    if (api.contracts) {
      if (api.contracts.invoke) contractNames.push({ type: 'invoke', name: api.contracts.invoke })
      if (api.contracts.event) contractNames.push({ type: 'event', name: api.contracts.event })
      if (api.contracts.send) {
        contractNames.push({ type: 'send', name: api.contracts.send })
        broadcastContractName = api.contracts.send
      }
      if (api.contracts.streamInvoke)
        contractNames.push({ type: 'streamInvoke', name: api.contracts.streamInvoke })
      if (api.contracts.streamUpload)
        contractNames.push({ type: 'streamUpload', name: api.contracts.streamUpload })
      if (api.contracts.streamDownload)
        contractNames.push({ type: 'streamDownload', name: api.contracts.streamDownload })
    }

    if (contractNames.length === 0) {
      console.error(`Error: API "${api.name}" must have at least one contract defined`)
      process.exit(1)
    }

    processApiConfig({
      name: api.name,
      input: api.input,
      output: api.output,
      contracts: contractNames,
      mainBroadcastOutput: api.mainBroadcastOutput,
      broadcastContractName,
    })
  })
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
  const mainBroadcastOutputArg = args.find((arg) => arg.startsWith('--main-broadcast-output='))
  const apiNameArg = args.find((arg) => arg.startsWith('--api-name='))

  // New simplified contract syntax: --invoke=Name, --event=Name, --send=Name
  const invokeArg = args.filter((arg) => arg.startsWith('--invoke=')).pop()
  const eventArg = args.filter((arg) => arg.startsWith('--event=')).pop()
  const sendArg = args.filter((arg) => arg.startsWith('--send=')).pop()
  const streamInvokeArg = args.filter((arg) => arg.startsWith('--stream-invoke=')).pop()
  const streamUploadArg = args.filter((arg) => arg.startsWith('--stream-upload=')).pop()
  const streamDownloadArg = args.filter((arg) => arg.startsWith('--stream-download=')).pop()

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

  if (contractNames.length === 0) {
    console.error(
      'Error: At least one contract (--invoke, --event, --send, --stream-invoke, --stream-upload, or --stream-download) must be defined.'
    )
    printUsage()
    process.exit(1)
  }

  const inputPath = inputPathArg.split('=')[1]
  const outputPath = outputPathArg.split('=')[1]
  const mainBroadcastOutputPath = mainBroadcastOutputArg?.split('=')[1]
  const apiName = apiNameArg ? apiNameArg.split('=')[1] : 'api'

  const relativePath = path.relative(path.dirname(outputPath), path.dirname(inputPath))
  const importPath = `${relativePath.replace(/\\/g, '/')}/ipc-api`

  const resolvedInputPath = path.resolve(process.cwd(), inputPath)
  try {
    const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
    console.log(`Read ${resolvedInputPath}`)

    const code = processContracts(sourceFile, contractNames, importPath, apiName)

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

/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import { Project, SourceFile } from 'ts-morph'

const header = `
import { ipcRenderer } from "electron"`
const invokeContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function takes the channel and request, infers the types, and calls ipcRenderer.invoke with the correct types enforced.
const invoke${contract} = <K extends keyof ${contract}>(channel: K, request: ${contract}[K]["request"]): Promise<${contract}[K]["response"]> => {
   return ipcRenderer.invoke(channel as string, request) as Promise<${contract}[K]["response"]>
}
`

const eventContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function takes the channel and request, infers the types, and calls ipcRenderer.send with the correct types enforced.
const send${contract} = <K extends keyof ${contract}>(channel: K, request: ${contract}[K]["request"]): void => {
   ipcRenderer.send(channel as string, request)
}
`

const sendContracts = (contract: string, importPath: string) => `
import { ${contract} } from "${importPath}"

// This function takes the channel and request, infers the types, and calls ipcRenderer.on with the correct types enforced.
const on${contract} = <K extends keyof ${contract}>(channel: K, callback: (payload: ${contract}[K]["payload"]) => void): void => {
   ipcRenderer.on(channel as string, (_event, payload: ${contract}[K]["payload"]) => callback(payload))
}
`

let output = ''
let space = 0
const generatedApiNames: string[] = []

const add = (props: { v?: string; indent?: boolean; cr?: false }) => {
  if (props.indent === false) space = Math.max(0, space - 3)
  if (props.v != null)
    output += ' '.repeat(space) + props.v.trimEnd() + (props.cr === false ? '' : '\n')
  if (props.indent === true) space += 3
}

type ApiFunc = (ifaceName: string, prop: string) => void

function invokeApi(contract: string, propName: string) {
  add({
    v: `invoke${propName}: (request: ${contract}["${propName}"]["request"]) => {`,
    indent: true,
  })
  add({ v: `return invoke${contract}("${propName}", request)` })
  add({ v: `},`, indent: false })
}

function eventApi(contract: string, propName: string) {
  add({ v: `send${propName}: (request: ${contract}["${propName}"]["request"]) => {`, indent: true })
  add({ v: `return send${contract}("${propName}", request)` })
  add({ v: `},`, indent: false })
}

function sendApi(contract: string, propName: string) {
  add({
    v: `on${propName}: (callback: (content: ${contract}["${propName}"]["payload"]) => void) => {`,
    indent: true,
  })
  add({ v: `return on${contract}("${propName}", callback)` })
  add({ v: `},`, indent: false })
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

function getTypeAliasesOf(sourceFile: SourceFile, typename: string) {
  return sourceFile.getTypeAliases().filter((e) => e.isExported() && e.getName().includes(typename))
}

function getInterfacesOf(sourceFile: SourceFile, typename: string) {
  return sourceFile.getInterfaces().filter((e) => e.isExported() && e.getName() === typename)
}

interface IContract {
  type: string
  name: string
}

function printUsage() {
  console.log(
    `Usage: node [scriptName].js --input=[inputPath] --output=[outputPath] --contract=[type:name]`
  )
  console.log(`Parameters:`)
  console.log(`  --input: Path to the TypeScript file containing the IPC contracts.`)
  console.log(`  --output: Path where the generated code will be saved.`)
  console.log(
    `  --contract: Specifies the contract type (invoke|event|send) and name (the type name of your contract).`
  )
  console.log(`              Can be used multiple times for multiple contracts.`)
  console.log(`Example:`)
  console.log(
    `  node [scriptName].js --input=./src/main/ipc-api.ts --output=./src/preload/api-generated.ts --contract=invoke:IPCInvokeContracts`
  )
}

// Function to process contracts
function processContracts(sourceFile: SourceFile, contractNames: IContract[], importPath: string) {
  // search for a contract if designed as a type
  const processTypes = (props: { contract: string; api: ApiFunc; definitions: string }) => {
    const alias = getTypeAliasesOf(sourceFile, props.contract)
    alias.forEach((typeAlias) => {
      const name = typeAlias.getName()
      const typeAliases = typeAlias.getType()
      const propNames = typeAliases.getProperties().map((prop) => prop.getName())
      processProperties({ ...props, ifaceName: name, propNames: propNames })
    })
    return alias.length
  }

  // search for a contract if designed as an interface
  const processInterfaces = (props: { contract: string; api: ApiFunc; definitions: string }) => {
    const alias = getInterfacesOf(sourceFile, props.contract)
    alias.forEach((iFace) => {
      const name = iFace.getName()
      const propNames = iFace.getProperties().map((prop) => prop.getName())
      processProperties({ ...props, ifaceName: name, propNames: propNames })
    })
    return alias.length
  }

  header.split('\n').forEach((v) => add({ v }))

  // TODO: the names of the contracts to be inspect could be a param, or fiddle out by its declaration (derived from ...)
  contractNames.forEach(({ type, name }) => {
    let n = 0
    switch (type) {
      case 'invoke':
        n = processTypes({
          contract: name,
          api: invokeApi,
          definitions: invokeContracts(name, importPath),
        })
        break
      case 'event':
        n = processTypes({
          contract: name,
          api: eventApi,
          definitions: eventContracts(name, importPath),
        })
        break
      case 'send':
        n = processInterfaces({
          contract: name,
          api: sendApi,
          definitions: sendContracts(name, importPath),
        })
        break
      default:
        console.error(`Unknown contract type: ${type}, must of of "invoke, event, send"`)
        process.exit(1)
    }
    if (n === 0) {
      console.error(`Nothing found for "${type}:${name}" : Type does not exist or is empty`)
      printUsage()
      process.exit(1)
    }
  })

  // TODO: the api name could be a param
  add({ v: '' })
  add({ v: 'export const api = {', indent: true })
  generatedApiNames.forEach((e) => {
    add({ v: `...${e},` })
  })
  add({ v: '}', indent: false })
  add({ v: 'export type ApiType = typeof api' })

  return output
}

function main() {
  // Initialize project and source files
  const project = new Project({
    compilerOptions: {
      // following was an old option, may need to be changed, but currently not necessary anymore, script result is now OK anyway
      //target: ts.ScriptTarget.ES5,
      //module: ts.ModuleKind.CommonJS,
    },
  })

  const args = process.argv.slice(2) // Removes the first two elements

  const inputPathArg = args.find((arg) => arg.startsWith('--input='))
  const outputPathArg = args.find((arg) => arg.startsWith('--output='))
  const contractArgs = args.filter((arg) => arg.startsWith('--contract='))

  if (inputPathArg == null || outputPathArg == null || contractArgs.length === 0) {
    console.error('Error: --input, --output, and at least one --contract must be defined.')
    printUsage()
    process.exit(1)
  }

  const inputPath = inputPathArg.split('=')[1]
  const outputPath = outputPathArg.split('=')[1]
  const contractNames: IContract[] = contractArgs.map((arg) => {
    const [type, name] = arg.split('=')[1].split(':')
    return { type, name }
  })

  // Calculate the relative typescript import path and format the import path, ensuring correct parent directory notation and removing file extension
  const relativePath = path.relative(path.dirname(outputPath), path.dirname(inputPath))
  const importPath = `${relativePath.replace(/\\/g, '/')}/ipc-api`
    .replace(/^\.\.\//, '../')
    .replace(/\.ts$/, '')

  // read the file where the API is declared
  const resolvedInputPath = path.resolve(process.cwd(), inputPath)
  try {
    const sourceFile = project.addSourceFileAtPath(resolvedInputPath)
    console.log(`Read ${resolvedInputPath}`)

    const code = processContracts(sourceFile, contractNames, importPath)

    // Write the generated code to a file
    const resolvedOutputPath = path.resolve(process.cwd(), outputPath)
    fs.writeFileSync(resolvedOutputPath, code, 'utf8')
    console.log(`Generated code written to ${resolvedOutputPath}`)
  } catch (error) {
    console.error(`Error processing files: ${JSON.stringify(error)}`)
    printUsage()
    process.exit(1)
  }
}

main()

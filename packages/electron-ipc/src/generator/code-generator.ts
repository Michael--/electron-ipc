/* eslint-disable no-console */
import * as colors from 'colors'
import { SourceFile } from 'ts-morph'
import {
  eventApi,
  invokeApi,
  sendApi,
  streamDownloadApi,
  streamInvokeApi,
  streamUploadApi,
} from './api-generators'
import { ApiFunc, CONTRACT_CONFIG } from './config'
import {
  createApiExport,
  createExposeApi,
  createFileHeader,
  createMainFileHeader,
  createReactHooksFileHeader,
  reactBroadcastHook,
  reactEventHook,
  reactInvokeHook,
  reactStreamDownloadHook,
  reactStreamInvokeHook,
  reactStreamUploadHook,
} from './templates'
import { IContract } from './types'
import { add, addBlob, generatedApiNames, output } from './utils'

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

function processProperties(props: {
  ifaceName: string
  propNames: string[]
  contract: string
  api: ApiFunc
  definitions: string
}) {
  if (props.propNames.length === 0) return
  props.definitions.split('\n').forEach((v) => add({ v }))

  const apiName = `${props.ifaceName}Api`
  generatedApiNames.push(apiName)

  // Start of the API definition for this interface
  add({ v: `const ${apiName} = {`, indent: true })

  props.propNames.forEach((prop) => {
    props.api(props.ifaceName, prop)
  })

  // Add generic on method for broadcast contracts
  if (props.ifaceName === 'BroadcastContracts') {
    add({ v: `on: on${props.ifaceName},` })
  }

  // Close the API definition
  add({ v: '}', indent: false })
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
        console.log(colors.gray(`Processing ${name}: found ${propNames.length} properties`))
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
    if (type === 'reactHooks') return // Skip reactHooks, handled separately

    const config = CONTRACT_CONFIG[type as keyof typeof CONTRACT_CONFIG]
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
      process.exit(1)
    }
  })

  // Add generic on method for broadcast contracts if any exist
  const hasBroadcastContracts = contractNames.some((c) => c.type === 'send')
  if (hasBroadcastContracts) {
    const broadcastContract = contractNames.find((c) => c.type === 'send')
    if (broadcastContract) {
      // Note: Generic on method is now added inside the BroadcastContractsApi object
      // in processProperties function
    }
  }

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
  mainWindow.webContents.send('${propName}', payload)
}`
      } else {
        // For non-void payload, require parameter
        method = `${propName}: (mainWindow: BrowserWindow, payload: ${payloadType}): void => {
  mainWindow.webContents.send('${propName}', payload)
}`
      }

      add(method)
      if (index < propNames.length - 1) add(',')
    })
  }

  add('}')
  return output.join('\n')
}

/**
 * Generates React hooks for all provided contracts
 * @param contractNames - Array of contract configurations
 * @param importPath - Relative import path to the contract definitions
 * @param sourceFile - The source file containing the contracts
 * @returns Generated React hooks code as string
 */
export function generateReactHooks(
  contractNames: IContract[],
  importPath: string,
  sourceFile: SourceFile,
  apiName: string = 'api'
): string {
  const output: string[] = []
  const add = (v: string) => output.push(v)

  add(createReactHooksFileHeader())

  // Group contracts by type
  const invokeContracts = contractNames.filter((c) => c.type === 'invoke')
  const eventContracts = contractNames.filter((c) => c.type === 'event')
  const broadcastContracts = contractNames.filter((c) => c.type === 'send')
  const streamInvokeContracts = contractNames.filter((c) => c.type === 'streamInvoke')
  const streamUploadContracts = contractNames.filter((c) => c.type === 'streamUpload')
  const streamDownloadContracts = contractNames.filter((c) => c.type === 'streamDownload')

  // Generate hooks for invoke contracts
  invokeContracts.forEach(({ name }) => {
    add(reactInvokeHook(name, importPath, apiName))
  })

  // Generate hooks for event contracts
  eventContracts.forEach(({ name }) => {
    add(reactEventHook(name, importPath, apiName))
  })

  // Generate hooks for broadcast contracts
  broadcastContracts.forEach(({ name }) => {
    add(reactBroadcastHook(name, importPath, apiName))
  })

  // Generate hooks for stream invoke contracts
  streamInvokeContracts.forEach(({ name }) => {
    add(reactStreamInvokeHook(name, importPath, apiName))
  })

  // Generate hooks for stream upload contracts
  streamUploadContracts.forEach(({ name }) => {
    add(reactStreamUploadHook(name, importPath, apiName))
  })

  // Generate hooks for stream download contracts
  streamDownloadContracts.forEach(({ name }) => {
    add(reactStreamDownloadHook(name, importPath, apiName))
  })

  return output.join('\n')
}

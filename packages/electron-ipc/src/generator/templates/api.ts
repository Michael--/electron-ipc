/**
 * Generates an API method for a specific contract property
 * @param prefix - Method prefix (invoke, send, or on)
 * @param propName - Property/channel name
 * @param contract - Contract type name
 * @param paramType - Type of parameter (request or payload)
 * @param returnType - Return type hint (Promise wrapper or void)
 * @returns Method definition string
 */
export const createApiMethod = (
  prefix: string,
  propName: string,
  contract: string,
  paramType: 'request' | 'payload',
  returnType: 'promise' | 'void' | 'callback' | 'invoke' | 'stream' | 'upload' | 'download'
) => {
  const param = paramType === 'request' ? 'request' : 'content'
  const typeAnnotation = `${contract}["${propName}"]["${paramType}"]`

  if (returnType === 'void') {
    return `${prefix}${propName}: (${param}: ${typeAnnotation}, options?: TraceOptions) => {
   return ${prefix}${contract}("${propName}", ${param}, options)
},`
  }

  if (returnType === 'invoke') {
    return `${prefix}${propName}: (${param}: ${typeAnnotation}, options?: TraceOptions): Promise<${contract}["${propName}"]["response"]> => {
   return ${prefix}${contract}("${propName}", ${param}, options)
},`
  }

  if (returnType === 'stream') {
    return `${prefix}${propName}: (${param}: ${typeAnnotation}, callbacks: StreamCallbacks<${contract}["${propName}"]["stream"]>, options?: { signal?: AbortSignal } & TraceOptions): (() => void) => {
   return ${prefix}${contract}("${propName}", ${param}, callbacks, options)
},`
  }

  if (returnType === 'upload') {
    return `${prefix}${propName}: (${param}: ${typeAnnotation}, options?: TraceOptions): StreamWriter<${contract}["${propName}"]["data"]> => {
   return ${prefix}${contract}("${propName}", ${param}, options)
},`
  }

  if (returnType === 'download') {
    return `${prefix}${propName}: (${param}: ${typeAnnotation}, callback: (data: ${contract}["${propName}"]["data"]) => void, onEnd?: () => void, onError?: (err: any) => void, options?: { signal?: AbortSignal } & TraceOptions): (() => void) => {
   return ${prefix}${contract}("${propName}", ${param}, callback, onEnd, onError, options)
},`
  }

  const callbackType = `(${param}: ${typeAnnotation}) => void`
  return `${prefix}${propName}: (callback: ${callbackType}, options?: TraceOptions) => {
   return ${prefix}${contract}("${propName}", callback, options)
},`
} /**
 * Generates the final API export combining all contract APIs
 * @param apiNames - Array of API constant names to spread
 * @param apiName - Name of the exported API object (default: 'api')
 * @returns Export statements for api object and ApiType
 */
export const createApiExport = (apiNames: string[], apiName: string = 'api') => `
export const ${apiName} = {
${apiNames.map((name) => `   ...${name},`).join('\n')}
}
export type ${apiName.charAt(0).toUpperCase() + apiName.slice(1)}Type = typeof ${apiName}
`

/**
 * Generates the exposeApi function for preload scripts
 * @param apiName - Name of the API to expose (default: 'api')
 * @returns Function to expose the API via contextBridge
 */
export const createExposeApi = (apiName: string = 'api') => {
  const exposeFunctionName = `expose${apiName.charAt(0).toUpperCase() + apiName.slice(1)}`
  return `
/**
 * Exposes the generated IPC API to the renderer process via contextBridge
 * Handles context isolation automatically
 *
 * Usage in preload script:
 * \`\`\`typescript
 * import { ${exposeFunctionName}, ${apiName.charAt(0).toUpperCase() + apiName.slice(1)}Type } from './api-generated'
 *
 * declare global {
 *   interface Window {
 *     ${apiName}: ${apiName.charAt(0).toUpperCase() + apiName.slice(1)}Type
 *   }
 * }
 *
 * ${exposeFunctionName}()
 * \`\`\`
 */
export const ${exposeFunctionName} = () => {
  // Use \`contextBridge\` APIs to expose Electron APIs to
  // renderer only if context isolation is enabled, otherwise
  // just add to the DOM global.
  if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld('${apiName}', ${apiName})
    } catch (error) {
      console.error(error)
    }
  } else {
    ;(globalThis as any).${apiName} = ${apiName}
  }
}
`
}

/**
 * Generates re-exports for all contract types used in this API
 * @param contractNames - Array of contract type names to re-export
 * @param importPath - Relative import path to the contract definitions
 * @returns Re-export statements for all contract types
 */
export const createContractReExports = (contractNames: string[], importPath: string) => {
  if (contractNames.length === 0) return ''

  return `
// Re-export contract types for convenience
export type {
${contractNames.map((name) => `  ${name},`).join('\n')}
} from "${importPath}"
`
}

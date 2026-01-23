import * as fs from 'fs'
import * as path from 'path'
import { parse as parseYaml } from 'yaml'
import { processApiConfig } from './cli'
import { IContract, YamlConfig } from './types'

type ProcessMode = 'write' | 'check'

type ProcessOptions = {
  mode?: ProcessMode
  cwd?: string
}

type ProcessResult = {
  matched: boolean
  watchFiles: string[]
}

/**
 * Processes YAML configuration file
 */
export function processYamlConfig(configPath: string, options: ProcessOptions = {}): ProcessResult {
  const baseDir = options.cwd ?? process.cwd()
  const resolvedConfigPath = path.resolve(baseDir, configPath)

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

  let matched = true
  const watchFiles: string[] = []

  config.apis.forEach((api) => {
    if (!api.name || !api.input || !api.output) {
      console.error('Error: Each API must have "name", "input", and "output" properties')
      process.exit(1)
    }

    const contractNames: IContract[] = []

    if (api.contracts) {
      if (api.contracts.invoke) contractNames.push({ type: 'invoke', name: api.contracts.invoke })
      if (api.contracts.event) contractNames.push({ type: 'event', name: api.contracts.event })
      if (api.contracts.send) {
        contractNames.push({ type: 'send', name: api.contracts.send })
      }
      if (api.contracts.streamInvoke)
        contractNames.push({ type: 'streamInvoke', name: api.contracts.streamInvoke })
      if (api.contracts.streamUpload)
        contractNames.push({ type: 'streamUpload', name: api.contracts.streamUpload })
      if (api.contracts.streamDownload)
        contractNames.push({ type: 'streamDownload', name: api.contracts.streamDownload })
      if (api.contracts.rendererInvoke)
        contractNames.push({ type: 'rendererInvoke', name: api.contracts.rendererInvoke })
    }

    if (contractNames.length === 0) {
      console.error(`Error: API "${api.name}" must have at least one contract defined`)
      process.exit(1)
    }

    const result = processApiConfig(
      {
        name: api.name,
        input: api.input,
        output: api.output,
        contracts: contractNames,
        tsconfig: api.tsconfig,
        reactHooksOutput: api.reactHooksOutput,
        mainBroadcastOutput: api.mainBroadcastOutput,
      },
      { mode: options.mode, cwd: baseDir }
    )

    if (!result.matched) matched = false
    watchFiles.push(...result.watchFiles)
  })

  return { matched, watchFiles }
}

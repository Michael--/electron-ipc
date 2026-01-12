/**
 * Contract configuration for code generation
 */
export interface IContract {
  type:
    | 'invoke'
    | 'event'
    | 'send'
    | 'streamInvoke'
    | 'streamUpload'
    | 'streamDownload'
    | 'reactHooks'
  name: string
}

/**
 * Configuration for a single API definition in YAML config
 */
export interface ApiConfig {
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
  reactHooksOutput?: string
  mainBroadcastOutput?: string
}

/**
 * Root YAML configuration structure
 */
export interface YamlConfig {
  apis: ApiConfig[]
}

/**
 * API configuration for processing
 */
export interface ProcessApiConfig {
  name: string
  input: string
  output: string
  contracts: IContract[]
  reactHooksOutput?: string
  mainBroadcastOutput?: string
}

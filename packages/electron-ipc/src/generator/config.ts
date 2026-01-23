import {
  eventContracts,
  invokeContracts,
  rendererInvokeContracts,
  sendContracts,
  streamDownloadContracts,
  streamInvokeContracts,
  streamUploadContracts,
} from './templates'

/**
 * Configuration for different contract types
 */
export const CONTRACT_CONFIG = {
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
  rendererInvoke: {
    template: rendererInvokeContracts,
    methodPrefix: 'rendererInvoke',
    paramType: 'request' as const,
    returnType: 'invoke' as const,
    searchType: 'type' as const,
  },
} as const

export type ApiFunc = (ifaceName: string, prop: string) => void

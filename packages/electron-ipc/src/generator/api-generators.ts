import { createApiMethod } from './templates'
import { add } from './utils'

/**
 * Generates API method code for invoke contracts
 */
export function invokeApi(contract: string, propName: string) {
  const method = createApiMethod('invoke', propName, contract, 'request', 'invoke')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for event contracts
 */
export function eventApi(contract: string, propName: string) {
  const method = createApiMethod('send', propName, contract, 'request', 'void')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for send/broadcast contracts
 */
export function sendApi(contract: string, propName: string) {
  const onMethod = createApiMethod('on', propName, contract, 'payload', 'callback')
  add({ v: onMethod, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for stream invoke contracts
 */
export function streamInvokeApi(contract: string, propName: string) {
  const method = createApiMethod('invokeStream', propName, contract, 'request', 'stream')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for stream upload contracts
 */
export function streamUploadApi(contract: string, propName: string) {
  const method = createApiMethod('upload', propName, contract, 'request', 'upload')
  add({ v: method, indent: true })
  add({ indent: false })
}

/**
 * Generates API method code for stream download contracts
 */
export function streamDownloadApi(contract: string, propName: string) {
  const method = createApiMethod('download', propName, contract, 'request', 'download')
  add({ v: method, indent: true })
  add({ indent: false })
}

import {
  registerIpcMiddleware,
  type BroadcastMiddleware,
  type EventMiddleware,
  type InvokeMiddleware,
  type RendererInvokeMiddleware,
  type StreamDownloadMiddleware,
  type StreamInvokeMiddleware,
  type StreamUploadMiddleware,
} from '@number10/electron-ipc'

const logInvokeMiddleware: InvokeMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(`[IPC][invoke][start] channel=${ctx.channel}`, ctx.request)
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(`[IPC][invoke][end] channel=${ctx.channel} durationMs=${durationMs}`, ctx.response)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(`[IPC][invoke][error] channel=${ctx.channel} durationMs=${durationMs}`, error)
    throw error
  }
}

const logEventMiddleware: EventMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(`[IPC][event][start] channel=${ctx.channel}`, ctx.request)
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(`[IPC][event][end] channel=${ctx.channel} durationMs=${durationMs}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(`[IPC][event][error] channel=${ctx.channel} durationMs=${durationMs}`, error)
    throw error
  }
}

const logStreamInvokeMiddleware: StreamInvokeMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(`[IPC][stream-invoke][start] channel=${ctx.channel}`, ctx.request)
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(`[IPC][stream-invoke][end] channel=${ctx.channel} durationMs=${durationMs}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(
      `[IPC][stream-invoke][error] channel=${ctx.channel} durationMs=${durationMs}`,
      error
    )
    throw error
  }
}

const logStreamUploadMiddleware: StreamUploadMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(`[IPC][stream-upload][start] channel=${ctx.channel}`, ctx.request)
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(`[IPC][stream-upload][end] channel=${ctx.channel} durationMs=${durationMs}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(
      `[IPC][stream-upload][error] channel=${ctx.channel} durationMs=${durationMs}`,
      error
    )
    throw error
  }
}

const logStreamDownloadMiddleware: StreamDownloadMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(`[IPC][stream-download][start] channel=${ctx.channel}`, ctx.request)
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(`[IPC][stream-download][end] channel=${ctx.channel} durationMs=${durationMs}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(
      `[IPC][stream-download][error] channel=${ctx.channel} durationMs=${durationMs}`,
      error
    )
    throw error
  }
}

const rendererInvokeMiddleware: RendererInvokeMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(
    `[IPC][renderer-invoke][start] channel=${ctx.channel} targetRole=${ctx.targetRole}`,
    ctx.request
  )
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(
      `[IPC][renderer-invoke][end] channel=${ctx.channel} durationMs=${durationMs}`,
      ctx.response
    )
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(
      `[IPC][renderer-invoke][error] channel=${ctx.channel} durationMs=${durationMs}`,
      error
    )
    throw error
  }
}

const logBroadcastMiddleware: BroadcastMiddleware = async (ctx, next) => {
  const startedAt = Date.now()
  console.warn(`[IPC][broadcast][start] channel=${ctx.channel} mode=${ctx.mode}`, ctx.payload)
  try {
    await next()
    const durationMs = Date.now() - startedAt
    console.warn(`[IPC][broadcast][end] channel=${ctx.channel} durationMs=${durationMs}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error(`[IPC][broadcast][error] channel=${ctx.channel} durationMs=${durationMs}`, error)
    throw error
  }
}

registerIpcMiddleware({
  onInvoke: logInvokeMiddleware,
  onBroadcast: logBroadcastMiddleware,
  onEvent: logEventMiddleware,
  onStreamInvoke: logStreamInvokeMiddleware,
  onStreamUpload: logStreamUploadMiddleware,
  onStreamDownload: logStreamDownloadMiddleware,
  onRendererInvoke: rendererInvokeMiddleware,
})

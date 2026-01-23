/**
 * Generates React hook for invoke contracts
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for React invoke hook
 */
export const reactInvokeHook = (contract: string, importPath: string, apiName: string = 'api') => {
  return `
import { ${contract} } from "${importPath}"

/**
 * React hook for invoke operations with automatic state management
 * @param channel - The IPC channel name
 * @returns Object with data, loading, error states and invoke function
 */
export function use${contract}<K extends keyof ${contract}>(channel: K) {
  const [data, setData] = useState<${contract}[K]["response"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const invoke = useCallback(async (request: ${contract}[K]["request"]) => {
    setLoading(true)
    setError(null)
    try {
      const methodName = \`invoke\${channel}\` as keyof typeof window.${apiName}
      const result = await (window.${apiName}[methodName] as any)(request)
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [channel])

  return { data, loading, error, invoke }
}
`
}

/**
 * Generates React hook for event contracts
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for React event hook
 */
export const reactEventHook = (contract: string, importPath: string, apiName: string = 'api') => {
  return `
import { ${contract} } from "${importPath}"

/**
 * React hook for event operations
 * @param channel - The IPC channel name
 * @returns Object with send function
 */
export function use${contract}<K extends keyof ${contract}>(channel: K) {
  const send = useCallback((request: ${contract}[K]["request"]) => {
    const methodName = \`send\${channel}\` as keyof typeof window.${apiName}
    ;(window.${apiName}[methodName] as any)(request)
  }, [channel])

  return { send }
}
`
}

/**
 * Generates React hook for broadcast contracts
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for React broadcast hook
 */
export const reactBroadcastHook = (
  contract: string,
  importPath: string,
  apiName: string = 'api'
) => {
  return `
import { ${contract} } from "${importPath}"

/**
 * React hook for broadcast operations with automatic subscription management
 * @param channel - The IPC channel name
 * @returns Object with data, subscribe, and unsubscribe functions
 */
export function use${contract}<K extends keyof ${contract}>(channel: K) {
  const [data, setData] = useState<${contract}[K]["payload"] | null>(null)

  const subscribe = useCallback((callback?: (payload: ${contract}[K]["payload"]) => void) => {
    const handler = (data: any) => {
      setData(data)
      callback?.(data)
    }
    const onMethodName = \`on\${channel}\` as keyof typeof window.${apiName}
    return (window.${apiName}[onMethodName] as any)(handler)
  }, [channel])

  return { data, subscribe }
}
`
}

/**
 * Generates React hook for stream invoke contracts
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for React stream invoke hook
 */
export const reactStreamInvokeHook = (
  contract: string,
  importPath: string,
  apiName: string = 'api'
) => {
  return `
import { ${contract} } from "${importPath}"

/**
 * React hook for stream invoke operations with automatic state management
 * @param channel - The IPC channel name
 * @returns Object with data, loading, error states and invoke function
 */
export function use${contract}<K extends keyof ${contract}>(channel: K) {
  const [data, setData] = useState<${contract}[K]["stream"][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const invoke = useCallback((request: ${contract}[K]["request"]) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setLoading(true)
    setError(null)
    setData([])
    setIsComplete(false)

    const methodName = \`invokeStream\${channel}\` as keyof typeof window.${apiName}
    const cleanup = (window.${apiName}[methodName] as any)(request, {
      onData: (chunk: ${contract}[K]["stream"]) => {
        setData(prev => [...prev, chunk])
      },
      onEnd: () => {
        setLoading(false)
        setIsComplete(true)
        cleanupRef.current = null
      },
      onError: (err: Error) => {
        setError(err)
        setLoading(false)
        cleanupRef.current = null
      }
    })
    cleanupRef.current = cleanup
  }, [channel])

  const cancel = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setLoading(false)
    setIsComplete(false)
  }, [])

  const reset = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setData([])
    setError(null)
    setIsComplete(false)
  }, [])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  return { data, loading, error, isComplete, invoke, cancel, reset }
}
`
}

/**
 * Generates React hook for stream upload contracts
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for React stream upload hook
 */
export const reactStreamUploadHook = (
  contract: string,
  importPath: string,
  apiName: string = 'api'
) => {
  return `
import { ${contract} } from "${importPath}"

/**
 * React hook for stream upload operations
 * @param channel - The IPC channel name
 * @returns Object with writer and status
 */
export function use${contract}<K extends keyof ${contract}>(channel: K) {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const writerRef = useRef<any>(null)

  const start = useCallback((request: ${contract}[K]["request"]) => {
    setIsActive(true)
    setError(null)
    const methodName = \`upload\${channel}\` as keyof typeof window.${apiName}
    writerRef.current = (window.${apiName}[methodName] as any)(request)
    return writerRef.current
  }, [channel])

  const write = useCallback(async (chunk: ${contract}[K]["data"]) => {
    if (!writerRef.current) throw new Error('Stream not started')
    try {
      await writerRef.current.write(chunk)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    }
  }, [])

  const close = useCallback(async () => {
    if (!writerRef.current) return
    try {
      await writerRef.current.close()
      setIsActive(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    }
  }, [])

  const abort = useCallback(async (reason?: any) => {
    if (!writerRef.current) return
    try {
      await writerRef.current.abort(reason)
      setIsActive(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    }
  }, [])

  return { isActive, error, start, write, close, abort }
}
`
}

/**
 * Generates React hook for stream download contracts
 * @param contract - The contract type name
 * @param importPath - Relative import path to the contract definition
 * @returns Template string for React stream download hook
 */
export const reactStreamDownloadHook = (
  contract: string,
  importPath: string,
  apiName: string = 'api'
) => {
  return `
import { ${contract} } from "${importPath}"

/**
 * React hook for stream download operations with automatic state management
 * @param channel - The IPC channel name
 * @returns Object with data, loading, error states and download function
 */
export function use${contract}<K extends keyof ${contract}>(channel: K) {
  const [data, setData] = useState<${contract}[K]["data"][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const download = useCallback((request: ${contract}[K]["request"]) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setLoading(true)
    setError(null)
    setData([])
    setIsComplete(false)

    const methodName = \`download\${channel}\` as keyof typeof window.${apiName}
    const cleanup = (window.${apiName}[methodName] as any)(request,
      (chunk: ${contract}[K]["data"]) => {
        setData(prev => [...prev, chunk])
      },
      () => {
        setLoading(false)
        setIsComplete(true)
        cleanupRef.current = null
      },
      (err: any) => {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setLoading(false)
        cleanupRef.current = null
      }
    )
    cleanupRef.current = cleanup
  }, [channel])

  const cancel = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setLoading(false)
    setIsComplete(false)
  }, [])

  const reset = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setData([])
    setError(null)
    setIsComplete(false)
  }, [])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  return { data, loading, error, isComplete, download, cancel, reset }
}
`
}

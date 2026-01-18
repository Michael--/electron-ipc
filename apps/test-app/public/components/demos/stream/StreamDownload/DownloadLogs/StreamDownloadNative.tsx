import { useRef, useState } from 'react'
import { StreamDownloadUI } from './StreamDownloadUI'

/**
 * StreamDownload demo using native window.streamApi
 * @returns Native StreamDownload component
 */
export function StreamDownloadNative() {
  const [logs, setLogs] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logLevel, setLogLevel] = useState<'info' | 'warn' | 'error'>('info')
  const stopRef = useRef<(() => void) | null>(null)

  const handleStartDownload = () => {
    setLogs([])
    setError(null)
    setIsDownloading(true)

    stopRef.current?.()
    stopRef.current = window.streamApi.downloadDownloadLogs(
      { level: logLevel },
      (logEntry: string) => {
        setLogs((prev) => [...prev, logEntry])
      },
      () => {
        setIsDownloading(false)
        stopRef.current = null
      },
      (err: Error) => {
        setError(err.message)
        setIsDownloading(false)
        stopRef.current = null
      }
    )
  }

  const handleStopDownload = () => {
    stopRef.current?.()
    stopRef.current = null
    setIsDownloading(false)
  }

  return (
    <StreamDownloadUI
      logs={logs}
      isDownloading={isDownloading}
      error={error}
      logLevel={logLevel}
      onLevelChange={setLogLevel}
      onStartDownload={handleStartDownload}
      onStopDownload={handleStopDownload}
    />
  )
}

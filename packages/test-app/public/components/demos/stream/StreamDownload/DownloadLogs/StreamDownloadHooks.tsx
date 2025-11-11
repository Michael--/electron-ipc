import { useStreamDownloadContracts } from '@gen/ipc-stream-api-react-hooks'
import { useState } from 'react'
import { StreamDownloadUI } from './StreamDownloadUI'

/**
 * StreamDownload demo using React hooks
 * @returns Hooks-based StreamDownload component
 */
export function StreamDownloadHooks() {
  const [logs, setLogs] = useState<string[]>([])
  const [logLevel, setLogLevel] = useState<'info' | 'warn' | 'error'>('info')
  const { isDownloading, error, download } = useStreamDownloadContracts('DownloadLogs')

  const handleStartDownload = () => {
    setLogs([])
    download(
      { level: logLevel },
      {
        onData: (logEntry: string) => {
          setLogs((prev) => [...prev, logEntry])
        },
      }
    )
  }

  return (
    <StreamDownloadUI
      logs={logs}
      isDownloading={isDownloading}
      error={error}
      logLevel={logLevel}
      onLevelChange={setLogLevel}
      onStartDownload={handleStartDownload}
    />
  )
}

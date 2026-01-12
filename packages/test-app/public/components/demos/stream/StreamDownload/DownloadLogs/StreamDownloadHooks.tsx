import { useStreamDownloadContracts } from '@gen/ipc-stream-api-react-hooks'
import { useState } from 'react'
import { StreamDownloadUI } from './StreamDownloadUI'

/**
 * StreamDownload demo using React hooks
 * @returns Hooks-based StreamDownload component
 */
export function StreamDownloadHooks() {
  const [logLevel, setLogLevel] = useState<'info' | 'warn' | 'error'>('info')
  const { data, loading, error, download, cancel } = useStreamDownloadContracts('DownloadLogs')

  const handleStartDownload = () => {
    download({ level: logLevel })
  }

  return (
    <StreamDownloadUI
      logs={data}
      isDownloading={loading}
      error={error?.message || null}
      logLevel={logLevel}
      onLevelChange={setLogLevel}
      onStartDownload={handleStartDownload}
      onStopDownload={cancel}
    />
  )
}

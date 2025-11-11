import { useEffect, useRef } from 'react'

interface StreamDownloadUIProps {
  logs: string[]
  isDownloading: boolean
  error: string | null
  logLevel: 'info' | 'warn' | 'error'
  onLevelChange: (level: 'info' | 'warn' | 'error') => void
  onStartDownload: () => void
}

/**
 * Presentational component for StreamDownload demo
 * @param props - UI properties
 * @returns StreamDownload UI component
 */
export function StreamDownloadUI({
  logs,
  isDownloading,
  error,
  logLevel,
  onLevelChange,
  onStartDownload,
}: StreamDownloadUIProps) {
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [logs])

  return (
    <>
      <div className="demo-controls">
        <select
          value={logLevel}
          onChange={(e) => onLevelChange(e.target.value as 'info' | 'warn' | 'error')}
          disabled={isDownloading}
        >
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <button onClick={onStartDownload} disabled={isDownloading}>
          {isDownloading ? 'Downloading...' : 'Start Download'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output" ref={outputRef}>
        {logs.length === 0 && !isDownloading && <em>No logs yet</em>}
        {logs.map((log, idx) => (
          <div key={idx} className="stream-message">
            {log}
          </div>
        ))}
      </div>
    </>
  )
}

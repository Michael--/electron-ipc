import { useEffect, useRef, useState } from 'react'

/**
 * StreamDownloadDemo component - demonstrates streaming download from main process
 */
export function StreamDownloadDemo() {
  const [logs, setLogs] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logLevel, setLogLevel] = useState<'info' | 'warn' | 'error'>('info')
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [logs])

  const handleStartDownload = () => {
    if (!window.api) return

    setLogs([])
    setError(null)
    setIsDownloading(true)

    window.streamApi.downloadDownloadLogs(
      { level: logLevel },
      (logEntry: string) => {
        setLogs((prev) => [...prev, logEntry])
      },
      () => {
        setIsDownloading(false)
      },
      (err: Error) => {
        setError(err.message)
        setIsDownloading(false)
      }
    )
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">📥 Stream Download</h3>
      <p className="demo-description">Download log stream from main to renderer process</p>
      <div className="demo-controls">
        <select
          value={logLevel}
          onChange={(e) => setLogLevel(e.target.value as 'info' | 'warn' | 'error')}
          disabled={isDownloading}
        >
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <button onClick={handleStartDownload} disabled={isDownloading}>
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
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'

type LogEntry = {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  sourceRole: string
  sourceId: number
  timestamp: string
}

type WindowInfo = {
  id: number
  role: string
  title: string
  webContentsId: number
}

/**
 * Logger Window - receives logs from other windows via renderer-to-renderer IPC
 */
export function LoggerWindow() {
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // For now, just set a default window info since GetWindowInfo is not available in test-app
    setWindowInfo({ id: 0, role: 'logger', title: 'Logger Window', webContentsId: 0 })
  }, [])

  useEffect(() => {
    // Register handler for AddLogEntry invocations from other renderers
    const unregister = window.api.handleAddLogEntry(async (request, context) => {
      const entry: LogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        level: request.level,
        message: request.message,
        sourceRole: request.sourceWindow || context.sourceRole || 'unknown',
        sourceId: context.sourceWindowId || 0,
        timestamp: new Date().toLocaleTimeString(),
      }

      setLogs((prev) => [...prev, entry].slice(-100)) // Keep last 100 entries

      return { success: true, entryId: entry.id }
    })

    return unregister
  }, [])

  useEffect(() => {
    // Register handler for GetLogCount
    const unregister = window.api.handleGetLogCount(async () => {
      return { count: logs.length }
    })

    return unregister
  }, [logs.length])

  useEffect(() => {
    // Register handler for ClearLogs
    const unregister = window.api.handleClearLogs(async () => {
      const cleared = logs.length
      setLogs([])
      return { cleared }
    })

    return () => unregister()
  }, [logs])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter((log) => filter === 'all' || log.level === filter)

  const handleClearLogs = () => {
    setLogs([])
  }

  const getLevelStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'log-error'
      case 'warn':
        return 'log-warn'
      default:
        return 'log-info'
    }
  }

  return (
    <div className="app logger">
      <header className="hero compact">
        <div>
          <span className="badge">Logger Window</span>
          <h1>Renderer-to-Renderer Log Collection</h1>
          <p>
            This window receives logs from other renderers via <code>RendererInvokeContract</code>
          </p>
        </div>
        <div className="hero-cards">
          <div className="card">
            <div className="card-label">Window ID</div>
            <div className="card-value">{windowInfo?.id ?? '-'}</div>
          </div>
          <div className="card">
            <div className="card-label">Total Logs</div>
            <div className="card-value">{logs.length}</div>
          </div>
          <div className="card">
            <div className="card-label">Filtered</div>
            <div className="card-value">{filteredLogs.length}</div>
          </div>
        </div>
      </header>

      <main className="logger-main">
        <div className="toolbar">
          <div className="button-group">
            <button
              className={`button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({logs.length})
            </button>
            <button
              className={`button ${filter === 'info' ? 'active' : ''}`}
              onClick={() => setFilter('info')}
            >
              Info ({logs.filter((l) => l.level === 'info').length})
            </button>
            <button
              className={`button ${filter === 'warn' ? 'active' : ''}`}
              onClick={() => setFilter('warn')}
            >
              Warn ({logs.filter((l) => l.level === 'warn').length})
            </button>
            <button
              className={`button ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              Error ({logs.filter((l) => l.level === 'error').length})
            </button>
          </div>

          <div className="toolbar-actions">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button className="button ghost" onClick={handleClearLogs}>
              Clear Logs
            </button>
          </div>
        </div>

        <div className="logs-container">
          {filteredLogs.length === 0 ? (
            <div className="empty">
              <p>No logs yet.</p>
              <p className="muted">Other windows can send logs using invokeInRenderer.</p>
            </div>
          ) : (
            <div className="logs-list">
              {filteredLogs.map((entry) => (
                <div key={entry.id} className={`log-entry ${getLevelStyle(entry.level)}`}>
                  <div className="log-header">
                    <span className="log-level">{entry.level.toUpperCase()}</span>
                    <span className="log-source">
                      {entry.sourceRole} #{entry.sourceId}
                    </span>
                    <span className="log-time">{entry.timestamp}</span>
                  </div>
                  <div className="log-message">{entry.message}</div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

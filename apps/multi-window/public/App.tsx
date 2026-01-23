import { useEffect, useState } from 'react'

type WindowInfo = {
  id: number
  role: string
  title: string
  webContentsId: number
}

type Announcement = {
  fromRole: string
  fromId: number
  target: 'all' | 'role'
  message: string
  receivedAt: string
}

const roleOptions = ['main', 'secondary'] as const

type LogLevel = 'info' | 'warn' | 'error'

export function App() {
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null)
  const [windows, setWindows] = useState<WindowInfo[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState<(typeof roleOptions)[number]>('secondary')
  const [logMessage, setLogMessage] = useState('')
  const [logLevel, setLogLevel] = useState<LogLevel>('info')
  const [r2rLogMessage, setR2rLogMessage] = useState('')
  const [r2rLogLevel, setR2rLogLevel] = useState<LogLevel>('info')
  const [r2rStatus, setR2rStatus] = useState<string>('')
  const [logCountStatus, setLogCountStatus] = useState<string>('')
  const [clearLogsStatus, setClearLogsStatus] = useState<string>('')
  const [errorTestStatus, setErrorTestStatus] = useState<string>('')

  const refreshWindowInfo = async () => {
    const info = await window.api.invokeGetWindowInfo()
    setWindowInfo(info)
  }

  const fetchWindowList = async () => {
    const list = await window.api.invokeGetAllWindows()
    setWindows(list)
  }

  useEffect(() => {
    let active = true

    refreshWindowInfo().catch(() => undefined)
    fetchWindowList().catch(() => undefined)

    const offAnnouncement = window.api.onAnnouncement((payload) => {
      if (!active) return
      setAnnouncements((prev) => {
        const next: Announcement[] = [
          {
            ...payload,
            receivedAt: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]
        return next.slice(0, 25)
      })
    })

    const offWindowList = window.api.onWindowList((payload) => {
      if (!active) return
      setWindows(payload.windows)
    })

    window.api.sendRequestWindowList()

    return () => {
      active = false
      offAnnouncement()
      offWindowList()
    }
  }, [])

  const handleBroadcastAll = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    window.api.sendBroadcastToAll({ message: trimmed })
    setMessage('')
  }

  const handleBroadcastRole = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    window.api.sendBroadcastToRole({ role: targetRole, message: trimmed })
    setMessage('')
  }

  const handleLogMessage = () => {
    const trimmed = logMessage.trim()
    if (!trimmed) return
    window.api.sendLogMessage({ level: logLevel, message: trimmed })
    setLogMessage('')
  }

  const handleSendR2RLog = async () => {
    const trimmed = r2rLogMessage.trim()
    if (!trimmed || !windowInfo) return

    try {
      setR2rStatus('Sending...')
      const result = await window.api.rendererInvokeAddLogEntry('logger', {
        level: r2rLogLevel,
        message: trimmed,
        sourceRole: windowInfo.role,
        sourceId: windowInfo.id,
      })
      setR2rStatus(`✓ Log sent: success=${result.success}, entryId=${result.entryId}`)
      setR2rLogMessage('')
      setTimeout(() => setR2rStatus(''), 5000)
    } catch (error) {
      setR2rStatus(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleGetLogCount = async () => {
    try {
      setLogCountStatus('Fetching...')
      const result = await window.api.rendererInvokeGetLogCount('logger')
      setLogCountStatus(`✓ Logger has ${result.count} log entries`)
      setTimeout(() => setLogCountStatus(''), 5000)
    } catch (error) {
      setLogCountStatus(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleClearLogs = async () => {
    try {
      setClearLogsStatus('Clearing...')
      const result = await window.api.rendererInvokeClearLogs('logger')
      setClearLogsStatus(`✓ Cleared ${result.cleared} log entries`)
      setTimeout(() => setClearLogsStatus(''), 5000)
    } catch (error) {
      setClearLogsStatus(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleTestInvalidWindow = async () => {
    if (!windowInfo) return
    try {
      setErrorTestStatus('Testing invalid window role...')
      await window.api.rendererInvokeAddLogEntry('nonExistentRole', {
        level: 'info',
        message: 'This should fail',
        sourceRole: windowInfo.role,
        sourceId: windowInfo.id,
      })
      setErrorTestStatus('✗ Unexpected: No error thrown')
    } catch (error) {
      setErrorTestStatus(
        `✓ Expected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setTimeout(() => setErrorTestStatus(''), 8000)
    }
  }

  const handleTestMissingHandler = async () => {
    if (!windowInfo) return
    try {
      setErrorTestStatus('Testing missing handler (timeout expected in 5s)...')
      // Try to invoke a handler that doesn't exist on main window
      await window.api.rendererInvokeAddLogEntry('main', {
        level: 'info',
        message: 'This should timeout',
        sourceRole: windowInfo.role,
        sourceId: windowInfo.id,
      })
      setErrorTestStatus('✗ Unexpected: No timeout')
    } catch (error) {
      setErrorTestStatus(
        `✓ Expected timeout: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setTimeout(() => setErrorTestStatus(''), 8000)
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <span className="badge">Multi-Window IPC</span>
          <h1>Separation with collaboration</h1>
          <p>
            Each window is isolated, but IPC lets them coordinate. Use the controls below and watch
            the Inspector traces.
          </p>
        </div>
        <div className="hero-cards">
          <div className="card">
            <div className="card-label">Role</div>
            <div className="card-value">{windowInfo?.role ?? 'loading'}</div>
          </div>
          <div className="card">
            <div className="card-label">Window ID</div>
            <div className="card-value">{windowInfo?.id ?? '-'}</div>
          </div>
          <div className="card">
            <div className="card-label">WebContents</div>
            <div className="card-value">{windowInfo?.webContentsId ?? '-'}</div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Send Messages</h2>
            <button className="button ghost" type="button" onClick={refreshWindowInfo}>
              Refresh Info
            </button>
          </div>

          <label className="field">
            <span>Message</span>
            <input
              className="input"
              type="text"
              placeholder="Say something to the other windows"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>

          <div className="button-row">
            <button className="button primary" type="button" onClick={handleBroadcastAll}>
              Broadcast to all
            </button>
            <div className="inline-field">
              <select
                className="select"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value as typeof targetRole)}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button className="button" type="button" onClick={handleBroadcastRole}>
                Send to role
              </button>
            </div>
          </div>

          <div className="divider" />

          <div className="panel-header">
            <h3>Window List</h3>
            <div className="button-row">
              <button className="button" type="button" onClick={fetchWindowList}>
                Invoke GetAllWindows
              </button>
              <button
                className="button"
                type="button"
                onClick={() => window.api.sendRequestWindowList()}
              >
                Broadcast WindowList
              </button>
            </div>
          </div>

          <div className="table">
            <div className="table-header">
              <span>ID</span>
              <span>Role</span>
              <span>Title</span>
              <span>WebContents</span>
            </div>
            {windows.length === 0 ? (
              <div className="table-row empty">No windows registered yet.</div>
            ) : (
              windows.map((entry) => (
                <div className="table-row" key={`${entry.id}-${entry.webContentsId}`}>
                  <span>{entry.id}</span>
                  <span className="pill">{entry.role}</span>
                  <span className="truncate">{entry.title}</span>
                  <span>{entry.webContentsId}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Announcements</h2>
            <span className="muted">{announcements.length} recent</span>
          </div>
          <div className="list">
            {announcements.length === 0 ? (
              <div className="empty">No announcements yet. Try a broadcast.</div>
            ) : (
              announcements.map((item, index) => (
                <div className="list-item" key={`${item.receivedAt}-${index}`}>
                  <div className="list-title">
                    {item.message}
                    <span className="tag">{item.target}</span>
                  </div>
                  <div className="list-meta">
                    from {item.fromRole} #{item.fromId} at {item.receivedAt}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Log to Main</h2>
            <span className="muted">Event-only, shows separation in Inspector</span>
          </div>
          <label className="field">
            <span>Message</span>
            <input
              className="input"
              type="text"
              placeholder="Write a log message for main"
              value={logMessage}
              onChange={(event) => setLogMessage(event.target.value)}
            />
          </label>
          <div className="inline-field">
            <select
              className="select"
              value={logLevel}
              onChange={(event) => setLogLevel(event.target.value as LogLevel)}
            >
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
            <button className="button" type="button" onClick={handleLogMessage}>
              Send log event
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Renderer-to-Renderer Logging</h2>
            <span className="muted">Send logs directly to logger window</span>
          </div>
          <label className="field">
            <span>Message</span>
            <input
              className="input"
              type="text"
              placeholder="Log message to send to logger window"
              value={r2rLogMessage}
              onChange={(event) => setR2rLogMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSendR2RLog()
              }}
            />
          </label>
          <div className="inline-field">
            <select
              className="select"
              value={r2rLogLevel}
              onChange={(event) => setR2rLogLevel(event.target.value as LogLevel)}
            >
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
            <button className="button primary" type="button" onClick={handleSendR2RLog}>
              Send to Logger (R2R)
            </button>
          </div>
          {r2rStatus && <div className="status-message">{r2rStatus}</div>}

          <div className="divider" />

          <div className="panel-header">
            <h3>Logger Commands</h3>
            <span className="muted">Test R2R responses</span>
          </div>
          <div className="button-row">
            <button className="button" type="button" onClick={handleGetLogCount}>
              Get Log Count
            </button>
            <button className="button" type="button" onClick={handleClearLogs}>
              Clear Logger
            </button>
          </div>
          {logCountStatus && <div className="status-message">{logCountStatus}</div>}
          {clearLogsStatus && <div className="status-message">{clearLogsStatus}</div>}

          <div className="divider" />

          <div className="panel-header">
            <h3>Error Handling Tests</h3>
            <span className="muted">Test R2R failure scenarios</span>
          </div>
          <div className="button-row">
            <button className="button ghost" type="button" onClick={handleTestInvalidWindow}>
              Test: Invalid Window Role
            </button>
            <button className="button ghost" type="button" onClick={handleTestMissingHandler}>
              Test: Missing Handler (5s timeout)
            </button>
          </div>
          {errorTestStatus && (
            <div className="status-message" style={{ whiteSpace: 'pre-wrap' }}>
              {errorTestStatus}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

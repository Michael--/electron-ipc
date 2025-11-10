/**
 * LogMessageDemo component - demonstrates sending events to main process
 */
export function LogMessageDemo() {
  const onLog = (level: 'info' | 'warn' | 'error') => {
    window.api.sendLogMessage({ level, message: `Test ${level} message from renderer` })
  }

  return (
    <div className="demo-card event">
      <h3 className="demo-title">📝 Log Message</h3>
      <p className="demo-description">Event with structured payload</p>
      <div className="demo-controls">
        <button onClick={() => onLog('info')}>Info</button>
        <button onClick={() => onLog('warn')}>Warn</button>
        <button onClick={() => onLog('error')}>Error</button>
      </div>
      <div className="demo-result" style={{ fontSize: '0.8em' }}>
        Check console for logged messages
      </div>
    </div>
  )
}

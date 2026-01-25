interface AddLogEntryUIProps {
  level: 'info' | 'warn' | 'error'
  message: string
  loading: boolean
  result: string | null
  error: Error | null
  onLevelChange: (level: 'info' | 'warn' | 'error') => void
  onMessageChange: (message: string) => void
  onAdd: () => void
}

/**
 * Shared UI component for AddLogEntry demo
 */
export function AddLogEntryUI({
  level,
  message,
  loading,
  result,
  error,
  onLevelChange,
  onMessageChange,
  onAdd,
}: AddLogEntryUIProps) {
  return (
    <div className="demo-content">
      <div className="demo-input-group">
        <label htmlFor="log-level">Log Level:</label>
        <select
          id="log-level"
          value={level}
          onChange={(e) => onLevelChange(e.target.value as 'info' | 'warn' | 'error')}
          disabled={loading}
          data-testid="add-log-entry-level-select"
        >
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="demo-input-group">
        <label htmlFor="log-message">Message:</label>
        <input
          id="log-message"
          type="text"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Enter log message..."
          disabled={loading}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          data-testid="add-log-entry-message-input"
        />
      </div>

      <button
        className="demo-button"
        onClick={onAdd}
        disabled={loading || !message.trim()}
        data-testid="add-log-entry-button"
      >
        {loading ? 'Adding...' : 'Add Log Entry'}
      </button>

      {result && (
        <div className="demo-result success">
          <strong>Success:</strong> {result}
        </div>
      )}

      {error && (
        <div className="demo-result error">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <div className="demo-info">
        <p>This sends a log entry to the Logger window using renderer-to-renderer IPC.</p>
        <p>Make sure the Logger window is open to receive the message.</p>
      </div>
    </div>
  )
}

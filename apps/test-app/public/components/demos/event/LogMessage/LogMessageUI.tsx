interface LogMessageUIProps {
  onSend: (level: 'info' | 'warn' | 'error') => void
}

/**
 * Presentational component for LogMessage demo
 * @param props - UI properties
 * @returns LogMessage UI component
 */
export function LogMessageUI({ onSend }: LogMessageUIProps) {
  return (
    <div className="demo-controls">
      <button onClick={() => onSend('info')} data-testid="log-info-button">
        Info
      </button>
      <button onClick={() => onSend('warn')} data-testid="log-warn-button">
        Warn
      </button>
      <button onClick={() => onSend('error')} data-testid="log-error-button">
        Error
      </button>
    </div>
  )
}

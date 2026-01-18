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
      <button onClick={() => onSend('info')}>Info</button>
      <button onClick={() => onSend('warn')}>Warn</button>
      <button onClick={() => onSend('error')}>Error</button>
    </div>
  )
}
